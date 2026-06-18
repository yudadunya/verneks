// api/complete-milestone.js
// Dipanggil ketika user mark milestone sebagai selesai
import { createClient } from '@supabase/supabase-js'
import { generateText } from './lib/ai.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, milestoneId, milestoneTitle, stepIndex } = req.body
  if (!userId || !milestoneId) return res.status(400).json({ error: 'Missing data' })

  try {
    // 1. Mark milestone sebagai selesai
    await supabase.from('user_milestones')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', milestoneId)
      .eq('user_id', userId)

    // 2. Ambil profil untuk hitung progress baru
    const { data: profile } = await supabase
      .from('user_career_profiles')
      .select('career_readiness, target_posisi, nama, gps_steps')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: allMilestones } = await supabase
      .from('user_milestones')
      .select('is_completed')
      .eq('user_id', userId)

    const total     = allMilestones?.length || 1
    const completed = allMilestones?.filter(m => m.is_completed).length || 1
    const newReadiness = Math.min(95, Math.round((completed / total) * 100))

    // 3. Update career_readiness berdasarkan milestone completion
    await supabase.from('user_career_profiles')
      .update({ career_readiness: newReadiness, last_updated: new Date().toISOString() })
      .eq('user_id', userId)

    // 4. Generate pesan congratulasi dari Diah Anna
    const firstName = profile?.nama?.split(' ')[0] || 'Kamu'
    const congrats = await generateText({
      system: 'Kamu adalah Diah Anna, career coach yang genuine dan hangat. Maksimal 2 kalimat.',
      prompt: `${firstName} baru saja menyelesaikan milestone: "${milestoneTitle}". Career readiness naik ke ${newReadiness}%. Tulis pesan singkat yang personal, genuine, dan memotivasi untuk langkah berikutnya. Tidak generik.`,
      maxTokens: 120,
      tier: 'fast',
      plan: 'premium',
    })

    return res.status(200).json({
      success: true,
      newReadiness,
      completedCount: completed,
      totalCount: total,
      congratsMessage: congrats,
    })
  } catch (e) {
    console.error('[complete-milestone]', e)
    return res.status(500).json({ error: e.message })
  }
}
