import { generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Stage detection: Diah Anna tahu sedang di fase apa ──
function detectStage(profile, growthState) {
  const sesi     = profile?.sesi_count || 0
  const complete = profile?.profile_completeness || 0
  const stage    = growthState?.career_stage || ''

  // DISCOVERY: sesi awal, profil belum lengkap
  if (sesi <= 3 || complete < 40) return 'discovery'

  // CONVERSION: profil cukup, tapi belum ada action nyata
  if (complete >= 40 && complete < 70 && !profile?.progress_lamaran) return 'conversion'

  // ACTIVATION: user sudah aktif melamar / dalam proses
  if (profile?.progress_lamaran || stage === 'Career Professional' || stage === 'Career Expert') return 'activation'

  // INSIGHT: default — sudah kenal, kasih nilai lebih
  return 'insight'
}

// ── Instruksi per stage ──
function buildStageInstructions(stage, profile, growthState) {
  const nama = profile?.nama ? `, ${profile.nama}` : ''

  const stageMap = {
    discovery: `
KAMU SEDANG DI FASE: DISCOVERY
User baru atau belum banyak kamu kenal. Prioritas: bangun koneksi + gali data profil secara natural.

Tujuan sesi ini:
- Buat user merasa nyaman dan dipahami
- Gali 1-2 informasi penting per sesi (posisi, target, tantangan) — JANGAN interogasi
- Setiap info yang mereka kasih, acknowledge dulu baru tanya lanjutan

Yang perlu digali (natural, satu per satu sesuai flow):
${!profile?.posisi_saat_ini ? '- [ ] Posisi/pekerjaan saat ini' : ''}
${!profile?.target_posisi   ? '- [ ] Goal atau target karir'     : ''}
${!profile?.tantangan_karir ? '- [ ] Tantangan yang sedang dihadapi' : ''}
${!profile?.industri        ? '- [ ] Industri atau bidang kerja'  : ''}

Cara menggali: selipkan pertanyaan dalam konteks advice, bukan langsung nanya.
Contoh: "Supaya saran aku lebih tepat sasaran — kamu sekarang masih di [industri] atau udah switch?"`,

    insight: `
KAMU SEDANG DI FASE: INSIGHT
Kamu sudah cukup kenal user ini. Berikan nilai lebih — insight mendalam, bukan sekedar info generik.

Yang harus dilakukan:
- Referensikan detail spesifik dari profil mereka secara natural
- Berikan advice yang sangat spesifik dan actionable berdasarkan situasi NYATA mereka
- Tunjukkan pattern atau insight yang mungkin belum mereka sadari sendiri
- Sesekali mirror balik growth mereka ("kamu udah jauh banget dari waktu pertama kita ngobrol")

${growthState?.current_focus ? `Focus saat ini: ${growthState.current_focus}` : ''}
${growthState?.next_milestone ? `Next milestone: ${growthState.next_milestone}` : ''}`,

    conversion: `
KAMU SEDANG DI FASE: CONVERSION
Kamu sudah kenal user ini dengan baik. Saatnya dorong mereka ke aksi nyata.

Yang harus dilakukan:
- Berikan advice yang sangat konkret dan spesifik
- Highlight gap antara posisi sekarang dan target mereka — dengan empathy
- Tunjukkan bahwa tools premium (Mock Interview, CV Review mendalam) bisa mempercepat perjalanan mereka
- Kalau konteks relevan, sebutkan secara natural fitur yang bisa bantu mereka (tanpa jualan keras)

Jangan pushy. Buat mereka merasa bahwa upgrade adalah keputusan MEREKA karena masuk akal.`,

    activation: `
KAMU SEDANG DI FASE: ACTIVATION
User sudah aktif dalam proses lamaran. Mereka butuh support taktis dan motivasi.

Yang harus dilakukan:
- Fokus pada kebutuhan PRAKTIS dan MENDESAK (persiapan interview, negotiasi, dll)
- Acknowledge setiap progress dengan tulus dan spesifik
- Kasih boost percaya diri berdasarkan kekuatan nyata mereka
- Siap untuk mode "coach di tepi lapangan" — cepat, akurat, encouraging

${profile?.progress_lamaran ? `Update terbaru: ${profile.progress_lamaran}` : ''}`,
  }

  return stageMap[stage] || stageMap.insight
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages: rawMessages, userId } = req.body
  const messages = rawMessages.slice(-16)

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  // ── Load profil + growth state ──
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

      // Inject next action ke profile untuk konteks
      if (nextActionRes.data) careerProfile = { ...careerProfile, _next_action: nextActionRes.data }
    } catch (e) {
      console.error('[career-coach] load error:', e.message)
    }
  }

  // ── Deteksi stage ──
  const currentStage = detectStage(careerProfile, growthState)
  const stageInstructions = buildStageInstructions(currentStage, careerProfile, growthState)

  // ── Bangun konteks personal ──
  let personalContext = ''
  if (careerProfile?.summary) {
    const sesi = careerProfile.sesi_count || 1
    const details = []
    if (careerProfile.nama)              details.push(`Nama: ${careerProfile.nama}`)
    if (careerProfile.usia)              details.push(`Usia: ${careerProfile.usia}`)
    if (careerProfile.domisili)          details.push(`Domisili: ${careerProfile.domisili}`)
    if (careerProfile.posisi_saat_ini)   details.push(`Posisi: ${careerProfile.posisi_saat_ini}`)
    if (careerProfile.perusahaan)        details.push(`Perusahaan: ${careerProfile.perusahaan}`)
    if (careerProfile.industri)          details.push(`Industri: ${careerProfile.industri}`)
    if (careerProfile.lama_pengalaman)   details.push(`Pengalaman: ${careerProfile.lama_pengalaman}`)
    if (careerProfile.skill_utama?.length) details.push(`Skills: ${careerProfile.skill_utama.join(', ')}`)
    if (careerProfile.target_posisi)     details.push(`Target: ${careerProfile.target_posisi}`)
    if (careerProfile.target_gaji)       details.push(`Target gaji: ${careerProfile.target_gaji}`)
    if (careerProfile.gaji_sekarang)     details.push(`Gaji saat ini: ${careerProfile.gaji_sekarang}`)
    if (careerProfile.perusahaan_impian) details.push(`Perusahaan impian: ${careerProfile.perusahaan_impian}`)
    if (careerProfile.timeline_karir)    details.push(`Timeline: ${careerProfile.timeline_karir}`)
    if (careerProfile.tantangan_karir)   details.push(`Tantangan: ${careerProfile.tantangan_karir}`)
    if (careerProfile.hambatan)          details.push(`Hambatan: ${careerProfile.hambatan}`)
    if (careerProfile.motivasi)          details.push(`Motivasi: ${careerProfile.motivasi}`)
    if (careerProfile.progress_lamaran)  details.push(`Progress lamaran: ${careerProfile.progress_lamaran}`)
    if (careerProfile.emotional_state)   details.push(`Kondisi emosi: ${careerProfile.emotional_state}`)

    // Career DNA
    const dna = careerProfile.career_dna
    if (dna) {
      if (dna.ambisi)            details.push(`Ambisi: ${dna.ambisi}`)
      if (dna.nilai_kerja)       details.push(`Nilai kerja: ${dna.nilai_kerja}`)
      if (dna.kekhawatiran_utama)details.push(`Kekhawatiran: ${dna.kekhawatiran_utama}`)
    }

    // Next action
    if (careerProfile._next_action) {
      details.push(`Next action yang direkomendasikan: ${careerProfile._next_action.title}`)
    }

    // Growth
    if (growthState?.career_stage)    details.push(`Career Stage: ${growthState.career_stage}`)
    if (growthState?.progress_percent !== undefined) details.push(`Progress: ${growthState.progress_percent}%`)

    personalContext = `

=== PROFIL USER (${sesi} sesi | Stage: ${currentStage.toUpperCase()}) ===
${careerProfile.summary}

${details.length ? `Detail:\n${details.map(d => `• ${d}`).join('\n')}` : ''}
${careerProfile.topik_dibahas?.length ? `\nTopik dibahas: ${careerProfile.topik_dibahas.join(', ')}` : ''}
===
${stageInstructions}`

  } else if (userId) {
    personalContext = `
${buildStageInstructions('discovery', null, null)}`
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

GAYA KOMUNIKASI:
- Jawaban RINGKAS dan PADAT — maks 3-5 kalimat atau 3 poin
- Advice spesifik dan actionable, bukan generik
- Kalau perlu info lebih, tanya 1 pertanyaan follow-up yang spesifik
- JANGAN ulang pertanyaan user di awal jawaban
${personalContext}

Ingat: Kamu Diah Anna — career coach yang genuinely peduli, memori tajam, dan jawaban singkat tapi bermakna.`

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 500,
      tier: 'fast',
    })

    return res.status(200).json({ reply, stage: currentStage })

  } catch (error) {
    console.error('Career Coach error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk sebentar, coba lagi ya!' })
  }
}
