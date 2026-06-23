/**
 * api/end-session.js — Single endpoint untuk akhir sesi
 *
 * Menggabungkan update-memory.js + pembuatan memory capsule harian.
 * Dipanggil via sendBeacon saat:
 *   - visibilitychange (hidden)
 *   - beforeunload
 *   - logout manual
 *
 * Yang dilakukan (semua async, tidak blocking user):
 *   1. Simpan chat history hari ini ke user_chat_history (upsert)
 *   2. Evaluasi: ada hal baru dari sesi ini?
 *      → Tidak: stop (hemat 2 AI call)
 *      → Ya: buat capsule + update diah_anna_memory + depth_score
 */
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, messages: sessionMsgs, trigger } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const today = new Date().toISOString().slice(0, 10)

  // ── Step 0: Simpan chat history hari ini (selalu, tanpa syarat) ───────────
  if (Array.isArray(sessionMsgs) && sessionMsgs.length > 0) {
    await supabase
      .from('user_chat_history')
      .upsert({
        user_id:      userId,
        session_date: today,
        messages:     sessionMsgs.slice(-50), // max 50 pesan per hari di DB
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id,session_date' })
      .catch(() => {})
  }

  // ── Guard: minimal 3 pesan user sebelum proses memory ────────────────────
  const userMsgCount = (sessionMsgs || []).filter(m => m.role === 'user').length
  if (userMsgCount < 3) {
    return res.status(200).json({ skipped: true, reason: 'session_too_short' })
  }

  try {
    // ── Load data existing ────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('user_career_profiles')
      .select('nama, target_posisi, diah_anna_memory, user_depth_profile, depth_score')
      .eq('user_id', userId)
      .maybeSingle()

    // Cek apakah capsule hari ini sudah ada (hindari double processing)
    const { data: todayCapsule } = await supabase
      .from('memory_capsule_log')
      .select('id')
      .eq('user_id', userId)
      .eq('capsule_date', today)
      .maybeSingle()

    if (todayCapsule) {
      // Capsule sudah ada hari ini, hanya update diah_anna_memory kalau perlu
      return res.status(200).json({ skipped: true, reason: 'capsule_exists_today' })
    }

    const currentMemory       = existing?.diah_anna_memory    || null
    const currentDepthProfile = existing?.user_depth_profile  || {}
    const currentDepthScore   = existing?.depth_score         || 0

    // Teks percakapan (max 20 pesan, hemat token)
    const convoText = (sessionMsgs || [])
      .slice(-20)
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${(m.text || m.content || '').slice(0, 300)}`)
      .filter(line => line.length > 15)
      .join('\n')

    // ── Step 1: Evaluasi — ada hal baru? (1 AI call, model fast) ─────────
    const evalResult = await generateText({
      system: 'Jawab hanya YA atau TIDAK.',
      prompt: `Memori lama Diah Anna tentang user:\n${currentMemory || '(belum ada)'}\n\nPercakapan sesi ini:\n${convoText}\n\nApakah sesi ini mengandung minimal 1 hal baru yang belum ada di memori lama? (fakta baru, perubahan mindset, keputusan, hambatan baru, breakthrough)`,
      maxTokens: 5,
      tier: 'fast',
      plan: 'free',
    })

    const hasNewInsight = evalResult.trim().toUpperCase().startsWith('Y')

    if (!hasNewInsight) {
      // Tetap simpan capsule kosong supaya tidak di-evaluate lagi hari ini
      await supabase.from('memory_capsule_log').upsert({
        user_id:      userId,
        capsule_date: today,
        capsule_text: '[no new insight]',
        granularity:  'daily',
      }, { onConflict: 'user_id,capsule_date' }).catch(() => {})

      return res.status(200).json({ skipped: true, reason: 'no_new_insight' })
    }

    // ── Step 2: Generate capsule + memory baru (1 AI call, model smart) ──
    // Gabung jadi 1 call untuk hemat kredit — minta 2 output sekaligus
    const combinedPrompt = `Kamu adalah sistem memori Diah Anna, AI career companion Verneks.

User: ${existing?.nama || 'User'} | Target: ${existing?.target_posisi || '-'}

MEMORI LAMA:
${currentMemory || '(belum ada)'}

PERCAKAPAN HARI INI:
${convoText}

Hasilkan JSON valid (tanpa backtick, tanpa preamble):
{
  "capsule": "Ringkasan hari ini dalam 80-100 kata. Apa yang dibahas, apa yang baru terungkap, kondisi user. Tulis seperti catatan harian Diah Anna tentang user ini.",
  "new_memory": "Tulis ulang memori Diah Anna tentang user ini, 150-200 kata. Gabungkan insight lama + baru. Narasi personal, bukan daftar. Seolah Diah Anna yang berbicara tentang user-nya.",
  "coach_style_fit": "direct-challenger / nurturing-supporter / analytical-guide / creative-explorer",
  "last_emotional_state": "kondisi emosi user terakhir dalam 3 kata",
  "motivators": ["hal1", "hal2"],
  "blockers": ["hal1", "hal2"]
}`

    const combinedRaw = await generateText({
      system: 'Output HANYA JSON valid. Tanpa backtick, tanpa preamble.',
      prompt: combinedPrompt,
      maxTokens: 500,
      tier: 'smart',
      plan: 'premium',
    })

    let parsed = {}
    try {
      const clean = combinedRaw.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.warn('[end-session] JSON parse failed, skip memory update')
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    // ── Step 3: Update depth profile ─────────────────────────────────────
    const newDepthProfile = {
      ...currentDepthProfile,
      coach_style_fit:      parsed.coach_style_fit      || currentDepthProfile.coach_style_fit,
      last_emotional_state: parsed.last_emotional_state || currentDepthProfile.last_emotional_state,
      emotional_triggers: {
        motivators: parsed.motivators?.length ? parsed.motivators : (currentDepthProfile.emotional_triggers?.motivators || []),
        blockers:   parsed.blockers?.length   ? parsed.blockers   : (currentDepthProfile.emotional_triggers?.blockers   || []),
      },
    }

    const newDepthScore = Math.min(100, currentDepthScore + 5)

    // ── Step 4: Simpan semua ke DB (parallel) ────────────────────────────
    await Promise.all([
      // 4a. Capsule harian
      supabase.from('memory_capsule_log').upsert({
        user_id:      userId,
        capsule_date: today,
        capsule_text: parsed.capsule || '',
        granularity:  'daily',
      }, { onConflict: 'user_id,capsule_date' }),

      // 4b. Deep memory + depth profile
      supabase.from('user_career_profiles').update({
        diah_anna_memory:   parsed.new_memory?.trim() || currentMemory,
        user_depth_profile: newDepthProfile,
        depth_score:        newDepthScore,
        memory_updated_at:  new Date().toISOString(),
      }).eq('user_id', userId),
    ])

    return res.status(200).json({
      success:    true,
      depthScore: newDepthScore,
      trigger:    trigger || 'unknown',
    })

  } catch (error) {
    console.error('[end-session] error:', error.message)
    return res.status(200).json({ error: error.message })
  }
}
