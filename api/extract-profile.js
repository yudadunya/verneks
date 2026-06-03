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
      ? `\n\nPROFIL YANG SUDAH ADA (update/merge, jangan overwrite dengan null):\n${JSON.stringify({
          nama: existing.nama,
          usia: existing.usia,
          domisili: existing.domisili,
          pendidikan: existing.pendidikan,
          jurusan: existing.jurusan,
          posisi_saat_ini: existing.posisi_saat_ini,
          perusahaan: existing.perusahaan,
          industri: existing.industri,
          lama_pengalaman: existing.lama_pengalaman,
          skill_utama: existing.skill_utama,
          gaji_sekarang: existing.gaji_sekarang,
          target_posisi: existing.target_posisi,
          target_industri: existing.target_industri,
          target_gaji: existing.target_gaji,
          perusahaan_impian: existing.perusahaan_impian,
          timeline_karir: existing.timeline_karir,
          tantangan_karir: existing.tantangan_karir,
          motivasi: existing.motivasi,
          progress_lamaran: existing.progress_lamaran,
          hambatan: existing.hambatan,
          gaya_kerja: existing.gaya_kerja,
          summary: existing.summary,
        }, null, 2)}`
      : ''

    // Format percakapan — ambil lebih banyak untuk konteks lebih kaya
    const convoText = messages
      .slice(-30)
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `Kamu adalah sistem ekstraksi data karir yang sangat teliti. Tugasmu: baca percakapan antara user dan career coach Diah Anna, lalu ekstrak SEMUA informasi karir user yang tersedia.

Kembalikan HANYA JSON valid, tidak ada teks lain sama sekali. Format lengkap:
{
  "nama": "nama user jika disebutkan (first name cukup), null jika tidak",
  "usia": "usia atau rentang usia jika disebutkan, null jika tidak",
  "status_pernikahan": "lajang/menikah/dll jika disebutkan, null jika tidak",
  "domisili": "kota/daerah tempat tinggal jika disebutkan, null jika tidak",
  "pendidikan": "jenjang pendidikan terakhir (S1/S2/D3/SMA/dll), null jika tidak",
  "jurusan": "jurusan kuliah/sekolah jika disebutkan, null jika tidak",
  "universitas": "nama universitas jika disebutkan, null jika tidak",
  "tahun_lulus": "tahun lulus jika disebutkan, null jika tidak",
  "posisi_saat_ini": "jabatan/posisi pekerjaan saat ini, null jika tidak ada atau fresh grad",
  "perusahaan": "nama perusahaan saat ini, null jika tidak ada",
  "industri": "industri tempat bekerja saat ini, null jika tidak ada",
  "lama_pengalaman": "total pengalaman kerja (misal: '3 tahun', 'fresh grad'), null jika tidak ada",
  "skill_utama": ["skill1", "skill2"] atau null,
  "gaji_sekarang": "gaji saat ini jika disebutkan (range atau angka), null jika tidak",
  "target_posisi": "posisi yang ingin dicapai, null jika tidak ada",
  "target_industri": "industri yang dituju jika berbeda, null jika tidak ada",
  "target_gaji": "ekspektasi atau target gaji jika disebutkan, null jika tidak",
  "perusahaan_impian": "nama perusahaan impian jika disebutkan, null jika tidak",
  "timeline_karir": "kapan ingin mencapai goal (misal: '6 bulan lagi', 'akhir tahun'), null jika tidak",
  "tantangan_karir": "masalah atau tantangan utama karir yang sedang dihadapi, null jika tidak",
  "motivasi": "motivasi atau goals jangka panjang jika disebutkan, null jika tidak",
  "progress_lamaran": "update terbaru tentang lamaran atau interview aktif, null jika tidak",
  "hambatan": "hambatan atau kekhawatiran yang dirasakan user, null jika tidak",
  "gaya_kerja": "preferensi kerja (remote/hybrid/onsite, startup/corporate/dll) jika disebutkan, null jika tidak",
  "topik_dibahas": ["topik1", "topik2"],
  "summary": "2-3 paragraf ringkas tentang user ini untuk career coach: siapa dia, background-nya, di mana posisinya sekarang, apa yang dia mau, tantangan utama, dan aspek personal yang relevan untuk coaching. Tulis seperti briefing untuk coach yang mau lanjutkan sesi, pakai bahasa Indonesia yang natural."
}

ATURAN PENTING:
- Isi HANYA dari informasi yang EKSPLISIT atau sangat jelas tersirat di percakapan. JANGAN mengarang.
- Kalau ada data lama yang relevan, gunakan sebagai baseline dan update jika ada info baru.
- Untuk topik_dibahas: catat tema-tema obrolan (negosiasi gaji, switch karir, toxic workplace, dll).
- Summary harus USEFUL untuk coach — bukan sekedar daftar fakta, tapi narasi yang membantu coach memahami situasi dan kebutuhan user.${existingContext}`

    const raw = await generateText({
      system: systemPrompt,
      prompt: `Percakapan:\n${convoText}`,
      maxTokens: 900,
      tier: 'fast',
    })

    let profile
    try {
      const clean = raw.trim().replace(/```json|```/g, '').trim()
      profile = JSON.parse(clean)
    } catch {
      console.error('[extract-profile] JSON parse failed:', raw?.slice(0, 200))
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    // Merge dengan data lama — jangan overwrite dengan null
    const merged = {}
    const fields = [
      'nama','usia','status_pernikahan','domisili','pendidikan','jurusan','universitas','tahun_lulus',
      'posisi_saat_ini','perusahaan','industri','lama_pengalaman',
      'gaji_sekarang','target_posisi','target_industri','target_gaji',
      'perusahaan_impian','timeline_karir','tantangan_karir','motivasi',
      'progress_lamaran','hambatan','gaya_kerja','summary'
    ]

    for (const field of fields) {
      merged[field] = profile[field] ?? existing?.[field] ?? null
    }

    // Merge skill_utama — gabungkan array lama dan baru tanpa duplikat
    const oldSkills = existing?.skill_utama || []
    const newSkills = profile.skill_utama || []
    merged.skill_utama = [...new Set([...oldSkills, ...newSkills])].slice(0, 15) // max 15 skill

    // Merge topik_dibahas — gabungkan tanpa duplikat
    const oldTopics = existing?.topik_dibahas || []
    const newTopics = profile.topik_dibahas || []
    merged.topik_dibahas = [...new Set([...oldTopics, ...newTopics])].slice(0, 30)

    // Hitung completeness score (berapa % profil terisi)
    const allFields = [...fields, 'skill_utama']
    const filledFields = allFields.filter(f => {
      const v = f === 'skill_utama' ? merged.skill_utama : merged[f]
      return v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
    })
    const completeness = Math.round((filledFields.length / allFields.length) * 100)

    // Upsert ke Supabase
    const { error } = await supabase
      .from('user_career_profiles')
      .upsert({
        user_id: userId,
        ...merged,
        sesi_count: (existing?.sesi_count || 0) + 1,
        profile_completeness: completeness,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('[extract-profile] upsert error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, completeness, fieldsUpdated: filledFields.length })

  } catch (error) {
    console.error('[extract-profile] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
