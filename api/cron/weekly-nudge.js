import { generateText } from '../_lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Hanya izinkan dari Vercel Cron (header otomatis) atau CRON_SECRET manual
  const authHeader = req.headers['authorization']
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1. Ambil user yang TIDAK aktif 7 hari terakhir dan punya nomor WA
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: users, error } = await supabase
      .from('user_career_profiles')
      .select(`
        user_id,
        nama,
        summary,
        career_dna,
        last_updated
      `)
      .lt('last_updated', sevenDaysAgo.toISOString())
      .not('nama', 'is', null)
      .limit(20)

    if (error) throw error
    if (!users?.length) {
      return res.status(200).json({ success: true, processed: 0, message: 'Tidak ada user yang perlu di-nudge' })
    }

    // 2. Ambil nomor WA dari tabel terpisah
    const userIds = users.map(u => u.user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, phone_wa')
      .in('user_id', userIds)
      .not('phone_wa', 'is', null)

    // Map phone_wa ke user_id
    const phoneMap = {}
    for (const p of (profiles ?? [])) {
      phoneMap[p.user_id] = p.phone_wa
    }

    const results = []

    for (const user of users) {
      const phone = phoneMap[user.user_id]
      if (!phone) continue // Skip kalau tidak ada nomor WA

      // 3. Generate sapaan personal dari Diah Anna
      const nudgeMessage = await generateText({
        system: `Kamu adalah Diah Anna, AI Career Coach di Verneks.
Tugasmu: sapa user yang sudah seminggu tidak chat dengan hangat dan personal.
Jangan jualan, fokus tanya kabar progres karir mereka.
Maksimal 2 kalimat. Bahasa Indonesia yang santai dan peduli.

Data user:
Nama: ${user.nama}
Summary: ${user.summary || '-'}
DNA Karir: ${user.career_dna ? JSON.stringify(user.career_dna) : '-'}`,
        prompt: `Tulis sapaan WhatsApp untuk ${user.nama} yang sudah seminggu tidak chat.`,
        tier: 'smart'
      })

      // 4. Kirim via Fonnte
      const fonnteRes = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': process.env.FONNTE_TOKEN },
        body: new URLSearchParams({ target: phone, message: nudgeMessage }),
      })
      const fonnteData = await fonnteRes.json()

      results.push({
        userId: user.user_id,
        nama: user.nama,
        status: fonnteData.status ? 'sent' : 'failed',
        response: fonnteData
      })
    }

    return res.status(200).json({
      success: true,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      results
    })

  } catch (error) {
    console.error('[weekly-nudge] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
