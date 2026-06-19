import { generateText } from '../lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Senin = hari pertama minggu (ISO week)
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Minggu
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const weekStart = getWeekStart()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  try {
    // Ambil user aktif (sudah selesai Discovery)
    const { data: users, error } = await supabase
      .from('user_career_profiles')
      .select('user_id, nama, target_posisi, career_readiness, gps_steps')
      .not('career_readiness', 'is', null)
      .limit(50)

    if (error) throw error
    if (!users?.length) {
      return res.status(200).json({ success: true, processed: 0 })
    }

    const results = []

    for (const user of users) {
      try {
        // Ambil aktivitas minggu ini
        const [eventsRes, notesRes] = await Promise.all([
          supabase.from('career_events')
            .select('event_type, event_payload, created_at')
            .eq('user_id', user.user_id)
            .gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('user_session_notes')
            .select('summary, created_at')
            .eq('user_id', user.user_id)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false }),
        ])

        const events = eventsRes.data || []
        const notes  = notesRes.data || []

        // Skip kalau tidak ada aktivitas sama sekali minggu ini
        if (events.length === 0 && notes.length === 0) continue

        const milestonesDone = events.filter(e => e.event_type === 'milestone_completed')
        const doneCount = (user.gps_steps || []).filter(s => s.done).length
        const totalCount = (user.gps_steps || []).length

        const summary = await generateText({
          system: `Kamu adalah Diah Anna, AI career coach. Tulis catatan refleksi mingguan singkat untuk user.
Gaya hangat, personal, mengakui usaha mereka. 2-4 kalimat saja.
Bahasa Indonesia natural. Langsung isi catatan, tanpa pembuka seperti "Berikut catatan...".`,
          prompt: `Nama: ${user.nama || 'User'}
Target karir: ${user.target_posisi || 'belum ditentukan'}
Progress GPS: ${doneCount}/${totalCount} step selesai
Milestone baru selesai minggu ini: ${milestonesDone.map(m => m.event_payload?.title).join(', ') || 'tidak ada'}
Ringkasan sesi chat minggu ini:
${notes.map(n => `- ${n.summary}`).join('\n') || '(tidak ada sesi chat minggu ini)'}

Tulis catatan refleksi mingguan yang personal untuk user ini.`,
          maxTokens: 150,
          tier: 'fast',
        })

        await supabase.from('user_weekly_reviews').upsert({
          user_id: user.user_id,
          week_start: weekStart,
          summary: summary.trim(),
        }, { onConflict: 'user_id,week_start' })

        results.push({ userId: user.user_id, status: 'generated' })
      } catch (e) {
        console.error(`[weekly-review] gagal untuk user ${user.user_id}:`, e.message)
        results.push({ userId: user.user_id, status: 'failed', error: e.message })
      }
    }

    return res.status(200).json({
      success: true,
      weekStart,
      processed: results.length,
      generated: results.filter(r => r.status === 'generated').length,
    })

  } catch (error) {
    console.error('[weekly-review] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
