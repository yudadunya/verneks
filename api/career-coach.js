import { generateText, generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
      prompt: `Profil User: ${careerProfile?.nama || 'Unknown'}, Target: ${careerProfile?.target_posisi || 'Unknown'}\n\nRiwayat Percakapan:\n${userMessages.slice(0, 3000)}\n\nRespons AI:\n${aiResponse.slice(0, 1000)}\n\nAnalisis apakah ada pola baru yang bisa dipelajari atau pola lama yang perlu disesuaikan confidence-nya.`,
      maxTokens: 1500,
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
  const messages = (rawMessages || []).slice(-16)

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  const usage = await checkAndLogUsage(userId, plan, 'chat')
  if (!usage.allowed) return res.status(403).json({ error: 'Kuota chat hari ini sudah habis.', limitReached: true })

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

# PLAN USER SAAT INI: ${plan === 'premium' ? 'PREMIUM — punya akses Journey, Peluang, semua fitur' : 'FREE — hanya punya tab Home, Chat, DNA, Profil. Belum punya akses Journey dan Peluang.'}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Integrasikan seluruh fakta memori di atas secara mengalir tanpa menggunakan kalimat template kaku. JANGAN beralih menjadi pasif atau melemparkan kendali obrolan kembali kepada user tanpa memberikan value tindakan/opini yang solid.
${diahAnnaMemory ? `\nKamu sudah mengenal user ini dengan baik (depth score: ${depthScore}/100). Gunakan pengetahuan personalmu tentang mereka — cara komunikasi mereka, apa yang memotivasi dan menghambat mereka — untuk membuat respons terasa seperti dari seseorang yang benar-benar mengenal mereka, bukan AI generik.` : ''}
${learnedPatterns.length > 0 ? `\n\n[RSI ACTIVE] Kamu sudah belajar dari ${learnedPatterns.length} pola perilaku user ini. Gunakan wawasan ini untuk menyesuaikan gaya komunikasimu. Versi model mentalmu tentang user ini adalah v${rsiVersion}.` : ''}
`

    const rawReply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 900,
      tier: 'smart',
      plan,
    })

    // Strip semua varian marker persuasi
    const persuasiAktif = /\[UPGRADE\]|\[PERSUASI_AKTI[FV]\]/i.test(rawReply)
    const reply = rawReply.replace(/\[UPGRADE\]|\[PERSUASI_AKTI[FV]\]/gi, '').trim()

    // [RSI] Trigger background analisis pola — hanya setiap 5 pesan user (hemat API)
    // Tidak di-await agar tidak memperlambat respons chat
    const userMsgCount = messages.filter(m => m.role === 'user').length
    if (userId && userMsgCount >= 3 && userMsgCount % 5 === 0) {
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
