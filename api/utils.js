/**
 * api/utils.js — Router untuk endpoint-endpoint kecil
 * Routing via query param: ?action=redeem | refresh-profile | job-match | admin
 *
 * Menggabungkan: redeem-code.js + refresh-profile.js + job-match.js + admin.js
 * Semua endpoint lama dihapus dari repo supaya tidak melewati limit 12 functions.
 */
import { createClient } from '@supabase/supabase-js'
import { generateText } from './lib/ai.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action
  if (!action) return res.status(400).json({ error: 'Missing action param' })

  // ── REDEEM CODE ──────────────────────────────────────────────────────────
  if (action === 'redeem') {
    if (req.method !== 'POST') return res.status(405).end()
    const { code, userId } = req.body
    if (!code || !userId) return res.status(400).json({ error: 'Missing code or userId' })

    const cleanCode = code.trim().toUpperCase()
    const { data: row, error: fetchErr } = await supabase
      .from('redeem_codes').select('code, used_by').eq('code', cleanCode).maybeSingle()

    if (fetchErr)    return res.status(500).json({ error: 'Gagal mengecek kode' })
    if (!row)        return res.status(404).json({ error: 'Kode tidak ditemukan' })
    if (row.used_by) return res.status(409).json({ error: 'Kode sudah pernah digunakan' })

    const now = new Date()
    const expiry = new Date(now)
    expiry.setDate(expiry.getDate() + 30)

    const { error: subErr } = await supabase.from('subscriptions').upsert({
      user_id: userId, plan: 'premium', status: 'active',
      created_at: now.toISOString(), expires_at: expiry.toISOString(),
    }, { onConflict: 'user_id' })

    if (subErr) return res.status(500).json({ error: 'Gagal mengaktifkan premium' })

    await supabase.from('redeem_codes')
      .update({ used_by: userId, used_at: now.toISOString() })
      .eq('code', cleanCode)

    return res.status(200).json({ success: true, expires_at: expiry.toISOString() })
  }

  // ── REFRESH PROFILE ──────────────────────────────────────────────────────
  if (action === 'refresh-profile') {
    if (req.method !== 'POST') return res.status(405).end()
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const { data: p, error } = await supabase
      .from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle()

    if (error || !p) return res.status(404).json({ error: 'Profile not found' })
    if (p.summary && p.career_dna?.wow_insight && !p.greeted_at) {
      return res.status(200).json({ skipped: true, reason: 'already_fresh' })
    }

    const rawGaps = p.skill_gaps || p.skill_utama
    const gaps = Array.isArray(rawGaps) ? rawGaps
      : rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) : []

    const raw = await generateText({
      system: 'Output HANYA JSON valid. Tanpa backtick, tanpa preamble.',
      prompt: `Kamu adalah Diah Anna, career coach dari Verneks.
Data profil user: Nama: ${p.nama || 'User'}, Target: ${p.target_posisi || '-'}, Posisi: ${p.posisi_saat_ini || '-'}, Industri: ${p.industri || '-'}, Hambatan: ${p.hambatan || '-'}, Readiness: ${p.career_readiness || 0}%, Gaps: ${gaps.join(', ') || '-'}

JSON valid:
{"wow_insight":"observasi tajam personal","motivasi_inferred":"motivasi terdalam","updated_mentor_message":"3 kalimat personal","summary_brief":"2 paragraf narasi briefing"}`,
      maxTokens: 750,
      tier: 'smart',
      plan: 'premium',
    })

    let result
    try {
      result = JSON.parse(raw.trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'').trim())
    } catch (e) {
      return res.status(500).json({ error: 'JSON parse failed' })
    }

    const currentDna = typeof p.career_dna === 'object' && p.career_dna !== null ? p.career_dna : {}
    const updates = {
      summary: result.summary_brief || p.summary,
      mentor_message: result.updated_mentor_message || p.mentor_message,
      greeted_at: null,
      career_dna: { ...currentDna, wow_insight: result.wow_insight || currentDna.wow_insight },
      last_updated: new Date().toISOString(),
    }
    if (result.motivasi_inferred && !p.motivasi) updates.motivasi = result.motivasi_inferred

    await supabase.from('user_career_profiles').update(updates).eq('user_id', userId)
    return res.status(200).json({ success: true, updated: updates })
  }

  // ── JOB MATCH ────────────────────────────────────────────────────────────
  if (action === 'job-match') {
    if (req.method !== 'POST') return res.status(405).end()
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const [{ data: profile }, { data: genome }] = await Promise.all([
      supabase.from('user_career_profiles')
        .select('target_posisi, posisi_saat_ini, industri, skill_gaps, career_readiness')
        .eq('user_id', userId).maybeSingle(),
      supabase.from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle(),
    ])

    if (!profile) return res.status(404).json({ error: 'Profil belum lengkap' })

    const raw = await generateText({
      system: 'Kamu adalah job matching AI untuk platform karier Indonesia. Selalu balas dalam JSON valid.',
      prompt: `Data kandidat: Target: ${profile.target_posisi}, Posisi: ${profile.posisi_saat_ini}, Industri: ${profile.industri}, Readiness: ${profile.career_readiness}%, Gaps: ${(profile.skill_gaps||[]).join(', ')}, Genome: ${JSON.stringify(genome||{})}

Berikan 5 rekomendasi lowongan kerja di Indonesia yang cocok.
JSON array saja tanpa teks lain:
[{"company":"","role":"","match":0,"salary":"Rp X-Yjt","reason":"1 kalimat","apply_url":""}]`,
      maxTokens: 800,
      tier: 'fast',
    })

    try {
      const jobs = JSON.parse(raw.replace(/```json|```/g,'').trim())
      return res.status(200).json({ jobs })
    } catch {
      return res.status(500).json({ error: 'Gagal memproses rekomendasi' })
    }
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────
  if (action === 'admin') {
    if (req.method !== 'POST') return res.status(405).end()
    const { password, action: adminAction, count } = req.body

    if (!process.env.ADMIN_PASSWORD)
      return res.status(500).json({ error: 'Admin belum dikonfigurasi.' })
    if (password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ error: 'Password salah.' })

    try {
      if (adminAction === 'list') {
        const { data, error } = await supabase.from('redeem_codes')
          .select('*').order('created_at', { ascending: false }).limit(50)
        if (error) throw error
        return res.status(200).json({ codes: data || [] })
      }
      if (adminAction === 'generate') {
        const n = Math.min(Math.max(Number(count) || 1, 1), 20)
        const newCodes = Array.from({ length: n }, () => ({
          code: generateCode(), created_at: new Date().toISOString(),
        }))
        const { error } = await supabase.from('redeem_codes').insert(newCodes)
        if (error) throw error
        const { data } = await supabase.from('redeem_codes')
          .select('*').order('created_at', { ascending: false }).limit(50)
        return res.status(200).json({ codes: data || [] })
      }
      return res.status(400).json({ error: 'Action tidak valid.' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── WEEKLY REVIEW ───────────────────────────────────────────────────────
  if (action === 'weekly-review') {
    if (req.method !== 'POST') return res.status(405).end()
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // Cek apakah review minggu ini sudah ada
      const { data: existing } = await supabase
        .from('user_weekly_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStartStr)
        .maybeSingle()

      if (existing) {
        const { data: review } = await supabase
          .from('user_weekly_reviews')
          .select('*')
          .eq('id', existing.id)
          .maybeSingle()
        return res.status(200).json({ success: true, review, cached: true })
      }

      // Ambil data minggu ini
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [profileRes, growthRes, sessionNotesRes, milestonesRes, prevReviewRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_session_notes').select('*').eq('user_id', userId).gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
        supabase.from('user_milestones').select('*').eq('user_id', userId).eq('is_completed', true).gte('completed_at', sevenDaysAgo),
        supabase.from('user_weekly_reviews').select('readiness_delta, review_text').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle(),
      ])

      const profile      = profileRes.data
      const growth       = growthRes.data
      const sessionNotes = sessionNotesRes.data || []
      const milestones   = milestonesRes.data || []
      const prevReview   = prevReviewRes.data

      const firstName = profile?.nama?.split(' ')[0] || 'Kamu'
      const sessionCount = sessionNotes.length
      const milestoneCount = milestones.length

      // Kumpulkan highlights dari semua sesi minggu ini
      const highlights = sessionNotes
        .map(n => n.highlights).filter(Boolean).join(' | ')
      const actionItems = sessionNotes
        .flatMap(n => n.action_items || []).filter(Boolean).slice(0, 5)
      const emotionalStates = sessionNotes
        .map(n => n.emotional_state).filter(Boolean)

      const prompt = `Kamu adalah Diah Anna, career coach personal dari Verneks.

Tulis Weekly Review untuk ${firstName} berdasarkan data minggu ini.
Ini seperti surat singkat dari mentor yang benar-benar mengenal mereka.

Data minggu ini:
- Sesi chat: ${sessionCount} kali
- Milestone diselesaikan: ${milestoneCount}
- Target karier: ${profile?.target_posisi || '-'}
- Career Readiness: ${profile?.career_readiness || 0}%
- Progress stage: ${growth?.career_stage || 'Career Explorer'}
- Highlights dari sesi: ${highlights || 'tidak ada sesi minggu ini'}
- Kondisi emosional: ${emotionalStates.join(', ') || 'tidak terdeteksi'}
- Action items yang disepakati: ${actionItems.join(', ') || 'belum ada'}
- Milestone yang selesai: ${milestones.map(m => m.title).join(', ') || 'belum ada'}
${prevReview ? `- Review minggu lalu menyebutkan: ${prevReview.review_text?.slice(0, 100)}` : ''}

Format review (3-5 kalimat, bahasa Indonesia natural):
1. Sapa dengan nama, akui kondisi minggu ini secara spesifik
2. Highlight 1 hal positif yang benar-benar terjadi (bukan generik)
3. Kalau ada yang perlu diperbaiki, sampaikan dengan empati
4. Tutup dengan 1 kalimat motivasi yang spesifik untuk target mereka

JANGAN generik. JANGAN klise. Tulis seperti teman senior yang genuinely peduli.`

      const reviewText = await generateText({
        system: 'Kamu adalah Diah Anna. Tulis HANYA review text-nya, tanpa label atau format JSON.',
        prompt,
        maxTokens: 300,
        tier: 'smart',
        plan: 'premium',
      })

      // Hitung readiness delta
      const readinessDelta = prevReview ? 
        (profile?.career_readiness || 0) - ((profile?.career_readiness || 0) - (prevReview.readiness_delta || 0)) : 0

      // Simpan review
      const { data: newReview } = await supabase.from('user_weekly_reviews').insert({
        user_id:          userId,
        week_start:       weekStartStr,
        review_text:      reviewText,
        milestones_done:  milestoneCount,
        sessions_count:   sessionCount,
        readiness_delta:  readinessDelta,
      }).select().maybeSingle()

      // Update last_weekly_review di growth_state
      await supabase.from('user_growth_state')
        .update({ last_weekly_review: weekStartStr })
        .eq('user_id', userId)

      return res.status(200).json({ success: true, review: newReview, cached: false })
    } catch (e) {
      console.error('[weekly-review]', e)
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
