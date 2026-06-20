// api/refresh-profile.js
// Backfill user lama: generate wow_insight, motivasi inference, dan update greeted_at = null
// Dipanggil otomatis dari DNA.jsx atau Dashboard kalau summary kosong
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    // Ambil data profil yang sudah ada
    const { data: p, error } = await supabase
      .from('user_career_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !p) return res.status(404).json({ error: 'Profile not found' })

    // Kalau summary sudah ada dan greeted_at null → tidak perlu refresh
    if (p.summary && !p.greeted_at) {
      return res.status(200).json({ skipped: true, reason: 'already_fresh' })
    }

    const rawGaps = p.skill_gaps
    const gaps = Array.isArray(rawGaps) ? rawGaps
      : rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) : []

    const prompt = `Kamu adalah Diah Anna, career coach dari Verneks.

Berdasarkan data profil user ini, hasilkan 3 hal dalam JSON:

Data profil:
- Nama: ${p.nama || 'User'}
- Target: ${p.target_posisi || '-'}
- Posisi saat ini: ${p.posisi_saat_ini || '-'}
- Industri: ${p.industri || '-'}
- Hambatan: ${p.hambatan || '-'}
- Career Readiness: ${p.career_readiness || 0}%
- Skill Gaps: ${gaps.join(', ') || '-'}
- Mentor Message sebelumnya: ${p.mentor_message || '-'}

Hasilkan JSON (tanpa backtick, tanpa teks lain):
{
  "wow_insight": "1 observasi tajam dan personal tentang situasi user ini — sesuatu yang mengejutkan dan spesifik berdasarkan kombinasi data di atas. Bukan klise. Mulai dengan 'Yang menarik dari situasi kamu...' atau 'Ada pola yang aku lihat...'",
  "motivasi_inferred": "motivasi terdalam yang bisa diinferensikan dari target dan hambatan mereka — kenapa mereka kejar ini",
  "updated_mentor_message": "Pesan baru dari Diah Anna — 3 kalimat. Sebut nama, akui 1 kekuatan, hint roadmap. Bahasa natural seperti teman senior."
}`

    const raw = await generateText({
      system: 'Kembalikan HANYA JSON valid tanpa teks lain.',
      prompt,
      maxTokens: 500,
      tier: 'smart',
      plan: 'premium',
    })

    let result
    try {
      const clean = raw.trim().replace(/^```json\s*/i, '').replace(/```$/,'').trim()
      result = JSON.parse(clean)
    } catch {
      return res.status(500).json({ error: 'JSON parse failed' })
    }

    // Update profil dengan data baru
    const updates = {
      summary: result.wow_insight || p.summary,
      mentor_message: result.updated_mentor_message || p.mentor_message,
      greeted_at: null, // Reset supaya user dapat greeting Discovery yang proper
    }

    if (result.motivasi_inferred && !p.motivasi) {
      updates.motivasi = result.motivasi_inferred
    }

    await supabase
      .from('user_career_profiles')
      .update(updates)
      .eq('user_id', userId)

    return res.status(200).json({ success: true, updated: updates })

  } catch (e) {
    console.error('[refresh-profile]', e)
    return res.status(500).json({ error: e.message })
  }
}
