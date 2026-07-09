// api/weekly-review.js
// Generate weekly review dari Diah Anna
// Dipanggil dari cron job setiap Minggu, atau on-demand dari Dashboard
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
