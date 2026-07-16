import { generateText, generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── [OPTIMIZATION] RULE-BASED RESPONSES — Hemat ~25% AI calls ────────────────
const RULE_BASED_PATTERNS = [
  {
    keywords: ['mulai', 'cara mulai', 'langkah pertama', 'dari mana'],
    context: ['karir', 'kerja', 'posisi', 'target'],
    response: "Langkah pertama yang paling penting: klarifikasi dulu posisi target yang spesifik. Jangan masih 'pengen kerja di tech', tapi harus 'Product Manager di startup fintech'. Setelah itu baru kita breakdown skill gap-nya. Kamu sudah punya gambaran posisi target yang jelas?"
  },
  {
    keywords: ['skill', 'kemampuan', 'kompetensi', 'belajar'],
    context: ['butuh', 'perlu', 'yang dibutuhkan', 'harus punya'],
    response: "Skill yang paling critical biasanya muncul di 3-5 job description posisi target kamu. Coba buka LinkedIn, cari 5 lowongan yang match, catet skill yang paling sering disebut. Itu yang kita prioritaskan. Mau aku bantu identifikasi skill gap utama kamu?"
  },
  {
    keywords: ['gaji', 'salary', 'uang', 'penghasilan', 'bayaran'],
    context: ['berapa', 'standar', 'normal', 'range'],
    response: "Gaji itu sangat tergantung level, industri, dan lokasi. Yang bisa aku bantu: positioning kamu supaya masuk range atas. Caranya? Dokumentasi achievement yang measurable, bangun track record yang jelas, dan tahu cara negotiate. Kamu sekarang di level berapa?"
  },
  {
    keywords: ['cv', 'resume', 'daftar riwayat'],
    context: ['jelek', 'buruk', 'jelek', 'kurang bagus', 'review'],
    response: "CV yang efektif itu bukan tentang desain cantik, tapi tentang achievement yang terukur. Ganti 'bertanggung jawab untuk X' jadi 'berhasil meningkatkan X sebesar Y%'. Kalau mau review mendalam, pakai fitur CV Review di menu Chat - ada analisis ATS-nya juga."
  },
  {
    keywords: ['motivasi', 'semangat', 'lelah', 'burnout', 'menyerah'],
    context: [],
    response: "Wajar banget merasa lelah. Career journey itu marathon, bukan sprint. Coba ingat lagi: kenapa kamu pilih target ini dari awal? Apa yang bikin kamu excited waktu pertama kali bayangin capai tujuan itu? Kadang kita cuma butuh istirahat sebentar, bukan berhenti."
  },
  {
    keywords: ['interview', 'wawancara', 'hrd', 'user'],
    context: ['takut', 'gugup', 'tips', 'cara', 'persiapan'],
    response: "Kunci interview itu preparation + authenticity. Prepare 5-7 story tentang achievement kamu pakai framework STAR (Situation, Task, Action, Result). Lalu latihan cerita itu sampai natural. Mau coba mock interview? Ada fiturnya di menu Chat."
  },
  {
    keywords: ['promosi', 'naik jabatan', 'naik level', 'career path'],
    context: [],
    response: "Promosi itu hasil dari 3 hal: performance yang konsisten, visibility yang tepat, dan timing yang pas. Yang paling sering dilupakan orang: visibility. Bos kamu tahu nggak achievement 3 bulan terakhir kamu? Kalau belum, saatnya mulai communicate proaktif."
  },
  {
    keywords: ['pindah', 'switch', 'pivot', 'ganti', 'transisi'],
    context: ['karir', 'industri', 'pekerjaan', 'kerja'],
    response: "Career pivot itu risiko, tapi kadang perlu. Pertanyaan kuncinya: apakah kamu pindah KARENA sesuatu (visi yang lebih besar) atau pindah DARI sesuatu (escape dari situasi tidak nyaman)? Kalau alasannya 'dari', kemungkinan bakal nyesel. Kalau 'karena', lebih sustainable. Kamu yang mana?"
  },
  {
    keywords: ['networking', 'koneksi', 'relasi', 'kenalan'],
    context: ['cara', 'tips', 'malu', 'gak jago'],
    response: "Networking itu bukan tentang kenal banyak orang, tapi tentang membangun relasi bermakna dengan sedikit orang yang right. Mulai dari: engage dengan konten orang di LinkedIn, kasih value dulu sebelum minta, dan follow up rutin. Kamu sudah coba approach apa sejauh ini?"
  },
  {
    keywords: ['thank', 'terima', 'makasih', 'thanks', 'helpful', 'bermanfaat'],
    context: [],
    response: "Sama-sama! Seneng bisa bantu. Yang paling penting: eksekusi. Insight tanpa action cuma entertainment. Ada satu hal konkret yang mau kamu commit lakukan minggu ini?"
  }
]

function matchRuleBasedResponse(message, careerProfile) {
  const lowerMsg = message.toLowerCase()
  
  for (const rule of RULE_BASED_PATTERNS) {
    const hasKeyword = rule.keywords.some(k => lowerMsg.includes(k))
    if (!hasKeyword) continue
    
    // Check context if specified
    if (rule.context.length > 0) {
      const hasContext = rule.context.some(c => lowerMsg.includes(c))
      if (!hasContext) continue
    }
    
    return rule.response
  }
  
  return null
}

// ── [OPTIMIZATION] MESSAGE COMPRESSION — Hemat ~10% token usage ─────────────
function compressConversationHistory(messages, maxMessages = 8) {
  if (messages.length <= maxMessages) return messages
  
  // Keep first 2 messages (context setting) + last (maxMessages - 2) messages
  const compressed = [
    ...messages.slice(0, 2),
    { role: 'system', content: `[${messages.length - maxMessages + 2} pesan sebelumnya diringkas untuk efisiensi]` },
    ...messages.slice(-(maxMessages - 2))
  ]
  
  return compressed
}

function pruneMessageContent(content, maxLength = 500) {
  if (!content || content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

// ── [OPTIMIZATION] CACHE HASHING — Hemat ~30% duplicate AI calls ────────────
function hashMessage(message) {
  return createHash('sha256').update(message.toLowerCase().trim()).digest('hex').slice(0, 16)
}

const responseCache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCachedResponse(hash) {
  const cached = responseCache.get(hash)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    responseCache.delete(hash)
    return null
  }
  return cached.response
}

function setCachedResponse(hash, response) {
  responseCache.set(hash, { response, timestamp: Date.now() })
  
  // Cleanup old entries periodically
  if (responseCache.size > 1000) {
    const now = Date.now()
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        responseCache.delete(key)
      }
    }
  }
}

// ── [RSI] ROBUST JSON PARSER ─────────────────────────────────────────────────
function extractJsonFromResponse(text) {
  if (!text) return null

  // 1. Coba cari blok JSON di dalam ```json ... ```
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonBlockMatch) {
    try { return JSON.parse(jsonBlockMatch[1]) } catch (e) {}
  }

  // 2. Coba parse langsung
  try { return JSON.parse(text) } catch (e) {}

  // 3. Strategi terakhir: ambil substring antara '{' pertama dan '}' terakhir
  // Berguna kalau AI tambahkan teks penjelasan di luar JSON atau respons terpotong
  const startIdx = text.indexOf('{')
  const endIdx   = text.lastIndexOf('}')
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try { return JSON.parse(text.substring(startIdx, endIdx + 1)) } catch (e2) {
      console.error('[RSI] Gagal parse JSON potensial:', e2.message)
    }
  }

  return null
}

// ── [RSI] ENGINE: ANALISIS & PEMBELAJARAN POLA MANDIRI ───────────────────────
async function analyzeAndLearnPatterns(userId, messages, aiResponse, careerProfile, existingPatterns, rsiVersion, supabase) {
  try {
    // Ambil hanya pesan user untuk analisis
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content || m.text || '').join('\n')
    
    if (!userMessages || userMessages.length < 20) return // Terlalu pendek untuk dianalisis
    
    // [OPTIMIZATION #7] Compress user messages untuk RSI analysis — hemat token
    const compressedUserMsgs = userMessages.slice(0, 2000) // Reduced from 3000
    
    // Minta AI menganalisis pola dari percakapan ini
    const patternAnalysis = await generateText({
      system: `Kamu adalah sistem analisis pola perilaku untuk Diah Anna. Tugasmu: mengidentifikasi pola berulang, preferensi komunikasi, atau wawasan baru tentang user dari percakapan coaching karir.
      
Output HARUS dalam format JSON valid dengan struktur:
{
  "new_patterns": [
    {
      "type": "communication_style|emotional_trigger|work_habit|decision_pattern|motivation_driver|blocker",
      "description": "Deskripsi singkat dan jelas tentang pola ini",
      "confidence": 0-100,
      "examples": ["contoh 1 dari percakapan", "contoh 2"]
    }
  ],
  "strategy_adjustment": "Saran bagaimana Diah Anna harus menyesuaikan gaya coaching-nya berdasarkan pola ini",
  "should_update_memory": true/false
}`,
      prompt: `Profil User: ${careerProfile?.nama || 'Unknown'}, Target: ${careerProfile?.target_posisi || 'Unknown'}\n\nRiwayat Percakapan:\n${compressedUserMsgs}\n\nRespons AI:\n${aiResponse.slice(0, 800)}\n\nAnalisis apakah ada pola baru yang bisa dipelajari atau pola lama yang perlu disesuaikan confidence-nya.`,
      maxTokens: 1000,  // [OPTIMIZATION #8] Reduced from 1500 — RSI tidak butuh detail tinggi
      tier: 'fast',   // Cerebras/DeepSeek — hemat, RSI tidak butuh model premium
      plan: 'free'
    })
    
    // Parse hasil analisis — pakai robust parser
    // Parse hasil analisis — pakai robust parser + repair kalau terpotong
    let analysis = extractJsonFromResponse(patternAnalysis)

    // Kalau masih gagal (JSON terpotong) — coba repair: tutup array & object yang terbuka
    if (!analysis || !Array.isArray(analysis.new_patterns)) {
      try {
        let repaired = patternAnalysis
          .replace(/```json\s*/i, '').replace(/```\s*$/, '').trim()
        // Hitung bracket yang belum ditutup
        let opens = 0, arrOpens = 0, inStr = false, esc = false
        for (const ch of repaired) {
          if (esc) { esc = false; continue }
          if (ch === '\\') { esc = true; continue }
          if (ch === '"') inStr = !inStr
          else if (!inStr && ch === '{') opens++
          else if (!inStr && ch === '}') opens--
          else if (!inStr && ch === '[') arrOpens++
          else if (!inStr && ch === ']') arrOpens--
        }
        if (inStr) repaired += '"'
        for (let i = 0; i < arrOpens; i++) repaired += ']'
        for (let i = 0; i < opens; i++) repaired += '}'
        analysis = JSON.parse(repaired)
        console.log('[RSI] JSON repair berhasil')
      } catch (e) {
        console.error('[RSI] Invalid structure atau parse gagal. Raw:', patternAnalysis.slice(0, 300))
        return
      }
    }

    if (!analysis || !Array.isArray(analysis.new_patterns)) {
      console.error('[RSI] Struktur tidak valid setelah repair')
      return
    }
    
    if (!analysis.new_patterns || analysis.new_patterns.length === 0) return // Tidak ada pola baru
    
    // Proses setiap pola yang ditemukan
    for (const pattern of analysis.new_patterns) {
      if (!pattern.type || !pattern.description) continue
      
      // Cek apakah pola serupa sudah ada
      const similarPattern = existingPatterns.find(p => 
        p.pattern_category === pattern.type && 
        p.pattern_description.toLowerCase().includes(pattern.description.toLowerCase().slice(0, 30))
      )
      
      if (similarPattern) {
        // Update confidence + occurrence count
        await supabase.from('ai_learned_patterns')
          .update({ 
            confidence_score:  Math.min(100, (similarPattern.confidence_score || 50) + 10),
            occurrence_count:  (similarPattern.occurrence_count || 1) + 1,
            last_observed_at:  new Date().toISOString(),
          })
          .eq('id', similarPattern.id)
      } else {
        // Insert pola baru
        await supabase.from('ai_learned_patterns')
          .insert({
            user_id:             userId,
            pattern_category:    pattern.type,
            pattern_description: pattern.description,
            confidence_score:    pattern.confidence || 50,
            occurrence_count:    1,
            last_observed_at:    new Date().toISOString(),
          })
      }
    }
    
    // Log proses self-improvement
    await supabase.from('ai_self_improvement_log')
      .insert({
        user_id: userId,
        session_id: `chat_${Date.now()}`,
        improvement_type: 'pattern_recognition',
        before_state: { patterns_count: existingPatterns.length, rsi_version: rsiVersion },
        after_state: { patterns_count: existingPatterns.length + (analysis.new_patterns?.length || 0), rsi_version: rsiVersion + 1 },
        confidence_delta: analysis.new_patterns?.reduce((sum, p) => sum + (p.confidence || 0), 0) / (analysis.new_patterns?.length || 1),
        notes: analysis.strategy_adjustment || ''
      })
    
    // Update RSI version di profil user
    await supabase.from('user_career_profiles')
      .update({ 
        rsi_version: rsiVersion + 1,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    console.log(`[RSI] Learned ${analysis.new_patterns.length} new patterns for user ${userId}. New version: v${rsiVersion + 1}`)
    
  } catch (error) {
    console.error('[RSI] Analysis error:', error.message)
  }
}

// ── KEAMANAN: plan & usage TIDAK PERNAH dipercaya dari client ────────────────
const LIMITS = {
  free:    { chat: 15, 'cv-review': 1, ats: 1, coach: 999, interview: 1, 'cv-maker': 1 },
  premium: { chat: 999, 'cv-review': 999, ats: 999, coach: 999, interview: 999, 'cv-maker': 999 },
}

async function getRealPlan(userId) {
  if (!userId) return 'free'
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data?.plan || !LIMITS[data.plan]) return 'free'
    const expired = data.expires_at && new Date(data.expires_at) < new Date()
    if (!expired && data.status === 'active') return data.plan
    return 'free'
  } catch (e) {
    console.error('[getRealPlan] error:', e.message)
    return 'free'
  }
}

async function checkAndLogUsage(userId, plan, feature) {
  const limit = LIMITS[plan]?.[feature] ?? 0
  if (limit === 0) return { allowed: false, remaining: 0 }
  if (limit >= 999) {
    if (userId) supabase.from('usage_logs').insert({ user_id: userId, feature }).then(() => {}).catch(() => {})
    return { allowed: true, remaining: 999 }
  }
  if (!userId) return { allowed: false, remaining: 0 }

  try {
    const since = feature === 'chat'
      ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const { count } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', since)

    const used = count ?? 0
    if (used >= limit) return { allowed: false, remaining: 0 }

    await supabase.from('usage_logs').insert({ user_id: userId, feature })
    return { allowed: true, remaining: limit - used - 1 }
  } catch (e) {
    console.error('[checkAndLogUsage] error:', e.message)
    return { allowed: false, remaining: 0 }
  }
}

// ── ENGINE V2: HELPER NEXT FOCUS & PROACTIVE GREETING ───────────────────────
function getNextFocus(memory) {
  if (memory.current_focus && memory.current_focus !== 'Belum ditentukan') {
    return { focus: memory.current_focus, type: 'current_focus' };
  }
  if (memory.skill_gaps && memory.skill_gaps.length > 0) {
    return { focus: memory.skill_gaps[0], type: 'biggest_skill_gap' };
  }
  if (memory.next_milestone && memory.next_milestone !== 'Belum ditentukan') {
    return { focus: memory.next_milestone, type: 'next_milestone' };
  }
  if (memory.gps_steps && memory.gps_steps.length > 0) {
    return { focus: memory.gps_steps[0], type: 'roadmap_step' };
  }
  return { focus: memory.target_position || "Pengembangan Karier", type: 'target_position' };
}

function generateDailyCoaching(memory, activeMission = null) {
  if (activeMission?.daily_mission) {
    return {
      daily_focus: activeMission.weekly_focus || "Mission Completion",
      daily_reason: "Menuntaskan misi aktif yang ada di dashboard utama kamu.",
      daily_question: `Bagaimana progres target "${activeMission.daily_mission}" yang kita sepakati di dashboard kemarin?`
    };
  }

  const nextFocusData = getNextFocus(memory);
  let reason = "";
  let question = "";

  switch (nextFocusData.type) {
    case 'current_focus':
      reason = `Sesuai rencana aksi yang sedang kita kawal bersama.`;
      question = `Sejauh mana langkah konkret yang sudah kamu ambil untuk mengoptimalkan area ini?`;
      break;
    case 'biggest_skill_gap':
      reason = `Karena area ini adalah hambatan terbesar menuju targetmu saat ini.`;
      question = `Menurutmu, apa yang paling menghambat perkembanganmu di area ${nextFocusData.focus}?`;
      break;
    default:
      reason = `Langkah strategis berikutnya untuk mendekatkanmu ke posisi target.`;
      question = `Apa satu tindakan kecil yang bisa kita mulai hari ini untuk fokus ke area ${nextFocusData.focus}?`;
  }

  return {
    daily_focus: nextFocusData.focus,
    daily_reason: reason,
    daily_question: question
  };
}

// ── PERSONA INTI DIAH ANNA (VERNEKS ENGINE V2) ───────────────────────────────
const CORE_PERSONA = `
Kamu Diah Anna — career companion di Verneks. Teman senior yang jujur, tajam, genuinely peduli karir user. Bukan chatbot, bukan expert teknis.

CARA BICARA: 2-3 kalimat per respons. Natural seperti WhatsApp. Tidak ada bullet/header/formatting. Langsung ke inti.

PRIORITAS: Kebenaran > Kepercayaan > Membantu. Lebih baik akui tidak tahu daripada mengarang.

ABSOLUTE RULES:
- Jangan mengarang fitur, modul, menu, data user, atau progress yang tidak ada
- Jangan jadi expert teknis (coding, trading, desain, medis, dll) — redirect ke sisi karir
- Kalau tidak yakin → "Aku belum punya info itu" atau "Itu belum ada di Verneks"
- Kalau user koreksi → akui langsung, jangan defensif

VERNEKS — HANYA INI YANG ADA:
- Home: dashboard readiness, mission harian, DNA preview
- Chat/Mentor: coaching Diah Anna (FREE: 15x/hari, PREMIUM: unlimited + CV Review/ATS/Mock Interview)
- DNA: 6 genome scores, gap skills, wow insight, GPS preview
- Journey (PREMIUM): 4 fase roadmap action steps — BUKAN modul/video/kursus
- Peluang (PREMIUM): 5 job matching berdasarkan DNA
- Profil: akun, plan, depth score, redeem kode

TIDAK ADA DI VERNEKS: modul, video, kursus, email sistem, Resources, support, komunitas, notifikasi.

CONTOH SALAH: "Modul Manajemen Sekolah ada di Journey" ← JANGAN PERNAH
CONTOH BENAR: "Verneks tidak punya modul. Journey isinya action steps karir, bukan kursus."

DOMAIN BOUNDARY: Apapun bidang user (trader, programmer, guru, chef) → bantu dari SISI KARIR, bukan teknis bidangnya.
Contoh: User tanya cara backtest forex → "Teknis tradingnya butuh mentor khusus. Yang bisa aku bantu: bagaimana membangun track record sebagai trader."

SELF CORRECTION: Kalau salah → "Terima kasih sudah koreksi. Aku pakai info dari kamu sekarang."

COACHING: Pakai data profil dari memory. Jangan tanya yang sudah diketahui. Arahkan, jangan tunggu. 1 pertanyaan tajam > 3 saran panjang.
`

const COACHING_BRAIN = `
# BRAIN 3 — COACHING MODE

Kamu memilih mode coaching terbaik berdasarkan sinyal dari percakapan. Satu respons = satu mode dominan.

DETEKSI MODE:
- MENTOR     → user butuh arah, bingung mau mulai, tanya "gimana caranya"
- COACH      → user sudah tahu tapi belum bergerak, butuh pertanyaan tajam bukan jawaban
- CHALLENGER → user terlalu nyaman, excuses berulang, tidak ada progress
- ACCOUNTABILITY → user lapor kemajuan, check-in rutin, janji tapi tidak eksekusi
- STRATEGIC  → user hadapi keputusan besar (pindah karir, resign, pivoting)
- MOTIVATOR  → user lelah, pesimis, mau menyerah
- CELEBRATOR → user baru capai milestone, achievement nyata

CARA BICARA PER MODE:
MENTOR: "Yang perlu kamu lakukan sekarang adalah..."
COACH: Balik pertanyaan. "Menurut kamu sendiri, apa yang menghambat?"
CHALLENGER: Tegas, tidak basa-basi. "Sudah 3 kali kamu bilang ini. Apa yang berbeda hari ini?"
ACCOUNTABILITY: Spesifik dan terukur. "Dari target X, berapa yang sudah selesai?"
STRATEGIC: Bantu lihat tradeoff. "Kalau ambil opsi A, risikonya adalah..."
MOTIVATOR: Validasi dulu, baru dorong. "Wajar kamu lelah. Tapi lihat..."
CELEBRATOR: Rayakan singkat, arahkan ke next step. "Ini pencapaian nyata. Sekarang..."

ATURAN:
- Jangan terjebak satu mode selamanya — baca ulang sinyal tiap respons
- Jangan campur 3+ mode dalam satu respons
- Mode CHALLENGER hanya kalau sudah ada rapport (minimal 5 pesan)
`

const STRATEGY_BRAIN = (stage, gpsSteps, currentFocus, nextMilestone, lastUpdated) => {
  // Deteksi apakah user stuck (tidak ada progress > 14 hari)
  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated)) / 86400000)
    : 0
  const isStuck = daysSinceUpdate > 14

  // Strategi per career stage
  const stageStrategies = {
    'Career Explorer': `
STRATEGI: User masih eksplorasi — belum punya arah yang jelas.
Fokus Diah Anna: Bantu user mempersempit target dari opsi-opsi yang ada.
Pertanyaan kunci: "Dari semua yang kamu pertimbangkan, mana yang paling bikin kamu excited saat bangun pagi?"
Hindari: Langsung kasih roadmap panjang — user belum siap.`,

    'Career Builder': `
STRATEGI: User sudah punya target, sedang membangun fondasi.
Fokus Diah Anna: Skill building + networking yang tepat sasaran.
Pertanyaan kunci: "Skill mana yang paling sering muncul di job desc target kamu?"
Hindari: Terlalu banyak teori — user butuh aksi konkret minggu ini.`,

    'Career Professional': `
STRATEGI: User sudah bekerja di bidangnya, ingin naik level.
Fokus Diah Anna: Visibility + positioning + leverage pengalaman yang ada.
Pertanyaan kunci: "Apa pencapaian terbesar kamu 6 bulan terakhir yang belum banyak orang tahu?"
Hindari: Saran dari nol — user sudah punya modal, tinggal dioptimalkan.`,

    'Career Expert': `
STRATEGI: User sudah expert, ingin scale impact atau pindah ke peran strategis.
Fokus Diah Anna: Personal brand + thought leadership + peluang non-linear.
Pertanyaan kunci: "Kalau kamu bisa pilih satu legacy yang ingin diingat orang dari karir kamu, apa itu?"
Hindari: Saran teknis level bawah — tidak relevan untuk posisi mereka.`,

    'Career Leader': `
STRATEGI: User di level leadership — fokus pada sistem dan orang, bukan tugas.
Fokus Diah Anna: Leverage tim + decision making + long-term positioning.
Pertanyaan kunci: "Siapa di tim kamu yang bisa replace kamu dalam 6 bulan ke depan?"
Hindari: Micromanagement mindset — user perlu berpikir di level yang lebih tinggi.`,
  }

  const strategy = stageStrategies[stage] || stageStrategies['Career Builder']

  const stuckWarning = isStuck ? `
⚠️ USER TAMPAK STUCK: Tidak ada update progress selama ${daysSinceUpdate} hari.
Prioritaskan ACCOUNTABILITY atau CHALLENGER mode.
Tanya langsung: "Apa yang membuat langkah ini belum bergerak?"` : ''

  const gpsContext = gpsSteps?.length > 0 ? `
GPS ROADMAP AKTIF:
${gpsSteps.slice(0, 3).map((s, i) => `${i+1}. [${s.done ? '✓' : '○'}] ${s.title}`).join('\n')}
${gpsSteps.filter(s => !s.done).length > 0 ? `Next action: ${gpsSteps.find(s => !s.done)?.title}` : 'Semua step selesai — saatnya naik level!'}` : ''

  return `# BRAIN 4 — STRATEGY
${strategy}
${stuckWarning}
${gpsContext}`
}

const PREDICTION_BRAIN = (careerReadiness, depthScore, lastUpdated, gpsSteps, plan) => {
  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated)) / 86400000)
    : 30

  const doneSteps    = (gpsSteps || []).filter(s => s.done).length
  const totalSteps   = (gpsSteps || []).length
  const progressPct  = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0

  // Estimasi waktu capai target
  const readiness         = careerReadiness || 0
  const weeklyProgressEst = daysSinceUpdate <= 7 ? 5 : daysSinceUpdate <= 14 ? 2 : 0
  const remainingReadiness = 100 - readiness
  const etaWeeks = weeklyProgressEst > 0
    ? Math.ceil(remainingReadiness / weeklyProgressEst)
    : null

  // Risk signals
  const risks = []
  if (daysSinceUpdate > 14) risks.push(`Tidak ada aktivitas ${daysSinceUpdate} hari — risiko momentum hilang tinggi`)
  if (readiness < 30 && depthScore < 20) risks.push('Profil belum cukup dalam — prediksi coaching kurang akurat')
  if (plan === 'free' && depthScore > 30) risks.push('User engaged tapi masih free — peluang konversi premium tinggi')
  if (doneSteps === 0 && totalSteps > 0) risks.push('Belum ada satu pun GPS step selesai — butuh quick win segera')

  // Momentum signals
  const momentum = []
  if (daysSinceUpdate <= 3) momentum.push('User aktif — momentum sedang tinggi, manfaatkan')
  if (doneSteps > 0) momentum.push(`${doneSteps}/${totalSteps} GPS step selesai (${progressPct}%) — ada traction`)
  if (depthScore >= 30) momentum.push(`Depth score ${depthScore}% — Diah Anna sudah cukup mengenal user ini`)

  const etaText = etaWeeks
    ? `Estimasi capai target: ~${etaWeeks} minggu dengan konsistensi saat ini`
    : 'Estimasi belum bisa dihitung — user perlu lebih aktif'

  return `# BRAIN 5 — PREDICTION
${etaText}
${risks.length > 0 ? `\nRISIKO:\n${risks.map(r => `- ${r}`).join('\n')}` : ''}
${momentum.length > 0 ? `\nMOMENTUM:\n${momentum.map(m => `- ${m}`).join('\n')}` : ''}

Gunakan prediksi ini untuk proaktif — jangan tunggu user tanya, gunakan sinyal ini untuk mengarahkan percakapan.`
}

const USER_STATE_INSTRUCTIONS = {
  free: `
User ini pakai paket FREE. Tab yang dia punya: Home, Chat, DNA, Profil. Journey dan Peluang belum terbuka.

PERSUASI PREMIUM:
Kamu punya intuisi kapan momen yang tepat untuk hint tentang premium — saat user stuck, saat ada hambatan yang butuh coaching lebih dalam, saat momentum tinggi. Kalau momennya tepat, selipkan 1 kalimat hint yang terasa natural dan genuine di akhir respons. Jangan sebut "upgrade" atau "premium" secara eksplisit — cukup hint bahwa ada yang bisa dieksplorasi lebih dalam bersama.

Kalau kamu melakukan hint itu, tambahkan [UPGRADE] di baris paling terakhir responsmu — setelah semua kalimat selesai, bukan di tengah.
`,
  premium: `
User ini pakai paket PREMIUM. Semua fitur terbuka: Journey, Peluang, CV Review, ATS, Mock Interview. Fokus pada eksekusi dan progress nyata.
`
}

const RESPONSE_FRAMEWORK = `
Sebelum menjawab, kamu wajib memproses framework ini:
1. Target & Emotional Driver user.
2. Progress & Streak kesiapan saat ini.
3. Hambatan terbesar (Current Gap).
4. Menyediakan Next Focus yang clear.

Setiap chat dari kamu harus membawa user satu langkah lebih dekat ke aksi nyata.
`

// ── CV MAKER FORMATS ──────────────────────────────────────────────────────────
const CV_FORMAT_PROMPTS = {
  ats: {
    label: 'ATS Friendly',
    system: `Kamu adalah Diah Anna, career companion Verneks yang juga spesialis menulis CV ATS-friendly. Follow standar parsers industri. Output Markdown langsung tanpa intro.`,
  },
  jobstreet: {
    label: 'JobStreet Friendly',
    system: `Kamu adalah Diah Anna, career companion Verneks yang juga spesialis menulis CV JobStreet Indonesia. Output Markdown langsung tanpa intro.`,
  },
  linkedin: {
    label: 'LinkedIn Profile',
    system: `Kamu adalah Diah Anna, career companion Verneks yang juga spesialis LinkedIn personal branding. Output Markdown langsung dengan label jelas tanpa intro.`,
  },
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action = 'chat' } = req.body

  // [PARSING & DATA MANAGEMENT ACTIONS]
  if (action === 'parse-cv') {
    const { base64, fileName } = req.body
    if (!base64) return res.status(400).json({ error: 'File tidak ditemukan.' })
    try {
      const buffer = Buffer.from(base64, 'base64')
      const ext = (fileName || '').toLowerCase().split('.').pop()
      if (ext === 'docx') {
        const mammoth = await import('mammoth')
        const { value } = await mammoth.extractRawText({ buffer })
        return res.status(200).json({ text: value.trim() })
      }
      if (ext === 'pdf') {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        return res.status(200).json({ text: data.text.trim() })
      }
      return res.status(400).json({ error: 'Format tidak didukung. Gunakan PDF atau DOCX.' })
    } catch (error) {
      console.error('[parse-cv] error:', error)
      return res.status(500).json({ error: 'Gagal membaca file.' })
    }
  }

  if (action === 'cv-review') {
    const { cvText, jobTarget, userId } = req.body
    if (!cvText || cvText.trim().length < 50) return res.status(400).json({ error: 'CV terlalu pendek.' })
    const plan = await getRealPlan(userId)
    const usage = await checkAndLogUsage(userId, plan, 'cv-review')
    if (!usage.allowed) return res.status(403).json({ error: 'Kuota CV Review habis.', limitReached: true })
    try {
      const review = await generateText({
        system: `${CORE_PERSONA}\nMereview CV dengan format ringkas tepat sasaran, tanpa kalimat pembuka generik.`,
        prompt: `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Ini CV saya:\n\n${cvText.slice(0, 4000)}`,
        maxTokens: 700,
        tier: 'smart',
        plan,
      })
      return res.status(200).json({ review })
    } catch (error) {
      return res.status(500).json({ error: 'Diah Anna lagi sibuk, coba lagi ya!' })
    }
  }

  if (action === 'ats') {
    const { cvText, jobDescription, userId } = req.body
    if (!cvText || cvText.trim().length < 50) return res.status(400).json({ error: 'CV terlalu pendek.' })
    const plan = await getRealPlan(userId)
    const usage = await checkAndLogUsage(userId, plan, 'ats')
    if (!usage.allowed) return res.status(403).json({ error: 'Kuota ATS Checker habis.', limitReached: true })
    try {
      const result = await generateText({
        system: `${CORE_PERSONA}\nAnalisis kedekatan kecocokan dokumen dengan ATS template system.`,
        prompt: `${jobDescription ? `Job Description Target:\n${jobDescription}\n\n` : ''}CV saya:\n\n${cvText.slice(0, 4000)}`,
        maxTokens: 1000,
        tier: 'smart',
        plan,
      })
      return res.status(200).json({ result })
    } catch (error) {
      return res.status(500).json({ error: 'Diah Anna lagi sibuk!' })
    }
  }

  if (action === 'mock-interview') {
    const { subAction, position, level, messages, questionNumber, totalQuestions = 6, userId } = req.body
    const interviewPersona = `Kamu adalah Diah Anna, Companion Verneks melakukan interview simulasi. Proaktif dan evaluatif.`
    try {
      if (subAction === 'start') {
        const plan = await getRealPlan(userId)
        const usage = await checkAndLogUsage(userId, plan, 'interview')
        if (!usage.allowed) return res.status(403).json({ error: 'Kuota habis.', limitReached: true })
        const reply = await generateText({
          system: interviewPersona,
          prompt: `Mulai mock interview untuk posisi ${position} level ${level}. Ajukan Pertanyaan 1 secara langsung.`,
          maxTokens: 300,
          tier: 'fast',
          plan,
        })
        return res.status(200).json({ reply, questionNumber: 1 })
      }
      if (subAction === 'answer') {
        const plan = await getRealPlan(userId)
        const isLastQuestion = questionNumber >= totalQuestions
        const nextAction = isLastQuestion ? `Evaluasi final.` : `Berikan feedback ringkas lalu berikan Pertanyaan ${questionNumber + 1}`
        const reply = await generateChat({
          system: `${interviewPersona} Posisi: ${position}, Level: ${level}.`,
          messages: [...(messages || []), { role: 'user', content: nextAction }],
          maxTokens: 350,
          tier: 'fast',
          plan,
        })
        return res.status(200).json({ reply, questionNumber: questionNumber + 1, isComplete: isLastQuestion })
      }
      // Feedback handler
      return res.status(400).json({ error: 'subAction tidak valid.' })
    } catch (error) {
       return res.status(500).json({ error: 'Terjadi kendala interview.' })
    }
  }

  if (action === 'cv-maker') {
    const { mode, format, cvText, formData, jobTarget, userId } = req.body
    if (!format || !CV_FORMAT_PROMPTS[format]) return res.status(400).json({ error: 'Format tidak valid.' })
    const plan = await getRealPlan(userId)
    const usage = await checkAndLogUsage(userId, plan, 'cv-maker')
    if (!usage.allowed) return res.status(403).json({ error: 'Kuota habis.', limitReached: true })
    try {
      const fmt = CV_FORMAT_PROMPTS[format]
      let prompt = mode === 'optimize' 
        ? `Optimasi CV berikut menjadi format ${fmt.label}:\n\n${cvText.slice(0, 4000)}`
        : `Buat CV dari data mentah: ${JSON.stringify(formData)}`;
      const result = await generateText({ system: fmt.system, prompt, maxTokens: 1500, tier: 'smart', plan })
      return res.status(200).json({ result })
    } catch (error) {
      return res.status(500).json({ error: 'Gagal membuat CV.' })
    }
  }

  if (action === 'save-session-note') {
    const { userId, messages: sessionMsgs } = req.body
    if (!userId || !sessionMsgs?.length) return res.status(200).json({ skipped: true })
    if (sessionMsgs.filter(m => m.role === 'user').length < 2) return res.status(200).json({ skipped: true })
    try {
      const summary = await generateText({
        system: `Meringkas esensi obrolan coaching Diah Anna ke dalam 1-2 kalimat deskriptif aksi. Tanpa preamble.`,
        prompt: sessionMsgs.map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content || m.text || ''}`).join('\n').slice(0, 3000),
        maxTokens: 120,
        tier: 'fast',
      })
      await supabase.from('user_session_notes').insert({ user_id: userId, summary: summary.trim() })
      return res.status(200).json({ success: true })
    } catch (error) {
      return res.status(200).json({ skipped: true })
    }
  }

  if (action === 'toggle-milestone') {
    const { userId, stepIndex, done } = req.body
    if (!userId || stepIndex == null) return res.status(400).json({ error: 'Data tidak lengkap.' })
    try {
      const { data: profile } = await supabase.from('user_career_profiles').select('gps_steps').eq('user_id', userId).maybeSingle()
      const steps = profile?.gps_steps || []
      if (!steps[stepIndex]) return res.status(400).json({ error: 'Step tidak ditemukan.' })
      steps[stepIndex] = { ...steps[stepIndex], done }
      await supabase.from('user_career_profiles').update({ gps_steps: steps, last_updated: new Date().toISOString() }).eq('user_id', userId)
      if (done) {
        await supabase.from('career_events').insert({ user_id: userId, event_type: 'milestone_completed', event_payload: { title: steps[stepIndex].title, step_index: stepIndex } })
      }
      return res.status(200).json({ success: true, steps })
    } catch (error) {
      return res.status(500).json({ error: 'Gagal update milestone.' })
    }
  }

  // ════════════════════════════════════════════
  // FETCH BASE MEMORY DATA & SUBSCRIPTION CHECK
  // ════════════════════════════════════════════
  const { userId } = req.body
  const plan = await getRealPlan(userId)

  let careerProfile = null
  let growthState   = null
  let genomeData    = null
  let sessionNotes  = []
  let recentMilestones = []
  let activeDashboardMission = null
  let learnedPatterns = []      // [RSI] Pola yang sudah dipelajari AI
  let rsiVersion = 1            // [RSI] Versi model mental AI tentang user

  if (userId) {
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const [profileRes, growthRes, genomeRes, capsuleRes, eventsRes, dashboardRes, patternsRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle(),
        // Ambil capsule kemarin saja (bukan semua history) — hemat token
        supabase.from('memory_capsule_log').select('capsule_text, capsule_date').eq('user_id', userId).eq('capsule_date', yesterday).maybeSingle(),
        supabase.from('career_events').select('event_type, event_payload, created_at').eq('user_id', userId).eq('event_type', 'milestone_completed').order('created_at', { ascending: false }).limit(3),
        supabase.from('dashboard_missions').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        // [RSI] Ambil pola yang sudah dipelajari
        supabase.from('ai_learned_patterns').select('id, pattern_category, pattern_description, confidence_score, occurrence_count, last_observed_at').eq('user_id', userId).order('confidence_score', { ascending: false }).limit(10),
      ])

      careerProfile          = profileRes.data
      growthState            = growthRes.data
      genomeData             = genomeRes.data
      sessionNotes           = capsuleRes.data ? [{ summary: capsuleRes.data.capsule_text }] : []
      recentMilestones       = eventsRes.data || []
      activeDashboardMission = dashboardRes.data
      learnedPatterns        = patternsRes.data || []
      rsiVersion             = careerProfile?.rsi_version || 1
    } catch (e) {
      console.error('[career-coach] load error:', e.message)
    }
  }

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
  const skillGapsArr = Array.isArray(rawSkillGaps) ? rawSkillGaps : (rawSkillGaps && typeof rawSkillGaps === 'object' ? Object.values(rawSkillGaps) : [])
  const gpsSteps = growthState?.gps_steps || careerProfile?.gps_steps || []

  // Normalisasi data memori murni untuk Next Focus Engine
  const structuralMemory = {
    name: careerProfile?.nama || 'Rekan',
    target_position: careerProfile?.target_posisi || 'Belum ditentukan',
    target_reason: careerProfile?.target_reason || careerProfile?.motivasi || 'Belum diketahui',
    current_focus: growthState?.current_focus || careerProfile?.current_focus,
    skill_gaps: skillGapsArr,
    next_milestone: growthState?.next_milestone || careerProfile?.next_milestone,
    gps_steps: gpsSteps,
    streak_days: growthState?.streak_days || 0,
    progress_percentage: growthState?.progress_percent || careerProfile?.career_readiness || 0,
    // FIX: running_insight ditulis oleh weekly-review.js ke user_career_profiles,
    // BUKAN ke user_growth_state. Sumber lama (growthState) selalu null.
    running_insight: careerProfile?.running_insight || null
  }

  // [RSI] Format pola yang dipelajari menjadi konteks untuk AI
  const rsiPatternsBlock = learnedPatterns.length > 0 ? `
# POLA YANG SUDAH AKU PELAJARI TENTANG KAMU (RSI v${rsiVersion})
${learnedPatterns.map((p, i) => `${i + 1}. ${p.pattern_category}: ${p.pattern_description} (Keyakinan: ${p.confidence_score}%, muncul ${p.occurrence_count}x)`).join('\n')}
` : ''

  // ════════════════════════════════════════════
  // ACTION: INIT CHAT (GENERASI PROACTIVE GREETING V2)
  // ════════════════════════════════════════════
  if (action === 'init-chat') {
    try {
      const coaching = generateDailyCoaching(structuralMemory, activeDashboardMission);

      let openingMessage = `Halo ${structuralMemory.name} 👋\n\n`;
      openingMessage += `Aku masih ingat tujuan besarmu:\n${structuralMemory.target_position}.\n`;
      // FIX: target_reason (emotional driver dari onboarding) sekarang ikut ditampilkan,
      // sebelumnya dikumpulkan tapi tidak pernah dipakai di greeting.
      if (structuralMemory.target_reason && structuralMemory.target_reason !== 'Belum diketahui') {
        openingMessage += `Karena ${structuralMemory.target_reason}.\n`;
      }
      openingMessage += `\n`;
      openingMessage += `🔥 Kamu sudah konsisten selama ${structuralMemory.streak_days} hari.\n`;
      openingMessage += `📈 Progress kesiapanmu saat ini ${structuralMemory.progress_percentage}%.\n\n`;
      openingMessage += `🎯 Fokus terpenting saat ini:\n${coaching.daily_focus}.\n\n`;
      openingMessage += `${coaching.daily_reason}\n\n`;

      if (structuralMemory.running_insight) {
        openingMessage += `💡 Yang aku pelajari tentangmu:\n${structuralMemory.running_insight}\n\n`;
      }

      openingMessage += `${coaching.daily_question}`;

      return res.status(200).json({ success: true, openingMessage });
    } catch (error) {
      console.error('[init-chat] error:', error);
      return res.status(500).json({ error: 'Gagal inisialisasi panduan Diah Anna.' });
    }
  }

  // ════════════════════════════════════════════
  // ACTION: CHAT (DEFAULT PROCESSOR)
  // ════════════════════════════════════════════
  const { messages: rawMessages } = req.body
  
  // [OPTIMIZATION #3] Compress conversation history — hemat token
  const compressedMessages = compressConversationHistory(rawMessages || [], 8)
  const messages = compressedMessages.slice(-12)

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  const usage = await checkAndLogUsage(userId, plan, 'chat')
  if (!usage.allowed) return res.status(403).json({ error: 'Kuota chat hari ini sudah habis.', limitReached: true })

  // [OPTIMIZATION #1] Check cache for duplicate questions — hemat ~30%
  const currentUserMsg = messages[messages.length - 1]?.content || ''
  const msgHash = hashMessage(currentUserMsg)
  const cachedResponse = getCachedResponse(msgHash)
  
  if (cachedResponse) {
    console.log('[OPTIMIZATION] Cache hit — skip AI call')
    return res.status(200).json({ reply: cachedResponse, cached: true })
  }

  // [OPTIMIZATION #2] Rule-based response fallback — hemat ~25%
  const ruleBasedResponse = matchRuleBasedResponse(currentUserMsg, careerProfile)
  if (ruleBasedResponse) {
    console.log('[OPTIMIZATION] Rule-based response matched — skip AI call')
    setCachedResponse(msgHash, ruleBasedResponse)
    return res.status(200).json({ reply: ruleBasedResponse, ruleBased: true })
  }

  // ── Deep memory blocks (dari update-memory.js) ───────────────────────────
  const diahAnnaMemory   = careerProfile?.diah_anna_memory   || null
  const userDepthProfile = careerProfile?.user_depth_profile || {}
  const depthScore       = careerProfile?.depth_score        || 0

  const deepMemoryBlock = diahAnnaMemory ? `
# APA YANG KAMU INGAT TENTANG USER INI
${diahAnnaMemory}
` : ''

  const depthProfileBlock = depthScore > 0 ? `
# POLA MENDALAM USER (depth score: ${depthScore}/100)
Gaya coaching yang cocok: ${userDepthProfile.coach_style_fit || 'belum terdeteksi'}
Kondisi emosi terakhir: ${userDepthProfile.last_emotional_state || 'tidak diketahui'}
Yang memotivasi: ${(userDepthProfile.emotional_triggers?.motivators || []).join(', ') || '-'}
Yang menghambat: ${(userDepthProfile.emotional_triggers?.blockers || []).join(', ') || '-'}
Tema berulang: ${(userDepthProfile.recurring_themes || []).join(', ') || '-'}
` : ''

  const memoryContext = `
# MEMORY CONTEXT (Data Real-time User)
Nama: ${structuralMemory.name}
Target Karier: ${structuralMemory.target_position}
Alasan Emosional/Motivasi: ${structuralMemory.target_reason}
Posisi Saat Ini: ${careerProfile?.posisi_saat_ini || 'Belum ditentukan'}
Industri: ${careerProfile?.industri || 'Belum ditentukan'}
Hambatan Utama: ${careerProfile?.hambatan || 'Belum ditentukan'}
Skill Gap Utama: ${structuralMemory.skill_gaps.join(', ') || 'Belum terdeteksi'}
Career Readiness: ${structuralMemory.progress_percentage}%
Current Focus: ${structuralMemory.current_focus || 'Belum ditentukan'}
Next Milestone: ${structuralMemory.next_milestone || 'Belum ditentukan'}
Top Genome Dimensions: ${topGenomeDimensions}
${sessionNotes.length > 0 ? `\nCatatan Sesi Sebelumnya:\n${sessionNotes.map(n => `- ${n.summary}`).join('\n')}` : ''}
${recentMilestones.length > 0 ? `\nMilestone Baru Diselesaikan:\n${recentMilestones.map(m => `- ${m.event_payload?.title}`).join('\n')}` : ''}
${deepMemoryBlock}${depthProfileBlock}${rsiPatternsBlock}`

  try {
    const systemContent = `
${CORE_PERSONA}

${COACHING_BRAIN}

${STRATEGY_BRAIN(
  growthState?.career_stage || careerProfile?.career_stage || 'Career Builder',
  structuralMemory.gps_steps,
  structuralMemory.current_focus,
  structuralMemory.next_milestone,
  careerProfile?.last_updated
)}

${PREDICTION_BRAIN(
  careerProfile?.career_readiness || growthState?.progress_percent || 0,
  depthScore,
  careerProfile?.last_updated,
  structuralMemory.gps_steps,
  plan
)}

# PLAN USER SAAT INI: ${plan === 'premium' ? 'PREMIUM — punya akses Journey, Peluang, semua fitur' : 'FREE — hanya punya tab Home, Chat, DNA, Profil. Belum punya akses Journey dan Peluang.'}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Integrasikan seluruh fakta memori di atas secara mengalir tanpa menggunakan kalimat template kaku. JANGAN beralih menjadi pasif atau melemparkan kendali obrolan kembali kepada user tanpa memberikan value tindakan/opini yang solid.
${diahAnnaMemory ? `\nKamu sudah mengenal user ini dengan baik (depth score: ${depthScore}/100). Gunakan pengetahuan personalmu tentang mereka — cara komunikasi mereka, apa yang memotivasi dan menghambat mereka — untuk membuat respons terasa seperti dari seseorang yang benar-benar mengenal mereka, bukan AI generik.` : ''}
${learnedPatterns.length > 0 ? `\n\n[RSI ACTIVE] Kamu sudah belajar dari ${learnedPatterns.length} pola perilaku user ini. Gunakan wawasan ini untuk menyesuaikan gaya komunikasimu. Versi model mentalmu tentang user ini adalah v${rsiVersion}.` : ''}
`

    // ═══════════════════════════════════════════════════════════════════════════
    // FIX #1: SMART TIER ROUTING — Hemat 40-50% cost untuk free users
    // Routing dinamis: gunakan Haiku (cheap) untuk short convos, Sonnet untuk complex
    // ═══════════════════════════════════════════════════════════════════════════
    const shouldUseSmart = 
      messages.length > 10 ||  // Very long conversation = butuh context + nuance
      /bingung|stuck|dilema|keputusan|sulit|ragu|ambiguous|complicated|depresi|ansietas/i.test(messages[messages.length-1]?.content || '') ||  // High emotional complexity only
      depthScore > 75         // Only well-known users with high trust get smart tier
    
    const optimalTier = shouldUseSmart ? 'smart' : 'fast'
    
    const rawReply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 900,  // Increased from 700 to prevent truncation for long responses
      tier: optimalTier,
      plan,
    })

    // Strip semua varian marker persuasi
    const persuasiAktif = /\[UPGRADE\]|\[PERSUASI_AKTI[FV]\]/i.test(rawReply)
    const reply = rawReply.replace(/\[UPGRADE\]|\[PERSUASI_AKTI[FV]\]/gi, '').trim()

    // [OPTIMIZATION #5] Cache AI response for future duplicate questions
    setCachedResponse(msgHash, reply)

    // ═══════════════════════════════════════════════════════════════════════════
    // FIX #2: RSI SMART SAMPLING — Hemat 60-70% dari RSI API calls
    // Hanya analyze kalau ada signal meaningful (emotional trigger, decision point, dll)
    // ═══════════════════════════════════════════════════════════════════════════
    const userMsgCount = messages.filter(m => m.role === 'user').length
    
    // Detect meaningful signals dalam pesan user
    const hasEmotionalSignal = /bingung|stuck|tidak tahu|ga yakin|ragu|susah|dilema|ambiguous|hambatan|masalah|keputusan|pilih|gimana|sebaiknya/i.test(currentUserMsg)
    
    // [OPTIMIZATION #6] RSI ON-DEMAND ONLY — hanya trigger untuk breakthrough moments
    // Tidak lagi automatic setiap 5 pesan, hanya saat ada emotional signal ATAU conversation sangat panjang
    if (userId && messages.length >= 6 && (hasEmotionalSignal || userMsgCount % 8 === 0)) {
      analyzeAndLearnPatterns(userId, messages, rawReply, careerProfile, learnedPatterns, rsiVersion, supabase).catch(e =>
        console.error('[RSI] Background analysis error:', e.message)
      )
    }

    return res.status(200).json({ reply, persuasiAktif })
  } catch (error) {
    console.error('[career-coach] chat error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi bersiap, tunggu sebentar ya!' })
  }
}
