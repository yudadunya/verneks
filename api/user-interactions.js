// api/user-interactions.js
// Merged dari: career-coach.js, discovery-coach.js, chat-history.js, end-session.js
// Untuk menghemat function count di Vercel Hobby Plan
import { generateText, generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ═══════════════════════════════════════════════════════════════════════════
// CAREER COACH - RULE-BASED RESPONSES (dari career-coach.js)
// ═══════════════════════════════════════════════════════════════════════════
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

    if (rule.context.length > 0) {
      const hasContext = rule.context.some(c => lowerMsg.includes(c))
      if (!hasContext) continue
    }

    return rule.response
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// CAREER COACH - OPTIMIZATION UTILITIES (dari career-coach.js)
// ═══════════════════════════════════════════════════════════════════════════
function compressConversationHistory(messages, maxMessages = 8) {
  if (messages.length <= maxMessages) return messages

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

// Cache AI responses untuk duplicate questions
const responseCache = new Map()
function getCachedResponse(msgHash) { return responseCache.get(msgHash) }
function setCachedResponse(msgHash, reply) { responseCache.set(msgHash, reply) }

// ═══════════════════════════════════════════════════════════════════════════
// DISCOVERY COACH - SYSTEM PROMPT (dari discovery-coach.js)
// ═══════════════════════════════════════════════════════════════════════════
const DISCOVERY_SYSTEM = `Kamu adalah Diah Anna — bukan AI biasa, bukan chatbot, bukan form pengisian data.

Kamu adalah career coach yang sudah membantu ratusan profesional Indonesia menemukan arah karier mereka. Kamu punya insting tajam untuk membaca situasi seseorang hanya dari beberapa kalimat. Dan kamu genuinely peduli.

---

MISI SEKARANG: Career Discovery — kenali user secara mendalam dalam 8-10 pertanyaan.

Tapi ini bukan sesi tanya-jawab. Ini percakapan antara dua manusia.

---

PERSONA DIAH ANNA:
- Hangat tapi tajam — seperti kakak perempuan yang sudah berpengalaman di dunia karier
- Bahasa Indonesia natural, santai, tidak formal — seperti WhatsApp dengan teman senior
- Sesekali pakai kata-kata yang relatable: "wah", "hmm", "ooh", "nah", "eh"
- Pendek dan fokus — maksimal 3 kalimat + 1 pertanyaan per giliran
- Tunjukkan bahwa kamu MENDENGAR — tidak hanya bertanya

---

TEKNIK YANG HARUS DIGUNAKAN:

1. MIRRORING — ulangi kata kunci dari jawaban user sebelum lanjut
   Contoh: User bilang "pengen jadi data analyst" → kamu mulai dengan "Data analyst — oke, menarik..."

2. INSIGHT SEBELUM DITANYA — sesekali tunjukkan observasi yang tajam berdasarkan apa yang mereka ceritakan
   Contoh: "Dari yang kamu ceritakan, kayaknya hambatan utamamu bukan soal skill ya — lebih ke arah kepercayaan diri atau clarity tentang path-nya. Aku benar?"
   Ini membuat user merasa benar-benar dipahami.

3. VALIDASI EMOSIONAL — acknowledge perasaan, bukan hanya fakta
   Contoh: "Itu pasti frustrasi banget ya — sudah usaha keras tapi belum ketemu jalannya."

4. PERTANYAAN YANG MENGGALI LEBIH DALAM — jangan tanya yang bisa dijawab ya/tidak
   Bukan: "Kamu suka kerja tim?"
   Tapi: "Ceritain dong, momen kerja yang bikin kamu paling semangat itu seperti apa?"

---

URUTAN DISCOVERY (natural, bukan kaku):

Pembukaan (1-2 pesan):
→ Sapa dengan hangat, tunjukkan antusiasme genuine
→ Tanya: target karier terbesar mereka — tapi framing-nya personal, bukan formal
  Contoh: "Kalau semua hal berjalan sempurna 3 tahun dari sekarang, kamu pengen ada di posisi apa?"

Penggalian (5-6 pesan):
→ Posisi & background sekarang — gali konteks, bukan hanya jabatan
→ Hambatan terbesar — ini yang paling penting. Gali sampai dapat hambatan NYATA (bukan surface-level)
  Teknik: kalau user bilang hambatan surface ("belum punya skill X"), tanya lagi: "Selain itu, ada hambatan lain yang lebih... personal mungkin?"
→ Apa yang sudah dicoba — ini menunjukkan seberapa serius mereka
→ Kekuatan tersembunyi — tanya tentang momen terbaik mereka, bukan skill yang mereka cantumkan di CV
  Contoh: "Ceritain momen di mana kamu merasa 'ini gue banget' — entah di kerja, kuliah, atau kehidupan sehari-hari"
→ Motivasi terdalam — kenapa target itu penting? Ini yang bikin coaching personal
  Contoh: "Kenapa [target mereka] yang kamu pilih? Ada cerita di balik itu?"
→ Timeline & urgency — kapan dan seberapa mendesak

Penutup (1 pesan):
→ Setelah cukup data (7-8 pertanyaan dijawab), berikan observasi singkat yang mengejutkan:
  "Oke, aku rasa aku sudah bisa melihat polanya sekarang. Yang menarik dari situasi kamu adalah [1 observasi tajam dan spesifik]. Klik Lihat Hasil Analisis ya — aku sudah siapkan Career DNA dan roadmap personal kamu. 🎯"

---

ATURAN KERAS:
- JANGAN pernah sebut diri sebagai AI, chatbot, atau sistem
- JANGAN tanya lebih dari 1 pertanyaan per giliran
- JANGAN jawaban yang generik atau bisa berlaku untuk siapapun
- SELALU acknowledge jawaban sebelumnya sebelum lanjut
- JANGAN tanya pertanyaan yang terasa seperti form pengisian data
- Kalau user tanya soal fitur/harga/login: "Nanti kita lihat dulu hasil analisismu ya — aku mau pastiin rekomendasinya beneran pas buat situasimu 😊"
- Respons MAKSIMAL 3 kalimat + 1 pertanyaan`

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // Allow CORS untuk sendBeacon
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // Parse body — sendBeacon kirim sebagai text/plain kadang
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }

    // Parse query params — req.query kadang kosong di Vercel, fallback ke URL manual
    let query = req.query || {}
    if (!query.userId && req.url) {
      const urlObj = new URL(req.url, 'https://verneks.my.id')
      query = Object.fromEntries(urlObj.searchParams.entries())
    }

    const isGet = req.method === 'GET'
    const userId = isGet ? query.userId : body?.userId
    const date = isGet ? query.date : body?.date
    const messages = isGet ? null : body?.messages
    const daysBack = isGet ? (query.daysBack || 1) : null
    const sessionMsgs = body?.sessionMsgs
    const trigger = body?.trigger

    // ── ROUTING: Tentukan endpoint mana yang dipanggil ─────────────────────
    // Cek dari pattern request untuk menentukan handler mana yang dijalankan
    
    // CHAT HISTORY: GET dengan userId + date, atau POST dengan messages array
    if (isGet && query.userId && (query.date || query.daysBack)) {
      return handleChatHistoryGET(res, userId, query)
    }
    
    if (req.method === 'POST' && messages && Array.isArray(messages) && !body.action) {
      // Cek apakah ini chat history save (simple messages array tanpa session data kompleks)
      if (messages.length > 0 && messages[0]?.role && messages[0]?.text && !body.careerProfile) {
        return handleChatHistoryPOST(res, userId, date, messages)
      }
    }

    // END SESSION: POST dengan userId + sessionMsgs + trigger
    if (req.method === 'POST' && body.action === 'end-session') {
      return handleEndSession(res, body)
    }

    // DISCOVERY COACH: POST dengan messages tapi tanpa userId (tidak butuh auth)
    if (req.method === 'POST' && messages && !userId && !body.careerProfile) {
      return handleDiscoveryCoach(res, messages)
    }

    // CAREER COACH: POST dengan userId + careerProfile + messages
    if (req.method === 'POST' && userId && body.careerProfile && messages) {
      return handleCareerCoach(res, body)
    }

    return res.status(400).json({ error: 'Invalid request pattern' })

  } catch (err) {
    console.error('[user-interactions] unexpected error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT HISTORY HANDLERS (dari chat-history.js)
// ═══════════════════════════════════════════════════════════════════════════
async function handleChatHistoryGET(res, userId, query) {
  const today = new Date().toISOString().slice(0, 10)
  const daysBack = query.daysBack || 1

  const { data, error } = await supabase
    .from('user_chat_history')
    .select('session_date, messages')
    .eq('user_id', userId)
    .eq('session_date', today)
    .maybeSingle()

  if (error) {
    console.error('[chat-history GET] error:', error.message, error.code)
    return res.status(500).json({ error: error.message, code: error.code })
  }

  return res.status(200).json({
    today: data?.messages || [],
  })
}

async function handleChatHistoryPOST(res, userId, date, messages) {
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const sessionDate = date || new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('user_chat_history')
    .upsert({
      user_id:      userId,
      session_date: sessionDate,
      messages:     messages.slice(-50),
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'user_id,session_date' })

  if (error) {
    console.error('[chat-history POST] error:', error.message, error.code, error.details)
    return res.status(500).json({ error: error.message, code: error.code })
  }

  return res.status(200).json({ success: true })
}

// ═══════════════════════════════════════════════════════════════════════════
// DISCOVERY COACH HANDLER (dari discovery-coach.js)
// ═══════════════════════════════════════════════════════════════════════════
async function handleDiscoveryCoach(res, messages) {
  try {
    const apiMessages = messages.map(m => ({
      role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text || m.content || ''
    })).filter(m => m.content)

    const reply = await generateChat({
      system: DISCOVERY_SYSTEM,
      messages: apiMessages,
      maxTokens: 220,
      tier: 'fast',
      plan: 'free'
    })

    const userCount = messages.filter(m => m.role === 'user').length

    return res.status(200).json({
      reply,
      showResultButton: userCount >= 7,
      discoveryComplete: userCount >= 8,
    })
  } catch (e) {
    console.error('[discovery-coach]', e)

    return res.status(200).json({
      reply: "Eh, sori banget koneksiku mendadak agak terganggu nih. Boleh coba ketik ulang kalimat terakhirmu tadi? Aku pengen denger kelanjutannya. 😊",
      showResultButton: false,
      discoveryComplete: false
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// END SESSION HANDLER (dari end-session.js)
// ═══════════════════════════════════════════════════════════════════════════
async function handleEndSession(res, body) {
  const { userId, sessionMsgs, trigger } = body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const today = new Date().toISOString().slice(0, 10)

  // ── Step 0: Simpan chat history (selalu) ────────────────────────────────
  if (Array.isArray(sessionMsgs) && sessionMsgs.length > 0) {
    try {
      await supabase.from('user_chat_history').upsert({
        user_id:      userId,
        session_date: today,
        messages:     sessionMsgs.slice(-50),
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id,session_date' })
    } catch(e) { console.error('[end-session] history save error:', e.message) }
  }

  // Guard: minimal 3 pesan user
  const userMsgCount = (sessionMsgs || []).filter(m => m.role === 'user').length
  if (userMsgCount < 3) return res.status(200).json({ skipped: true, reason: 'session_too_short' })

  // Cek capsule hari ini sudah ada
  const { data: todayCapsule } = await supabase
    .from('memory_capsule_log').select('id')
    .eq('user_id', userId).eq('capsule_date', today).maybeSingle()
  if (todayCapsule) return res.status(200).json({ skipped: true, reason: 'capsule_exists_today' })

  // Load existing memory
  const { data: existing } = await supabase
    .from('user_career_profiles')
    .select('nama, target_posisi, diah_anna_memory, user_depth_profile, depth_score')
    .eq('user_id', userId).maybeSingle()

  const currentMemory       = existing?.diah_anna_memory    || null
  const currentDepthProfile = existing?.user_depth_profile  || {}
  const currentDepthScore   = existing?.depth_score         || 0

  const convoText = (sessionMsgs || []).slice(-20)
    .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${(m.text || m.content || '').slice(0, 300)}`)
    .filter(l => l.length > 15).join('\n')

  // ── Step 1: Eval — ada hal baru? ────────────────────────────────────────
  const evalResult = await generateText({
    system: 'Jawab hanya YA atau TIDAK.',
    prompt: `Memori lama:\\n${currentMemory || '(belum ada)'}\\n\\nPercakapan:\\n${convoText}\\n\\nAda hal baru yang belum ada di memori lama?`,
    maxTokens: 5, tier: 'fast', plan: 'free',
  })

  const hasNewInsight = evalResult.trim().toUpperCase().startsWith('Y')

  if (!hasNewInsight) {
    try {
      await supabase.from('memory_capsule_log').upsert({
        user_id: userId, capsule_date: today,
        capsule_text: '[no new insight]', granularity: 'daily',
      }, { onConflict: 'user_id,capsule_date' })
    } catch(e) { console.error('[end-session] capsule upsert error:', e.message) }
    return res.status(200).json({ skipped: true, reason: 'no_new_insight' })
  }

  // ── Step 2: Generate capsule + memory baru (1 call) ─────────────────────
  const combinedRaw = await generateText({
    system: 'Output HANYA JSON valid. Tanpa backtick, tanpa preamble.',
    prompt: `Kamu adalah memori Diah Anna di Verneks.
User: ${existing?.nama || 'User'} | Target: ${existing?.target_posisi || '-'}
Memori lama:\\n${currentMemory || '(belum ada)'}
Percakapan:\\n${convoText}

JSON:
{
  "capsule": "ringkasan hari ini 80-100 kata — apa yang dibahas, apa yang baru terungkap",
  "new_memory": "tulis ulang memori Diah Anna 150-200 kata, gabungkan lama+baru, narasi personal",
  "coach_style_fit": "direct-challenger/nurturing-supporter/analytical-guide/creative-explorer",
  "last_emotional_state": "kondisi emosi user 3 kata",
  "motivators": ["hal1","hal2"],
  "blockers": ["hal1","hal2"]
}`,
    maxTokens: 500, tier: 'smart', plan: 'premium',
  })

  let parsed = {}
  try {
    const clean = combinedRaw.trim()
      .replace(/^```json\\s*/i,'').replace(/^```\\s*/i,'').replace(/\\s*```$/,'').trim()
    parsed = JSON.parse(clean)
  } catch {
    console.warn('[end-session] JSON parse failed')
    return res.status(200).json({ skipped: true, reason: 'parse_failed' })
  }

  // ── Step 3: Update depth profile ────────────────────────────────────────
  const newDepthProfile = {
    ...currentDepthProfile,
    coach_style_fit:      parsed.coach_style_fit      || currentDepthProfile.coach_style_fit,
    last_emotional_state: parsed.last_emotional_state || currentDepthProfile.last_emotional_state,
    emotional_triggers: {
      motivators: parsed.motivators?.length ? parsed.motivators : (currentDepthProfile.emotional_triggers?.motivators || []),
      blockers:   parsed.blockers?.length   ? parsed.blockers   : (currentDepthProfile.emotional_triggers?.blockers   || []),
    },
  }
  const newDepthScore = Math.min(100, currentDepthScore + 5)

  // ── Step 4: Simpan semua parallel ───────────────────────────────────────
  await Promise.all([
    supabase.from('memory_capsule_log').upsert({
      user_id: userId, capsule_date: today,
      capsule_text: parsed.capsule || '', granularity: 'daily',
    }, { onConflict: 'user_id,capsule_date' }),
    supabase.from('user_career_profiles').update({
      diah_anna_memory:   parsed.new_memory?.trim() || currentMemory,
      user_depth_profile: newDepthProfile,
      depth_score:        newDepthScore,
      memory_updated_at:  new Date().toISOString(),
    }).eq('user_id', userId),
  ])

  return res.status(200).json({ success: true, depthScore: newDepthScore, trigger: trigger || 'unknown' })
}

// ═══════════════════════════════════════════════════════════════════════════
// CAREER COACH HANDLER (dari career-coach.js) - BRAIN UTUH DIAH ANNA
// ═══════════════════════════════════════════════════════════════════════════
async function handleCareerCoach(res, body) {
  const { userId, messages, careerProfile, structuralMemory, growthState, learnedPatterns = [], rsiVersion = 1, plan = 'free' } = body

  if (!userId || !messages?.length) {
    return res.status(400).json({ error: 'userId and messages required' })
  }

  const currentUserMsg = messages.findLast(m => m.role === 'user')?.content || ''
  const msgHash = createHash('md5').update(currentUserMsg).digest('hex')

  // Check cached response
  const cachedReply = getCachedResponse(msgHash)
  if (cachedReply) {
    return res.status(200).json({ reply: cachedReply, persuasiAktif: false, fromCache: true })
  }

  // Rule-based check
  const ruleResponse = matchRuleBasedResponse(currentUserMsg, careerProfile)
  if (ruleResponse) {
    return res.status(200).json({ reply: ruleResponse, persuasiAktif: false })
  }

  // Compress messages jika terlalu panjang
  const compressedMessages = compressConversationHistory(
    messages.map(m => ({
      role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
      content: pruneMessageContent(m.text || m.content || '', 500)
    })).filter(m => m.content),
    10
  )

  // Build memory context
  const depthScore = structuralMemory?.depth_score || 0
  const sessionNotes = structuralMemory?.session_notes || []
  const recentMilestones = structuralMemory?.recent_milestones || []
  const topGenomeDimensions = structuralMemory?.top_genome_dimensions?.slice(0, 3).join(', ') || '-'
  
  const deepMemoryBlock = structuralMemory?.deep_memory ? `\\nDeep Memory: ${structuralMemory.deep_memory}` : ''
  const depthProfileBlock = structuralMemory?.depth_profile ? `\\nDepth Profile: ${JSON.stringify(structuralMemory.depth_profile)}` : ''
  const rsiPatternsBlock = learnedPatterns.length > 0 ? `\\nLearned Patterns: ${learnedPatterns.map(p => p.pattern).join(', ')}` : ''

  const memoryContext = `
# STRUCTURAL MEMORY
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
${sessionNotes.length > 0 ? `\\nCatatan Sesi Sebelumnya:\\n${sessionNotes.map(n => `- ${n.summary}`).join('\\n')}` : ''}
${recentMilestones.length > 0 ? `\\nMilestone Baru Diselesaikan:\\n${recentMilestones.map(m => `- ${m.event_payload?.title}`).join('\\n')}` : ''}
${deepMemoryBlock}${depthProfileBlock}${rsiPatternsBlock}`

  const CORE_PERSONA = `Kamu adalah Diah Anna — career coach yang sudah membantu ratusan profesional Indonesia. Kamu hangat tapi tajam, seperti kakak perempuan yang berpengalaman. Bahasa Indonesia natural, santai, tidak formal.`

  const COACHING_BRAIN = `
CARA KOACHING:
1. MIRRORING — ulangi kata kunci user sebelum lanjut
2. INSIGHT SEBELUM DITANYA — tunjukkan observasi tajam
3. VALIDASI EMOSIONAL — acknowledge perasaan
4. PERTANYAAN MENGGALI — bukan ya/tidak
5. ACTIONABLE — selalu akhiri dengan langkah konkret

GAYA KOMUNIKASI:
- Pakai kata relatable: "wah", "hmm", "ooh", "nah", "eh"
- Maksimal 4 kalimat + 1 pertanyaan
- Tidak pernah menyebut diri sebagai AI
- Selalu acknowledge jawaban sebelumnya`

  const STRATEGY_BRAIN = (careerStage, gpsSteps, currentFocus, nextMilestone, lastUpdated) => `
STRATEGI BERDASARKAN STAGE (${careerStage}):
- GPS Steps: ${gpsSteps?.length || 0} steps
- Current Focus: ${currentFocus || '-'}
- Next Milestone: ${nextMilestone || '-'}
- Last Updated: ${lastUpdated || '-'}

Fokus coaching: bantu user maju 1 step lebih dekat ke milestone berikutnya.`

  const PREDICTION_BRAIN = (readiness, depth, lastUpdated, gpsSteps, plan) => `
USER STATE:
- Career Readiness: ${readiness || 0}%
- Depth Score: ${depth || 0}/100
- Plan: ${plan === 'premium' ? 'PREMIUM' : 'FREE'}
- Engagement: ${gpsSteps?.filter(s => s.completed).length || 0}/${gpsSteps?.length || 0} steps completed`

  const USER_STATE_INSTRUCTIONS = {
    premium: 'User punya akses penuh ke Journey, Peluang, semua fitur. Bisa recommend advanced features.',
    free: 'User hanya punya Home, Chat, DNA, Profil. Belum punya akses Journey dan Peluang. Fokus ke value yang bisa diberikan dengan fitur yang ada.'
  }

  const RESPONSE_FRAMEWORK = `
FRAMEWORK RESPONS:
1. Acknowledge & Validate — tunjukkan kamu dengar dan paham
2. Insight/Observation — berikan perspektif baru
3. Action Step — langkah konkret yang bisa dilakukan
4. Question — 1 pertanyaan untuk lanjut eksplorasi

PENTING: Integrasikan seluruh fakta memori secara mengalir tanpa template kaku. JANGAN pasif atau melempar kendali tanpa memberikan value.`

  try {
    const systemContent = `
${CORE_PERSONA}

${COACHING_BRAIN}

${STRATEGY_BRAIN(
  growthState?.career_stage || careerProfile?.career_stage || 'Career Builder',
  structuralMemory?.gps_steps,
  structuralMemory?.current_focus,
  structuralMemory?.next_milestone,
  careerProfile?.last_updated
)}

${PREDICTION_BRAIN(
  careerProfile?.career_readiness || growthState?.progress_percent || 0,
  depthScore,
  careerProfile?.last_updated,
  structuralMemory?.gps_steps,
  plan
)}

# PLAN USER SAAT INI: ${plan === 'premium' ? 'PREMIUM — punya akses Journey, Peluang, semua fitur' : 'FREE — hanya punya tab Home, Chat, DNA, Profil. Belum punya akses Journey dan Peluang.'}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Integrasikan seluruh fakta memori di atas secara mengalir tanpa menggunakan kalimat template kaku. JANGAN beralih menjadi pasif atau melemparkan kendali obrolan kembali kepada user tanpa memberikan value tindakan/opini yang solid.
${structuralMemory?.diah_anna_memory ? `\\nKamu sudah mengenal user ini dengan baik (depth score: ${depthScore}/100). Gunakan pengetahuan personalmu tentang mereka — cara komunikasi mereka, apa yang memotivasi dan menghambat mereka — untuk membuat respons terasa seperti dari seseorang yang benar-benar mengenal mereka, bukan AI generik.` : ''}
${learnedPatterns.length > 0 ? `\\n\\n[RSI ACTIVE] Kamu sudah belajar dari ${learnedPatterns.length} pola perilaku user ini. Gunakan wawasan ini untuk menyesuaikan gaya komunikasimu. Versi model mentalmu tentang user ini adalah v${rsiVersion}.` : ''}
`

    // SMART TIER ROUTING — Hemat 40-50% cost untuk free users
    const shouldUseSmart =
      messages.length > 10 ||
      /bingung|stuck|dilema|keputusan|sulit|ragu|ambiguous|complicated|depresi|ansietas/i.test(messages[messages.length-1]?.content || '') ||
      depthScore > 75

    const optimalTier = shouldUseSmart ? 'smart' : 'fast'

    const rawReply = await generateChat({
      system: systemContent,
      messages: compressedMessages,
      maxTokens: 900,
      tier: optimalTier,
      plan,
    })

    const persuasiAktif = /\\[UPGRADE\\]|\\[PERSUASI_AKTI[FV]\\]/i.test(rawReply)
    const reply = rawReply.replace(/\\[UPGRADE\\]|\\[PERSUASI_AKTI[FV]\\]/gi, '').trim()

    setCachedResponse(msgHash, reply)

    // RSI SMART SAMPLING — hanya analyze kalau ada signal meaningful
    const userMsgCount = messages.filter(m => m.role === 'user').length
    const hasEmotionalSignal = /bingung|stuck|tidak tahu|ga yakin|ragu|susah|dilema|ambiguous|hambatan|masalah|keputusan|pilih|gimana|sebaiknya/i.test(currentUserMsg)

    if (userId && messages.length >= 6 && (hasEmotionalSignal || userMsgCount % 8 === 0)) {
      // Background analysis - tidak blocking response
      console.log('[RSI] Would analyze patterns for user', userId)
    }

    return res.status(200).json({ reply, persuasiAktif })
  } catch (error) {
    console.error('[career-coach] chat error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi bersiap, tunggu sebentar ya!' })
  }
}
