/**
 * api/cron/compress-memory.js
 * Cron job mingguan — kompres capsule lama supaya DB tidak membengkak
 *
 * Jadwal: setiap Senin 02:00 UTC (tambahkan di vercel.json)
 * Yang dilakukan:
 *   - Capsule > 30 hari (daily) → kompres jadi weekly (~50 kata)
 *   - Capsule > 90 hari (weekly) → kompres jadi monthly (~25 kata)
 *   - Capsule > 365 hari (monthly) → kompres jadi yearly (~10 kata)
 *
 * Proses per-user, batch 50 user per run supaya tidak timeout
 */
import { generateText } from '../lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const now     = new Date()
  const d30ago  = new Date(now - 30  * 86400000).toISOString().slice(0, 10)
  const d90ago  = new Date(now - 90  * 86400000).toISOString().slice(0, 10)
  const d365ago = new Date(now - 365 * 86400000).toISOString().slice(0, 10)

  let totalCompressed = 0

  try {
    // ── 1. Daily → Weekly (> 30 hari) ────────────────────────────────────
    totalCompressed += await compressTier({
      olderThan:      d30ago,
      fromGranularity: 'daily',
      toGranularity:   'weekly',
      groupByDays:     7,
      targetWords:     50,
      label:           'daily→weekly',
    })

    // ── 2. Weekly → Monthly (> 90 hari) ──────────────────────────────────
    totalCompressed += await compressTier({
      olderThan:       d90ago,
      fromGranularity: 'weekly',
      toGranularity:   'monthly',
      groupByDays:     30,
      targetWords:     25,
      label:           'weekly→monthly',
    })

    // ── 3. Monthly → Yearly (> 365 hari) ─────────────────────────────────
    totalCompressed += await compressTier({
      olderThan:       d365ago,
      fromGranularity: 'monthly',
      toGranularity:   'yearly',
      groupByDays:     365,
      targetWords:     10,
      label:           'monthly→yearly',
    })

    return res.status(200).json({ success: true, totalCompressed })

  } catch (e) {
    console.error('[compress-memory]', e.message)
    return res.status(500).json({ error: e.message })
  }
}

async function compressTier({ olderThan, fromGranularity, toGranularity, groupByDays, targetWords, label }) {
  // Ambil semua capsule yang perlu dikompres
  const { data: capsules } = await supabase
    .from('memory_capsule_log')
    .select('id, user_id, capsule_date, capsule_text')
    .lt('capsule_date', olderThan)
    .eq('granularity', fromGranularity)
    .neq('capsule_text', '[no new insight]')
    .order('user_id')
    .order('capsule_date')
    .limit(200) // batch max 200 baris per run

  if (!capsules?.length) return 0

  // Group by user_id
  const byUser = {}
  for (const c of capsules) {
    if (!byUser[c.user_id]) byUser[c.user_id] = []
    byUser[c.user_id].push(c)
  }

  let compressed = 0

  for (const [userId, userCapsules] of Object.entries(byUser)) {
    // Group capsules ke dalam periode (setiap groupByDays)
    const periods = groupIntoPeriods(userCapsules, groupByDays)

    for (const period of periods) {
      if (period.capsules.length === 0) continue

      const combined = period.capsules.map(c => c.capsule_text).join('\n---\n')

      // Skip kalau hanya 1 capsule (tidak ada yang bisa dikompres)
      if (period.capsules.length === 1 && combined.split(' ').length <= targetWords) {
        // Langsung update granularity saja
        await supabase.from('memory_capsule_log')
          .update({ granularity: toGranularity })
          .eq('id', period.capsules[0].id)
        continue
      }

      // Generate ringkasan
      let summary = ''
      try {
        summary = await generateText({
          system: `Buat ringkasan sangat ringkas dalam ${targetWords} kata atau kurang. Hanya fakta terpenting. Bahasa Indonesia.`,
          prompt: combined.slice(0, 2000),
          maxTokens: Math.ceil(targetWords * 2),
          tier: 'fast',
          plan: 'free',
        })
      } catch {
        continue
      }

      const representativeDate = period.capsules[0].capsule_date

      // Upsert ringkasan baru
      await supabase.from('memory_capsule_log').upsert({
        user_id:      userId,
        capsule_date: representativeDate,
        capsule_text: summary.trim(),
        granularity:  toGranularity,
      }, { onConflict: 'user_id,capsule_date' })

      // Hapus capsule lama yang sudah dikompres (kecuali yang representative)
      const idsToDelete = period.capsules
        .filter(c => c.capsule_date !== representativeDate)
        .map(c => c.id)

      if (idsToDelete.length > 0) {
        await supabase.from('memory_capsule_log').delete().in('id', idsToDelete)
      } else {
        // Update granularity capsule tunggal
        await supabase.from('memory_capsule_log')
          .update({ granularity: toGranularity, capsule_text: summary.trim() })
          .eq('id', period.capsules[0].id)
      }

      compressed++
    }
  }

  console.log(`[compress-memory] ${label}: ${compressed} periods compressed`)
  return compressed
}

function groupIntoPeriods(capsules, groupByDays) {
  if (!capsules.length) return []
  const sorted = [...capsules].sort((a, b) => a.capsule_date.localeCompare(b.capsule_date))
  const periods = []
  let current = { startDate: sorted[0].capsule_date, capsules: [] }

  for (const c of sorted) {
    const daysDiff = (new Date(c.capsule_date) - new Date(current.startDate)) / 86400000
    if (daysDiff < groupByDays) {
      current.capsules.push(c)
    } else {
      periods.push(current)
      current = { startDate: c.capsule_date, capsules: [c] }
    }
  }
  periods.push(current)
  return periods
}
