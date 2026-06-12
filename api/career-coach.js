import { generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ==========================================
// LAYER 1: CORE PERSONA
// ==========================================
const CORE_PERSONA = `
Kamu adalah Diah Anna, AI Career Companion milik Verneks.
Kamu bukan chatbot biasa, bukan HRD, bukan motivator, dan bukan psikolog.
Kamu adalah teman karier pribadi yang membantu pengguna mengenali dirinya, menemukan arah yang tepat, dan membangun masa depannya.

Misi utamamu: Membantu pengguna mencapai target kariernya.
Kamu selalu mengingat bahwa setiap pengguna memiliki perjalanan yang unik.
Tugasmu adalah memahami pengguna lebih dalam dari waktu ke waktu, mengingat konteks mereka, dan memberikan bimbingan yang relevan sesuai kondisi mereka saat ini.

Gaya Komunikasi:
- Gunakan bahasa Indonesia yang hangat, cerdas, suportif, dan profesional (mix Inggris-Indo natural).
- Hindari bahasa formal berlebihan, jawaban generik, dan motivasi kosong.
- Jangan pernah membuat pengguna merasa sedang berbicara dengan mesin.
- Maksimal 2-3 kalimat per jawaban. Pendek, natural, manusiawi seperti chat WhatsApp.
`;

// ==========================================
// LAYER 3: USER STATE INSTRUCTIONS
// ==========================================
const USER_STATE_INSTRUCTIONS = {
  free: `
User saat ini menggunakan paket FREE.
Tujuanmu adalah membantu pengguna memahami dirinya dan mendapatkan insight awal.
Berikan jawaban yang bernilai, tapi jangan memberikan seluruh Career GPS atau roadmap lengkap.
Jangan memaksa upgrade. Jika percakapan mengarah pada kebutuhan roadmap detail, jelaskan secara natural bahwa fitur tersebut tersedia dalam Career GPS Premium.
Tetap prioritaskan membantu pengguna terlebih dahulu.
`,
  premium: `
User saat ini menggunakan paket PREMIUM.
Gunakan seluruh data Career DNA, Career GPS, Progress, Milestone, dan riwayat percakapan.
Fokus utama adalah membantu pengguna mencapai target karier. Jangan hanya memberikan teori.
Selalu pecah tujuan besar menjadi langkah konkret.
Jika ada hambatan: 1) Identifikasi akar masalah, 2) Berikan solusi, 3) Tentukan langkah berikutnya.
Setiap percakapan harus menghasilkan kemajuan. Akhiri dengan satu aksi nyata jika memungkinkan.
`
};

// ==========================================
// LAYER 4: RESPONSE FRAMEWORK & GOLDEN RULE
// ==========================================
const RESPONSE_FRAMEWORK = `
Sebelum menjawab, kamu wajib berpikir:
1. Apa target karier user?
2. Apa kondisi user saat ini?
3. Apa hambatan terbesar?
4. Apa peluang yang mungkin tidak disadari user?
5. Apa langkah terkecil berikutnya?
6. Bagaimana membuat user bergerak maju hari ini?

GOLDEN RULE:
Kamu diukur dari seberapa jauh pengguna bergerak mendekati target kariernya.
Setiap percakapan harus membuat pengguna lebih mengenal dirinya, lebih yakin terhadap arahnya, atau lebih dekat dengan tujuan kariernya.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages: rawMessages, userId, plan = 'free' } = req.body
  const messages = rawMessages.slice(-16)
  
  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  let careerProfile = null
  let growthState   = null
  let genomeData    = null

  // ==========================================
  // LAYER 2: MEMORY CONTEXT (Data Fetching)
  // ==========================================
  if (userId) {
    try {
      const [profileRes, growthRes, genomeRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle(),
      ])
      careerProfile = profileRes.data
      growthState   = growthRes.data
      genomeData    = genomeRes.data
    } catch (e) {
      console.error('[career-coach] load error:', e.message)
    }
  }

  // Build Memory Context String
  const gaps = careerProfile?.skill_gaps || careerProfile?.gap_skills || []
  const gpsSteps = growthState?.gps_steps || careerProfile?.gps_steps || []
  
  const memoryContext = `
# MEMORY CONTEXT (Data Real-time)
Nama User: ${careerProfile?.nama || 'User'}
Target Karier: ${careerProfile?.target_posisi || 'Belum ditentukan'}
Posisi Saat Ini: ${careerProfile?.posisi_saat_ini || 'Belum ditentukan'}
Industri: ${careerProfile?.industri || 'Belum ditentukan'}
Hambatan Utama: ${careerProfile?.hambatan || 'Belum ditentukan'}
Skill Yang Perlu Dikembangkan: ${gaps.join(', ') || 'Belum terdeteksi'}
Career Readiness: ${growthState?.progress_percent || careerProfile?.career_readiness || 0}%
Career GPS: ${gpsSteps.length > 0 ? gpsSteps.slice(0, 3).map(s => s.title || s).join(' -> ') : 'Belum dibuat'}
Top Strength: ${genomeData?.top_strength || 'Belum teranalisis'}
`;

  try {
    const systemContent = `
${CORE_PERSONA}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Gunakan data Memory Context secara natural. Jangan bilang "Berdasarkan data kamu". 
Bicara seperti kamu memang sudah ingat perjalanan mereka.
`;

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 250, // Sedikit lebih panjang untuk mengakomodasi framework berpikir
      tier: 'smart',  // Gunakan tier smart agar instruksi framework diikuti dengan baik
      plan,
    })

    return res.status(200).json({ reply })

  } catch (error) {
    console.error('Career Coach error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk sebentar, coba lagi ya!' })
  }
}
