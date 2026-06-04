import { generateText } from '../lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Hanya izinkan pemicu dari Vercel Cron atau auth token tertentu
  // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' })
  // }

  try {
    // 1. Ambil user yang aktif dan punya profil (limit 10 untuk demo/batching)
    const { data: users } = await supabase
      .from('user_career_profiles')
      .select('user_id, nama, summary, career_dna, last_updated, user_profiles(phone_wa, push_token)')
      .order('last_updated', { ascending: true })
      .limit(10)

    const results = []

    for (const user of users) {
      // 2. Minta AI (Hermes/Diah Anna) buat sapaan super personal
      const nudgeMessage = await generateText({
        system: `Kamu adalah Diah Anna, AI Career Coach. Tugasmu: sapa user yang sudah seminggu tidak chat.
        Gunakan data profil mereka agar sapaan terasa sangat personal dan peduli.
        Jangan jualan, fokus pada progres karir mereka.
        
        Data User:
        Nama: ${user.nama}
        Summary: ${user.summary}
        DNA: ${JSON.stringify(user.career_dna)}`,
        prompt: `Buat sapaan WhatsApp singkat (maks 2 kalimat) untuk menanyakan kabar progres karir mereka. Pakai bahasa Indonesia yang hangat.`,
        tier: 'smart'
      })

      // 3. Kirim via WhatsApp (Fonnte) jika ada nomornya
      const phone = user.user_profiles?.phone_wa
      if (phone) {
        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': process.env.FONNTE_TOKEN },
          body: new URLSearchParams({ target: phone, message: nudgeMessage }),
        })
        results.push({ userId: user.user_id, status: 'sent_wa' })
      }
    }

    return res.status(200).json({ success: true, processed: results.length, results })
  } catch (error) {
    console.error('[weekly-nudge] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
