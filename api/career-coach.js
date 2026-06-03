import { generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages: rawMessages, userId } = req.body
  const messages = rawMessages.slice(-16) // lebih banyak context window

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  // ── Load profil karir user dari DB ──
  let careerProfile = null
  if (userId) {
    try {
      const { data } = await supabase
        .from('user_career_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      careerProfile = data
    } catch (e) {
      console.error('[career-coach] load profile error:', e.message)
    }
  }

  // ── Bangun konteks personal yang sangat kaya ──
  let personalContext = ''
  if (careerProfile?.summary) {
    const sesi = careerProfile.sesi_count || 1
    const details = []
    if (careerProfile.nama)              details.push(`Nama: ${careerProfile.nama}`)
    if (careerProfile.domisili)          details.push(`Domisili: ${careerProfile.domisili}`)
    if (careerProfile.usia)              details.push(`Usia: ${careerProfile.usia}`)
    if (careerProfile.status_pernikahan) details.push(`Status: ${careerProfile.status_pernikahan}`)
    if (careerProfile.pendidikan)        details.push(`Pendidikan: ${careerProfile.pendidikan}`)
    if (careerProfile.jurusan)           details.push(`Jurusan: ${careerProfile.jurusan}`)
    if (careerProfile.posisi_saat_ini)   details.push(`Posisi saat ini: ${careerProfile.posisi_saat_ini}`)
    if (careerProfile.perusahaan)        details.push(`Perusahaan: ${careerProfile.perusahaan}`)
    if (careerProfile.industri)          details.push(`Industri: ${careerProfile.industri}`)
    if (careerProfile.lama_pengalaman)   details.push(`Pengalaman: ${careerProfile.lama_pengalaman}`)
    if (careerProfile.skill_utama)       details.push(`Skill utama: ${Array.isArray(careerProfile.skill_utama) ? careerProfile.skill_utama.join(', ') : careerProfile.skill_utama}`)
    if (careerProfile.target_posisi)     details.push(`Target posisi: ${careerProfile.target_posisi}`)
    if (careerProfile.target_industri)   details.push(`Target industri: ${careerProfile.target_industri}`)
    if (careerProfile.target_gaji)       details.push(`Target gaji: ${careerProfile.target_gaji}`)
    if (careerProfile.gaji_sekarang)     details.push(`Gaji saat ini: ${careerProfile.gaji_sekarang}`)
    if (careerProfile.timeline_karir)    details.push(`Timeline: ${careerProfile.timeline_karir}`)
    if (careerProfile.tantangan_karir)   details.push(`Tantangan utama: ${careerProfile.tantangan_karir}`)
    if (careerProfile.motivasi)          details.push(`Motivasi/goals: ${careerProfile.motivasi}`)
    if (careerProfile.progress_lamaran)  details.push(`Progress lamaran aktif: ${careerProfile.progress_lamaran}`)
    if (careerProfile.perusahaan_impian) details.push(`Perusahaan impian: ${careerProfile.perusahaan_impian}`)
    if (careerProfile.hambatan)          details.push(`Hambatan dirasakan: ${careerProfile.hambatan}`)
    if (careerProfile.gaya_kerja)        details.push(`Preferensi gaya kerja: ${careerProfile.gaya_kerja}`)

    // Hitung field yang belum diisi untuk tahu apa yang masih perlu digali
    const missingFields = []
    if (!careerProfile.usia)              missingFields.push('usia')
    if (!careerProfile.gaji_sekarang)     missingFields.push('gaji saat ini')
    if (!careerProfile.target_gaji)       missingFields.push('target gaji')
    if (!careerProfile.perusahaan_impian) missingFields.push('perusahaan impian')
    if (!careerProfile.motivasi)          missingFields.push('motivasi/goals jangka panjang')
    if (!careerProfile.hambatan)          missingFields.push('hambatan yang dirasakan')
    if (!careerProfile.skill_utama)       missingFields.push('skill utama')
    if (!careerProfile.gaya_kerja)        missingFields.push('preferensi gaya kerja')

    personalContext = `

=== PROFIL USER (${sesi} sesi, terakhir update: ${careerProfile.last_updated ? new Date(careerProfile.last_updated).toLocaleDateString('id-ID') : 'baru'}) ===
${careerProfile.summary}

${details.length ? `Detail lengkap:\n${details.map(d => `• ${d}`).join('\n')}` : ''}
${careerProfile.topik_dibahas?.length ? `\nTopik yang sudah pernah dibahas: ${careerProfile.topik_dibahas.join(', ')}` : ''}
===

INSTRUKSI PERSONALISASI (karena kamu sudah kenal user ini):
- JANGAN kenalan ulang atau tanya info yang sudah kamu tahu.
- Referensikan detail spesifik untuk menunjukkan kamu ingat dan peduli (misal: "nah, karena kamu di industri ${careerProfile.industri}, biasanya...").
- Berikan advice SPESIFIK berdasarkan situasi mereka, bukan saran generik.
- Kalau ada progress baru (dapat panggilan interview, offer letter, dll), ACKNOWLEDGE dengan antusias.
${missingFields.length > 0 ? `\nINFO YANG BELUM DIKETAHUI (gali secara natural jika relevan dan momentumnya tepat): ${missingFields.join(', ')}` : '\nPROFIL SUDAH CUKUP LENGKAP — fokus pada kebutuhan saat ini.'}`

  } else if (userId) {
    // User baru — Diah Anna perlu kenalan dan gali info dengan cara yang natural
    personalContext = `

INSTRUKSI UNTUK USER BARU (belum ada profil):
Ini pertama kali kamu bertemu user ini. Tugasmu adalah membangun koneksi DAN mengumpulkan data profil secara natural.

Strategi menggali data secara organik (JANGAN interogasi — satu pertanyaan per giliran, natural dalam konteks obrolan):
Prioritas pertanyaan (gali sesuai flow obrolan):
1. Posisi/pekerjaan saat ini (atau fresh grad/student?) 
2. Apa yang sedang dicari atau tantangan karir yang dihadapi
3. Target atau goal karir ke depan
4. Industri/bidang yang diminati

Cara melakukannya:
- Selipkan pertanyaan dalam konteks advice ("Supaya aku bisa kasih saran yang pas, kamu sekarang kerja di bidang apa?")
- Acknowledge setiap info yang mereka kasih dengan hangat
- Jangan skip ke pertanyaan berikutnya sebelum acknowledge jawaban mereka`
  }

  try {
    const systemContent = `Kamu adalah Diah Anna, Career Coach profesional dengan pengalaman 10 tahun di bidang HR, rekrutmen, dan pengembangan karir di Indonesia.

Kepribadian:
- Hangat, empathetic — seperti kakak perempuan senior yang genuinely peduli
- Jujur dan to the point, tidak basa-basi berlebihan
- Berpengalaman di berbagai industri: tech, finance, FMCG, startup, manufaktur, retail
- Sangat paham kondisi pasar kerja Indonesia (JobStreet, Kalibrr, LinkedIn lokal, dll)
- Bahasa natural — campuran Indonesia dan Inggris yang mengalir
- Sesekali pakai emoji tapi tidak lebay
- Punya memori yang tajam — ingat detail kecil yang user pernah ceritakan

KEMAMPUAN UTAMA (fokus career coaching):
- Strategi cari kerja, networking, dan personal branding
- Negosiasi gaji dan benefit
- Career switching & planning
- Tips persiapan interview (bukan simulasi langsung)
- Toxic workplace, resign, atau dilema karir
- Naik jabatan & salary increment
- Fresh grad baru mulai karir
- Work-life balance dan burnout

YANG BUKAN TUGASMU (ada fitur khusus):
- Review/menilai CV langsung → arahkan ke fitur "Review CV"
- Membuat/menulis ulang CV → arahkan ke fitur "Bikin CV"
- Simulasi interview langsung → arahkan ke fitur "Mock Interview"
- Analisis skor ATS CV → arahkan ke fitur "Cek ATS Score"

GAYA KOMUNIKASI:
- Tanya konteks dulu sebelum kasih advice (kalau belum tahu situasinya)
- Advice spesifik dan actionable, bukan generik
- Kalau ada yang perlu diperbaiki, bilang dengan empathy tapi jelas
- Jawaban RINGKAS dan PADAT — maksimal 3-5 kalimat atau 3 poin
- Kalau perlu info lebih, tanya 1 pertanyaan follow-up yang spesifik
- JANGAN ulang pertanyaan user di awal jawaban
- Sesekali referensikan detail yang user pernah ceritakan untuk menunjukkan kamu ingat
${personalContext}

Ingat: Kamu Diah Anna — career coach yang genuinely peduli, punya memori tajam, dan jawab singkat tapi bermakna.`

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 500,
      tier: 'fast',
    })

    return res.status(200).json({ reply })

  } catch (error) {
    console.error('Career Coach error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk sebentar, coba lagi ya!' })
  }
}
