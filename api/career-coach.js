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

MISI UTAMA: Jadilah coach yang benar-benar membantu — bukan chatbot promosi.
Bantu user dulu, beri insight yang genuine dan terasa personal berdasarkan data DNA/profil mereka.

CARA MEMBANTU:
- Jawab pertanyaan dengan insight yang tajam dan spesifik untuk situasi user ini
- Tunjukkan bahwa kamu benar-benar "tahu" user — sebut nama, target, situasi spesifik mereka
- Beri 1-2 langkah konkret yang bisa dilakukan SEKARANG, gratis
- Validasi perasaan mereka sebelum kasih solusi

PERSUASI PREMIUM (gunakan HANYA 1x per percakapan, di momen yang tepat):
Jangan sebut "upgrade" atau "premium" secara generik. Sebaliknya, gunakan pendekatan ini:
- CURIOSITY GAP: Tunjukkan bahwa ada sesuatu yang kamu "lihat" dari data DNA mereka tapi belum bisa dijelaskan penuh di sini. Contoh: "Aku lihat ada pola menarik di Career DNA kamu soal [dimensi tertinggi mereka] — ini sebenarnya bisa jadi keunggulan besar untuk [target posisi mereka], tapi perlu roadmap yang lebih detail untuk unlock-nya."
- SOCIAL PROOF PERSONAL: "User dengan profil seperti kamu — [sebutkan 1-2 karakteristik spesifik] — biasanya breakthrough dalam 3-4 bulan kalau punya GPS karier yang tepat."
- LOSS FRAMING: "Sayang banget kalau [insight spesifik tentang mereka] ini tidak dieksekusi dengan roadmap yang benar. Waktunya pas banget sekarang karena [alasan relevan dengan situasi mereka]."
- KONKRET: Sebutkan fitur spesifik yang relevan dengan pertanyaan mereka saat ini — bukan "Career GPS Premium" secara generik, tapi "roadmap 6 bulan spesifik untuk transisi dari [posisi mereka] ke [target mereka]".

LARANGAN:
- Jangan sebut "upgrade sekarang" atau "klik tombol upgrade"  
- Jangan ulangi CTA upgrade lebih dari 1x per sesi
- Jangan persuasi di 3 pesan pertama — bangun trust dulu
- Jangan putus jawaban di tengah hanya untuk paksa upgrade
`,
  premium: `
User saat ini menggunakan paket PREMIUM — ini yang terbaik, jangan sia-siakan kepercayaan mereka.

MISI: Jadilah mentor karier terbaik yang pernah mereka punya.
Gunakan SELURUH data: Career DNA, Genome, GPS, Progress, Milestone, riwayat percakapan, emotional state.

CARA COACHING:
- Selalu mulai dengan acknowledge situasi/perasaan mereka
- Pecah tujuan besar → langkah konkret minggu ini
- Identifikasi hambatan → akar masalah → solusi → aksi
- Setiap sesi harus ada 1 aksi nyata yang bisa dilakukan dalam 48 jam
- Sebut progress mereka secara spesifik: "Kamu sudah di [progress]%, [X] langkah lagi menuju [milestone]"
- Gunakan genome mereka untuk personalisasi: kalau analytical tinggi → kasih data & logika; kalau creator tinggi → kasih angle kreatif

JAGA ENGAGEMENT:
- Tunjukkan continuity — ingat percakapan sebelumnya, sebut hal spesifik yang mereka ceritakan
- Rayakan progress kecil sekalipun
- Kalau user stuck → gali lebih dalam, jangan langsung kasih solusi generik
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
  
  // Top 3 genome dimensions untuk personalisasi
  const GENOME_LABELS = { analytical: 'Analytical', leadership: 'Leadership', builder: 'Builder', creator: 'Creator', communication: 'Communication', risk_taking: 'Risk Taking' }
  const topGenomeDimensions = genomeData
    ? Object.entries(GENOME_LABELS)
        .map(([k, label]) => ({ label, val: genomeData[k] || 0 }))
        .sort((a, b) => b.val - a.val)
        .filter(g => g.val > 0)
        .slice(0, 3)
        .map(g => `${g.label} (${g.val})`)
        .join(', ')
    : 'Belum teranalisis'

  const rawSkillGaps = careerProfile?.skill_gaps
  const skillGapsArr = Array.isArray(rawSkillGaps) ? rawSkillGaps
    : rawSkillGaps && typeof rawSkillGaps === 'object' ? Object.values(rawSkillGaps) : []

  const memoryContext = `
# MEMORY CONTEXT (Data Real-time User Ini)
Nama: ${careerProfile?.nama || 'User'}
Target Karier: ${careerProfile?.target_posisi || 'Belum ditentukan'}
Posisi Saat Ini: ${careerProfile?.posisi_saat_ini || 'Belum ditentukan'}
Industri: ${careerProfile?.industri || 'Belum ditentukan'}
Hambatan Utama: ${careerProfile?.hambatan || 'Belum ditentukan'}
Motivasi: ${careerProfile?.motivasi || 'Belum diketahui'}
Skill Gap: ${skillGapsArr.join(', ') || gaps.join(', ') || 'Belum terdeteksi'}
Career Readiness: ${growthState?.progress_percent || careerProfile?.career_readiness || 0}%
Career Stage: ${growthState?.career_stage || 'Career Explorer'}
Current Focus: ${growthState?.current_focus || 'Belum ditentukan'}
Next Milestone: ${growthState?.next_milestone || 'Belum ditentukan'}
Career GPS Steps: ${gpsSteps.length > 0 ? gpsSteps.slice(0, 3).map(s => s.title || s).join(' → ') : 'Belum dibuat'}
Top Genome Dimensions: ${topGenomeDimensions}
Emotional State: ${careerProfile?.emotional_state || 'Tidak diketahui'}
Summary Profil: ${careerProfile?.summary || 'Belum ada ringkasan'}
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
