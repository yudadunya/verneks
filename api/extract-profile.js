import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, messages } = req.body
  if (!userId || !messages?.length) return res.status(400).json({ error: 'Missing data' })

  // Minimal 3 pesan user sebelum ekstrak
  const userMsgCount = messages.filter(m => m.role === 'user').length
  if (userMsgCount < 3) return res.status(200).json({ skipped: true, reason: 'too_short' })

  try {
    // Ambil profil lama jika ada
    const { data: existing } = await supabase
      .from('user_career_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const existingContext = existing?.summary
      ? `\n\nPROFIL LAMA (Gunakan sebagai referensi, jangan hapus info penting):\n${JSON.stringify({
          summary: existing.summary,
          career_dna: existing.career_dna,
          emotional_state: existing.emotional_state
        }, null, 2)}`
      : ''

    const convoText = messages
      .slice(-30)
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `Kamu adalah sistem ekstraksi data karir tercanggih (V2). Tugasmu: analisis percakapan dan bangun "User Genome" yang mendalam.

Kembalikan HANYA JSON valid. Format:
{
  "nama": "...",
  "posisi_saat_ini": "...",
  "target_posisi": "...",
  "career_dna": {
    "ambisi": "apa goal terbesarnya?",
    "gaya_komunikasi": "formal/santai/butuh dorongan?",
    "kekhawatiran_utama": "apa yang paling dia takutkan dalam karir?",
    "preferensi_industri": ["industri1", "industri2"],
    "nilai_kerja": "misal: gaji tinggi, WFH, atau impact?"
  },
  "emotional_state": "bagaimana perasaan user saat ini? (misal: optimis, burnout, bingung, terdesak)",
  "summary": "...",
  "topik_dibahas": ["..."]
}

ATURAN V2:
1. Ekstrak 'career_dna' secara tajam. Baca di antara baris (read between the lines).
2. 'emotional_state' harus akurat untuk menentukan nada bicara Diah Anna nanti.
3. Update data lama jika ada info baru yang lebih relevan.${existingContext}`

    const raw = await generateText({
      system: systemPrompt,
      prompt: `Percakapan:\n${convoText}`,
      maxTokens: 1000,
      tier: 'smart', // Pakai model pintar untuk V2
    })

    let profile
    try {
      const clean = raw.trim().replace(/```json|```/g, '').trim()
      profile = JSON.parse(clean)
    } catch {
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    // Merge & Upsert
    const { error } = await supabase
      .from('user_career_profiles')
      .upsert({
        user_id: userId,
        ...profile,
        genome_updated_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) throw error

    return res.status(200).json({ success: true, v2: true })

  } catch (error) {
    console.error('[extract-profile-v2] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
