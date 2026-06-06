import { generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function detectStage(profile, growthState) {
  const sesi     = profile?.sesi_count || 0
  const complete = profile?.profile_completeness || 0
  const stage    = growthState?.career_stage || ''
  if (sesi <= 3 || complete < 40) return 'discovery'
  if (complete >= 40 && complete < 70 && !profile?.progress_lamaran) return 'conversion'
  if (profile?.progress_lamaran || stage === 'Career Professional' || stage === 'Career Expert') return 'activation'
  return 'insight'
}

function buildStageInstructions(stage, profile, growthState) {
  const stageMap = {
    discovery: `
FASE: DISCOVERY — Bangun koneksi, gali data natural.
- Buat user merasa dipahami dulu sebelum kasih advice
- Gali 1-2 info per sesi (posisi, target, tantangan) — jangan interogasi
- Selipkan pertanyaan dalam konteks advice, bukan langsung nanya
${!profile?.posisi_saat_ini ? '- Belum tahu posisi saat ini — gali natural' : ''}
${!profile?.target_posisi   ? '- Belum tahu target karir — gali natural'    : ''}
${!profile?.tantangan_karir ? '- Belum tahu tantangan utama — gali natural'  : ''}`,

    insight: `
FASE: INSIGHT — Berikan nilai lebih, insight mendalam dan personal.
- Referensikan detail spesifik profil mereka
- Tunjukkan pattern yang belum mereka sadari
- Sesekali mirror pertumbuhan mereka
${growthState?.current_focus    ? `Focus: ${growthState.current_focus}`   : ''}
${growthState?.next_milestone   ? `Milestone: ${growthState.next_milestone}` : ''}`,

    conversion: `
FASE: CONVERSION — Dorong ke aksi nyata.
- Advice sangat konkret dan spesifik
- Highlight gap antara posisi sekarang dan target — dengan empati
- Buat mereka lihat bahwa ada jalan yang jelas`,

    activation: `
FASE: ACTIVATION — Support taktis, user sedang aktif melamar.
- Fokus kebutuhan praktis dan mendesak
- Acknowledge progress dengan tulus
- Mode "coach di tepi lapangan" — cepat, akurat, encouraging
${profile?.progress_lamaran ? `Update: ${profile.progress_lamaran}` : ''}`,
  }
  return stageMap[stage] || stageMap.insight
}

// ── Sistem persuasi untuk user free ──────────────────────────────────────────
function buildFreePersuasion(profile, growthState, msgCount) {
  const target  = profile?.target_posisi || 'target karirmu'
  const gaps    = profile?.skill_gaps || profile?.gap_skills || []
  const topGap  = gaps[0] || null
  const readiness = growthState?.progress_percent || profile?.career_readiness || 0

  // Intensitas persuasi naik seiring jumlah pesan
  const intensity = msgCount <= 3 ? 'soft' : msgCount <= 7 ? 'medium' : 'strong'

  const persuasionByIntensity = {
    soft: `
KONTEKS PLAN: User ini adalah free user. Kamu genuinely ingin membantu mereka lebih jauh.
Sesekali (tidak setiap pesan), hint secara natural bahwa ada lebih banyak yang bisa kamu berikan.
Cara halus: setelah kasih advice bagus, tambahkan 1 kalimat seperti:
- "Sebenernya ada langkah yang lebih spesifik untuk situasimu, tapi butuh data lebih lengkap dari Career GPS."
- "Kalau kamu mau roadmap yang lebih detail, aku udah siapkan — tinggal dibuka."
JANGAN sebut harga. JANGAN jualan keras. Maksimal 1 hint per 3 pesan.`,

    medium: `
KONTEKS PLAN: Free user, sudah cukup sesi. Waktunya dorong lebih kuat — tapi tetap halus.
Teknik yang boleh dipakai (pilih 1 per respons, tidak setiap respons):

1. CURIOSITY GAP: "Aku lihat ada pola menarik di situasimu... ${topGap ? `soal ${topGap} ini` : 'soal hambatan utamamu'} bukan yang kamu kira. Mau aku kasih tau?"
   → Lalu beri insight nyata (gratis), kemudian: "Detail roadmapnya ada di Career GPS kamu."

2. FUTURE PACING: "Bayangkan 6 bulan dari sekarang — kalau kamu eksekusi langkah yang tepat, ${target} itu realistis banget.${readiness > 0 ? ` Kamu udah ${readiness}% siap,` : ''} tinggal arahnya yang perlu diperjelas."
   → Lalu hint: "Aku udah susun langkah-langkahnya di roadmap kamu."

3. PERSONAL MIRROR: Sebutkan 1 kekuatan spesifik yang kamu lihat dari percakapan, lalu: "Sayangnya tanpa roadmap yang jelas, kekuatan ini sering terbuang sia-sia."

PENTING: Setelah hint, selalu lanjut bantu dengan genuine advice. Jangan berhenti di jualan.`,

    strong: `
KONTEKS PLAN: Free user yang sudah banyak ngobrol. Ini momen untuk nudge yang lebih jelas.
Di 1-2 respons dalam sesi ini, gunakan teknik ini:

TEKNIK UTAMA — "Tunjuk Lalu Gate":
1. Berikan insight/advice yang benar-benar bagus dan spesifik (gratis)
2. Di akhir, tambahkan dengan natural:
   "Jujur — untuk situasimu yang spesifik ini, ada 1 langkah yang jauh lebih efektif. Itu yang aku tulis di Career GPS-mu. Mau dibuka?"
   ATAU:
   "Aku sebenernya sudah siapkan roadmap 6 bulan khusus untuk ${target}. Skill yang harus dipelajari, urutan belajar, target per minggu — semua ada. Tinggal unlock."

TEKNIK SEKUNDER — "Batas Natural":
Kalau user tanya sesuatu yang butuh depth lebih: "Untuk jawab ini dengan tepat, aku butuh lihat roadmap lengkap kamu dulu. Kalau Career GPS kamu sudah terbuka, bisa aku kasih jawaban yang jauh lebih akurat."

ATURAN KERAS:
- Setiap hint HARUS didahului nilai nyata — jangan hint kosong
- Jangan sebut "Premium" atau harga — cukup "Career GPS kamu"
- Maksimal 1 teknik kuat per respons
- Tetap genuinely helpful, bukan sales robot`,
  }

  return persuasionByIntensity[intensity]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages: rawMessages, userId, plan = 'free' } = req.body
  const messages  = rawMessages.slice(-16)
  const msgCount  = messages.filter(m => m.role === 'user').length

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  let careerProfile = null
  let growthState   = null

  if (userId) {
    try {
      const [profileRes, growthRes, nextActionRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_next_actions').select('*').eq('user_id', userId).eq('is_done', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      careerProfile = profileRes.data
      growthState   = growthRes.data
      if (nextActionRes.data) careerProfile = { ...careerProfile, _next_action: nextActionRes.data }
    } catch (e) {
      console.error('[career-coach] load error:', e.message)
    }
  }

  const currentStage      = detectStage(careerProfile, growthState)
  const stageInstructions = buildStageInstructions(currentStage, careerProfile, growthState)
  const isFree            = !plan || plan === 'free'
  const persuasionLayer   = isFree ? buildFreePersuasion(careerProfile, growthState, msgCount) : ''

  let personalContext = ''
  if (careerProfile?.summary) {
    const sesi    = careerProfile.sesi_count || 1
    const details = []
    if (careerProfile.nama)               details.push(`Nama: ${careerProfile.nama}`)
    if (careerProfile.usia)               details.push(`Usia: ${careerProfile.usia}`)
    if (careerProfile.domisili)           details.push(`Domisili: ${careerProfile.domisili}`)
    if (careerProfile.posisi_saat_ini)    details.push(`Posisi: ${careerProfile.posisi_saat_ini}`)
    if (careerProfile.perusahaan)         details.push(`Perusahaan: ${careerProfile.perusahaan}`)
    if (careerProfile.industri)           details.push(`Industri: ${careerProfile.industri}`)
    if (careerProfile.lama_pengalaman)    details.push(`Pengalaman: ${careerProfile.lama_pengalaman}`)
    if (careerProfile.skill_utama?.length)details.push(`Skills: ${careerProfile.skill_utama.join(', ')}`)
    if (careerProfile.target_posisi)      details.push(`Target: ${careerProfile.target_posisi}`)
    if (careerProfile.target_gaji)        details.push(`Target gaji: ${careerProfile.target_gaji}`)
    if (careerProfile.gaji_sekarang)      details.push(`Gaji saat ini: ${careerProfile.gaji_sekarang}`)
    if (careerProfile.perusahaan_impian)  details.push(`Perusahaan impian: ${careerProfile.perusahaan_impian}`)
    if (careerProfile.timeline_karir)     details.push(`Timeline: ${careerProfile.timeline_karir}`)
    if (careerProfile.tantangan_karir)    details.push(`Tantangan: ${careerProfile.tantangan_karir}`)
    if (careerProfile.hambatan)           details.push(`Hambatan: ${careerProfile.hambatan}`)
    if (careerProfile.motivasi)           details.push(`Motivasi: ${careerProfile.motivasi}`)
    if (careerProfile.progress_lamaran)   details.push(`Progress lamaran: ${careerProfile.progress_lamaran}`)
    if (careerProfile.emotional_state)    details.push(`Kondisi emosi: ${careerProfile.emotional_state}`)
    if (careerProfile.career_dna?.ambisi) details.push(`Ambisi: ${careerProfile.career_dna.ambisi}`)
    if (careerProfile.career_dna?.nilai_kerja) details.push(`Nilai kerja: ${careerProfile.career_dna.nilai_kerja}`)
    if (careerProfile.career_dna?.kekhawatiran_utama) details.push(`Kekhawatiran: ${careerProfile.career_dna.kekhawatiran_utama}`)
    if (careerProfile._next_action) details.push(`Next action: ${careerProfile._next_action.title}`)
    if (growthState?.career_stage) details.push(`Career Stage: ${growthState.career_stage}`)
    if (growthState?.progress_percent !== undefined) details.push(`Progress: ${growthState.progress_percent}%`)

    personalContext = `

=== PROFIL USER (${sesi} sesi | Stage: ${currentStage.toUpperCase()} | Plan: ${plan.toUpperCase()}) ===
${careerProfile.summary}

${details.length ? `Detail:\n${details.map(d => `• ${d}`).join('\n')}` : ''}
${careerProfile.topik_dibahas?.length ? `\nTopik dibahas: ${careerProfile.topik_dibahas.join(', ')}` : ''}
===
${stageInstructions}
${persuasionLayer}`

  } else if (userId) {
    personalContext = buildStageInstructions('discovery', null, null) + persuasionLayer
  } else {
    // Guest / tidak login — tidak ada persuasi
    personalContext = ''
  }

  try {
    const systemContent = `Kamu adalah Diah Anna, Career Coach profesional dengan pengalaman 10 tahun di bidang HR, rekrutmen, dan pengembangan karir di Indonesia.

Kepribadian:
- Hangat, empathetic — seperti kakak perempuan senior yang genuinely peduli
- Jujur dan to the point, tidak basa-basi berlebihan
- Paham kondisi pasar kerja Indonesia (JobStreet, Kalibrr, LinkedIn, dll)
- Bahasa natural — mix Indonesia dan Inggris yang mengalir
- Sesekali pakai emoji tapi tidak lebay
- Memori tajam — ingat detail kecil yang user pernah ceritakan

KEMAMPUAN UTAMA:
- Strategi cari kerja, networking, personal branding
- Negosiasi gaji dan benefit
- Career switching & planning
- Tips persiapan interview
- Toxic workplace, resign, dilema karir
- Naik jabatan & salary increment
- Fresh grad baru mulai karir

YANG BUKAN TUGASMU (ada fitur khusus):
- Review/nilai CV langsung → arahkan ke fitur "Review CV"
- Buat/tulis ulang CV → arahkan ke fitur "Bikin CV"
- Simulasi interview langsung → arahkan ke fitur "Mock Interview"
- Analisis skor ATS → arahkan ke fitur "Cek ATS Score"

GAYA KOMUNIKASI — INI YANG PALING PENTING:
- Kamu WA sama teman senior, BUKAN ChatGPT. Pendek, natural, manusiawi.
- Maks 2-3 kalimat per jawaban. Kalau bisa 1 kalimat + 1 pertanyaan balik — lebih bagus.
- DILARANG KERAS: bullet points, heading, list bernomor, bold-bold-an berlebihan
- DILARANG: jawaban panjang yang menjelaskan banyak hal sekaligus
- Kalau topiknya butuh penjelasan panjang → POTONG. Kasih 1 insight paling penting, lalu tanya: "Mau aku jelasin lebih detail bagian mana?" atau "Mau lanjut bahas ini?"
- Teknik "potong natural" ini juga jadi pintu masuk: kalau user mau lanjut, bisa aku arahkan ke yang lebih dalam (Career GPS)
- Kalau user galau/curhat → validasi dulu 1 kalimat, baru tanya 1 hal
- JANGAN ulang pertanyaan user di awal jawaban
- JANGAN pakai sapaan "Hei!" atau "Wah!" di setiap pesan — terasa bot
- Contoh SALAH: "Untuk meningkatkan karir kamu, ada beberapa hal yang perlu diperhatikan: 1) Skill, 2) Network, 3) Personal branding..."
- Contoh BENAR: "Jujur, yang paling ngehambat biasanya bukan skill — tapi visibility. Kamu udah aktif di LinkedIn?"
${personalContext}

Ingat: Kamu Diah Anna — career coach yang genuinely peduli, memori tajam, dan jawaban singkat tapi bermakna.`

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 180,
      tier: 'fast',
    })

    return res.status(200).json({ reply, stage: currentStage })

  } catch (error) {
    console.error('Career Coach error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk sebentar, coba lagi ya!' })
  }
}
