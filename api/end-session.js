/**
 * api/end-session.js
 * Dipanggil saat user tutup tab/browser atau logout.
 * 1. Simpan chat history
 * 2. Evaluasi insight baru → update memory + capsule
 */
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Parse body — sendBeacon kirim sebagai text/plain
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    if (!body || typeof body !== 'object') body = {}

    const { userId, messages: sessionMsgs, trigger } = body
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const today = new Date().toISOString().slice(0, 10)

    // ── Step 0: Simpan chat history (selalu) ────────────────────────────────
    if (Array.isArray(sessionMsgs) && sessionMsgs.length > 0) {
      try {
        await supabase.from('user_chat_history').upsert({
          user_id:      userId,
          session_date: today,
          messages:     sessionMsgs.slice(-50),
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'user_id,session_date' })
      } catch(e) { console.error('[end-session] history save error:', e.message) }
    }

    // Guard: minimal 3 pesan user
    const userMsgCount = (sessionMsgs || []).filter(m => m.role === 'user').length
    if (userMsgCount < 3) return res.status(200).json({ skipped: true, reason: 'session_too_short' })

    // Cek capsule hari ini sudah ada
    const { data: todayCapsule } = await supabase
      .from('memory_capsule_log').select('id')
      .eq('user_id', userId).eq('capsule_date', today).maybeSingle()
    if (todayCapsule) return res.status(200).json({ skipped: true, reason: 'capsule_exists_today' })

    // Load existing memory
    const { data: existing } = await supabase
      .from('user_career_profiles')
      .select('nama, target_posisi, diah_anna_memory, user_depth_profile, depth_score')
      .eq('user_id', userId).maybeSingle()

    const currentMemory       = existing?.diah_anna_memory    || null
    const currentDepthProfile = existing?.user_depth_profile  || {}
    const currentDepthScore   = existing?.depth_score         || 0

    const convoText = (sessionMsgs || []).slice(-20)
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${(m.text || m.content || '').slice(0, 300)}`)
      .filter(l => l.length > 15).join('\n')

    // ── Step 1: Eval — ada hal baru? ────────────────────────────────────────
    const evalResult = await generateText({
      system: 'Jawab hanya YA atau TIDAK.',
      prompt: `Memori lama:\n${currentMemory || '(belum ada)'}\n\nPercakapan:\n${convoText}\n\nAda hal baru yang belum ada di memori lama?`,
      maxTokens: 5, tier: 'fast', plan: 'free',
    })

    const hasNewInsight = evalResult.trim().toUpperCase().startsWith('Y')

    if (!hasNewInsight) {
      try {
        await supabase.from('memory_capsule_log').upsert({
          user_id: userId, capsule_date: today,
          capsule_text: '[no new insight]', granularity: 'daily',
        }, { onConflict: 'user_id,capsule_date' })
      } catch(e) { console.error('[end-session] capsule upsert error:', e.message) }
      return res.status(200).json({ skipped: true, reason: 'no_new_insight' })
    }

    // ── Step 2: Generate capsule + memory baru (1 call) ─────────────────────
    const combinedRaw = await generateText({
      system: 'Output HANYA JSON valid. Tanpa backtick, tanpa preamble.',
      prompt: `Kamu adalah memori Diah Anna di Verneks.
User: ${existing?.nama || 'User'} | Target: ${existing?.target_posisi || '-'}
Memori lama:\n${currentMemory || '(belum ada)'}
Percakapan:\n${convoText}

JSON:
{
  "capsule": "ringkasan hari ini 80-100 kata — apa yang dibahas, apa yang baru terungkap",
  "new_memory": "tulis ulang memori Diah Anna 150-200 kata, gabungkan lama+baru, narasi personal",
  "coach_style_fit": "direct-challenger/nurturing-supporter/analytical-guide/creative-explorer",
  "last_emotional_state": "kondisi emosi user 3 kata",
  "motivators": ["hal1","hal2"],
  "blockers": ["hal1","hal2"]
}`,
      maxTokens: 500, tier: 'smart', plan: 'premium',
    })

    let parsed = {}
    try {
      const clean = combinedRaw.trim()
        .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.warn('[end-session] JSON parse failed')
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    // ── Step 3: Update depth profile ────────────────────────────────────────
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

    // ── Step 4: Simpan semua parallel ───────────────────────────────────────
    await Promise.all([
      supabase.from('memory_capsule_log').upsert({
        user_id: userId, capsule_date: today,
        capsule_text: parsed.capsule || '', granularity: 'daily',
      }, { onConflict: 'user_id,capsule_date' }),
      supabase.from('user_career_profiles').update({
        diah_anna_memory:   parsed.new_memory?.trim() || currentMemory,
        user_depth_profile: newDepthProfile,
        depth_score:        newDepthScore,
        memory_updated_at:  new Date().toISOString(),
      }).eq('user_id', userId),
    ])

    return res.status(200).json({ success: true, depthScore: newDepthScore, trigger: trigger || 'unknown' })

  } catch (error) {
    console.error('[end-session] error:', error.message, error.stack)
    return res.status(200).json({ error: error.message })
  }
}
