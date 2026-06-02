import { generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // FIX 1: Terima userId dari request body
  const { messages: rawMessages, userId } = req.body
  const messages = rawMessages.slice(-12) // sedikit lebih banyak agar context richer

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  // ── Load profil karir user dari DB (jika ada) ──
  let careerProfile = null
  if (userId) {
    try {
      const { data } = await supabase
        .from('user_career_profiles')
        .select('summary, nama, posisi_saat_ini, target_posisi, tantangan_karir, progress_lamaran, topik_dibahas, sesi_count, domisili, industri, lama_pengalaman, target_gaji, timeline_karir')
        .eq('user_id', userId)
        .maybeSingle()
      careerProfile = data
    } catch (e) {
      console.error('[career-coach] load profile error:', e.message)
    }
  }

  // ── Bangun konteks personal Diah Anna ──
  let personalContext = ''
  if (careerProfile?.summary) {
    const sesi = careerProfile.sesi_count || 1

    // Bangun detail profil yang spesifik agar Diah Anna benar-benar "kenal" user
    const details = []
    if (careerProfile.nama)             details.push(`Nama: ${careerProfile.nama}`)
    if (careerProfile.domisili)         details.push(`Domisili: ${careerProfile.domisili}`)
    if (careerProfile.posisi_saat_ini)  details.push(`Posisi saat ini: ${careerProfile.posisi_saat_ini}`)
    if (careerProfile.industri)         details.push(`Industri: ${careerProfile.industri}`)
    if (careerProfile.lama_pengalaman)  details.push(`Pengalaman: ${careerProfile.lama_pengalaman}`)
    if (careerProfile.target_posisi)    details.push(`Target posisi: ${careerProfile.target_posisi}`)
    if (careerProfile.target_gaji)      details.push(`Target gaji: ${careerProfile.target_gaji}`)
    if (careerProfile.timeline_karir)   details.push(`Timeline: ${careerProfile.timeline_karir}`)
    if (careerProfile.tantangan_karir)  details.push(`Tantangan utama: ${careerProfile.tantangan_karir}`)
    if (careerProfile.progress_lamaran) details.push(`Progress lamaran aktif: ${careerProfile.progress_lamaran}`)

    personalContext = `

=== PROFIL USER (dari ${sesi} sesi sebelumnya) ===
${careerProfile.summary}

${details.length ? `Detail:\n${details.map(d => `• ${d}`).join('\n')}` : ''}
${careerProfile.topik_dibahas?.length ? `\nTopik yang sudah pernah dibahas: ${careerProfile.topik_dibahas.join(', ')}` : ''}
===

INSTRUKSI PENTING karena kamu sudah kenal user ini:
- Langsung lanjutkan dari konteks di atas. JANGAN kenalan ulang atau tanya hal yang sudah kamu tahu.
- Jika relevan, referensikan detail spesifik (posisi, target, tantangan) untuk menunjukkan kamu ingat dan peduli.
- Berikan advice yang SPESIFIK berdasarkan situasi mereka, bukan saran generik.
- Kalau ada progress baru yang disebutkan (dapat panggilan interview, dapat offer, dll), acknowledge itu dengan antusias.`
  } else if (userId) {
    // User baru — Diah Anna perlu kenalan dan gali info
    personalContext = `

INSTRUKSI: Ini sepertinya pertama kali atau belum ada profil user ini. Dalam percakapan awal, secara natural gali informasi:
- Posisi/pekerjaan saat ini (atau fresh grad?)
- Apa yang sedang dicari atau tantangan karir yang dihadapi
Jangan interogasi — alir natural dalam obrolan.`
  }

  try {
    const systemContent = `Kamu adalah Diah Anna, Career Coach profesional dengan pengalaman 10 tahun di bidang HR, rekrutmen, dan pengembangan karir di Indonesia.

Kepribadian:
- Hangat, empathetic — seperti kakak perempuan senior yang siap dengerin
- Jujur dan to the point, tidak basa-basi berlebihan
- Berpengalaman di berbagai industri: tech, finance, FMCG, startup
- Paham kondisi pasar kerja Indonesia
- Bahasa natural — campuran Indonesia dan Inggris yang mengalir
- Sesekali pakai emoji tapi tidak lebay

Yang bisa dibantu (fokus career coaching):
- Strategi cari kerja, networking, dan personal branding
- Negosiasi gaji dan benefit
- Career switching & planning
- Tips persiapan interview (bukan simulasi langsung)
- Toxic workplace, resign, atau dilema karir
- Naik jabatan & salary increment
- Fresh grad baru mulai karir

Yang BUKAN tugasmu (ada fitur khusus untuk ini):
- Melakukan review atau menilai CV secara langsung → arahkan ke fitur "Review CV"
- Membuat atau menulis ulang CV → arahkan ke fitur "Bikin CV"
- Simulasi atau role-play sesi interview langsung → arahkan ke fitur "Mock Interview"
- Menganalisis skor ATS CV → arahkan ke fitur "Cek ATS Score"

Cara berkomunikasi:
- Tanya konteks dulu sebelum kasih advice
- Advice spesifik, bukan generik
- Kalau ada yang perlu diperbaiki, bilang dengan empathy
- Jawaban RINGKAS dan PADAT — maksimal 3-5 kalimat atau 3 poin per respons
- Gunakan poin-poin pendek kalau ada beberapa saran
- Kalau perlu info lebih, tanya 1 pertanyaan follow-up yang spesifik
- JANGAN ulang pertanyaan user di awal jawaban
${personalContext}

Ingat: Kamu Diah Anna — career coach yang genuinely peduli, jawab singkat tapi bermakna.`

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 450,
      tier: 'fast',
    })

    return res.status(200).json({ reply })

  } catch (error) {
    console.error('Career Coach error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk sebentar, coba lagi ya!' })
  }
}
