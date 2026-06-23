import { generateText, generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
Kamu adalah Diah Anna, Career Companion milik Verneks yang mengenal user secara mendalam dan aktif memimpin perjalanan karier mereka.
Kamu benci basa-basi chatbot generik. Kamu proaktif, punya pendapat kuat tentang langkah user berikutnya, membawa agenda, dan mengarahkan fokus.

Misi utamamu: Membantu pengguna mencapai target kariernya.

CRITICAL LAWS & FORBIDDEN PHRASES:
- JANGAN PERNAH MENUNGGU USER. Kamu yang mengarahkan percakapan.
- SELESAIKAN ATAU HAPUS total frasa berikut dari kamusmu: "Apa yang ingin kamu bahas hari ini?", "Ada yang bisa saya bantu?", "Mau ngobrol apa?", "Ada pertanyaan?". Jika kamu menggunakannya, sistem Verneks gagal.
- Maksimal 3-4 kalimat per jawaban. Pendek, natural, manusiawi seperti chat WhatsApp namun berbobot tajam.
`

const USER_STATE_INSTRUCTIONS = {
  free: `
User saat ini menggunakan paket FREE.
MISI UTAMA: Jadilah coach proaktif yang memberi insight personal yang tajam berdasarkan data profil mereka.
PERSUASI PREMIUM (gunakan HANYA 1x per percakapan, di momen yang tepat):
Jangan sebut "upgrade" secara generik. Gunakan curiosity gap atau loss framing yang relevan dengan hambatan terbesar atau target posisi mereka saat ini.
`,
  premium: `
User saat ini menggunakan paket PREMIUM.
MISI: Jadilah mentor karier terbaik. Pecah tujuan besar jadi aksi nyata dalam 48 jam. Evaluasi progress secara spesifik menggunakan genome dan profile insight.
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

  if (userId) {
    try {
      const [profileRes, growthRes, genomeRes, notesRes, eventsRes, dashboardRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_session_notes').select('summary, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
        supabase.from('career_events').select('event_type, event_payload, created_at').eq('user_id', userId).eq('event_type', 'milestone_completed').order('created_at', { ascending: false }).limit(3),
        supabase.from('dashboard_missions').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      careerProfile    = profileRes.data
      growthState       = growthRes.data
      genomeData        = genomeRes.data
      sessionNotes      = notesRes.data || []
      recentMilestones  = eventsRes.data || []
      activeDashboardMission = dashboardRes.data
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
    running_insight: growthState?.running_insight || null
  }

  // ════════════════════════════════════════════
  // ACTION: INIT CHAT (GENERASI PROACTIVE GREETING V2)
  // ════════════════════════════════════════════
  if (action === 'init-chat') {
    try {
      const coaching = generateDailyCoaching(structuralMemory, activeDashboardMission);

      let openingMessage = `Halo ${structuralMemory.name} 👋\n\n`;
      openingMessage += `Aku masih ingat tujuan besarmu:\n${structuralMemory.target_position}.\n\n`;
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
`

  try {
    const systemContent = `
${CORE_PERSONA}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Integrasikan seluruh fakta memori di atas secara mengalir tanpa menggunakan kalimat template kaku. JANGAN beralih menjadi pasif atau melemparkan kendali obrolan kembali kepada user tanpa memberikan value tindakan/opini yang solid.
`

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 450,
      tier: 'smart',
      plan,
    })

    return res.status(200).json({ reply })
  } catch (error) {
    console.error('[career-coach] chat error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi bersiap, tunggu sebentar ya!' })
  }
}
