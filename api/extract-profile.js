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

  // Minimal 4 pesan baru obrolan sebelum ekstrak — hindari ekstrak dari percakapan terlalu pendek
  if (messages.length < 4) return res.status(200).json({ skipped: true })

  try {
    // Ambil profil lama jika ada
    const { data: existing } = await supabase
      .from('user_career_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const existingContext = existing?.summary
      ? `\n\nProfil yang sudah ada sebelumnya:\n${existing.summary}`
      : ''

    // Format percakapan untuk dikirim ke AI
    const convoText = messages
      .slice(-20) // Ambil 20 pesan terakhir
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `Kamu adalah sistem ekstraksi data karir. Tugasmu: baca percakapan antara user dan career coach, lalu ekstrak informasi karir user.

Kembalikan HANYA JSON valid, tidak ada teks lain sama sekali. Format:
{
  "nama": "nama user jika disebutkan, null jika tidak",
  "domisili": "kota/daerah jika disebutkan, null jika tidak",
  "pendidikan": "pendidikan terakhir jika disebutkan, null jika tidak",
  "posisi_saat_ini": "jabatan/posisi saat ini, null jika tidak ada",
  "perusahaan": "nama perusahaan saat ini, null jika tidak ada",
  "industri": "industri tempat bekerja, null jika tidak ada",
  "lama_pengalaman": "total pengalaman kerja, null jika tidak ada",
  "target_posisi": "posisi yang ingin dicapai, null jika tidak ada",
  "target_industri": "industri yang dituju, null jika tidak ada",
  "target_gaji": "ekspektasi gaji jika disebutkan, null jika tidak ada",
  "timeline_karir": "kapan ingin mencapai goal, null jika tidak ada",
  "tantangan_karir": "masalah/tantangan utama karir yang sedang dihadapi, null jika tidak ada",
  "progress_lamaran": "update lamaran atau interview aktif yang sedang dijalani, null jika tidak ada",
  "topik_dibahas": ["topik1", "topik2"],
  "summary": "1-2 paragraf ringkas tentang user ini untuk career coach: siapa dia, di mana posisinya sekarang, apa yang dia mau, dan apa tantangannya. Tulis seperti briefing untuk coach, pakai bahasa Indonesia."
}

Isi hanya dari informasi yang EKSPLISIT disebutkan di percakapan. Jangan mengarang.${existingContext}`

    // Ekstrak profil menggunakan model fast (hemat biaya)
    const raw = await generateText({
      system: systemPrompt,
      prompt: `Percakapan:\n${convoText}`,
      maxTokens: 600,
      tier: 'fast',
    })

    let profile
    try {
      const clean = raw.trim().replace(/```json|```/g, '').trim()
      profile = JSON.parse(clean)
    } catch {
      console.error('[extract-profile] JSON parse failed:', raw)
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    // Merge dengan data lama — jangan overwrite dengan null
    const merged = {}
    const fields = ['nama','domisili','pendidikan','posisi_saat_ini','perusahaan','industri',
      'lama_pengalaman','target_posisi','target_industri','target_gaji','timeline_karir',
      'tantangan_karir','progress_lamaran','summary']

    for (const field of fields) {
      merged[field] = profile[field] ?? existing?.[field] ?? null
    }

    // Merge topik_dibahas — gabungkan array lama dan baru tanpa duplikat
    const oldTopics = existing?.topik_dibahas || []
    const newTopics = profile.topik_dibahas || []
    merged.topik_dibahas = [...new Set([...oldTopics, ...newTopics])]

    // Upsert ke Supabase
    const { error } = await supabase
      .from('user_career_profiles')
      .upsert({
        user_id: userId,
        ...merged,
        sesi_count: (existing?.sesi_count || 0) + 1,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('[extract-profile] upsert error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, profile: merged })

  } catch (error) {
    console.error('[extract-profile] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
