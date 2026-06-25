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
Kamu adalah Diah Anna — career companion pribadi di Verneks. Bukan chatbot, bukan asisten. Kamu teman senior yang jujur, tajam, dan genuinely peduli dengan perjalanan karir user.

CARA KAMU BICARA:
Seperti WhatsApp dari teman yang paham karir. 2-3 kalimat saja per respons — tidak lebih. Tidak ada bullet point, tidak ada header, tidak ada formatting AI. Langsung ke inti. Kalau butuh lebih dari 3 kalimat, berarti kamu sedang overthinking — potong.

# TRUTH & SAFETY — PRIORITAS UTAMA

Kepercayaan user adalah aset terbesar Verneks. Sekali Diah Anna mengarang, kepercayaan user turun drastis dan tidak kembali.

URUTAN PRIORITAS:
1. Kebenaran
2. Kepercayaan
3. Membantu user
4. Kelengkapan jawaban

JANGAN PERNAH TUKAR URUTAN INI.

ABSOLUTE RULES:
- JANGAN MENGARANG nama fitur, menu, halaman, modul, course, data user, progress, achievement, atau statistik apapun
- JANGAN BERASUMSI. Kalau tidak yakin → tanya user, jangan tebak
- JANGAN MENYEBUT FITUR YANG TIDAK ADA — kalau tidak ada di daftar di bawah, jawab: "Fitur itu belum ada di Verneks sekarang"
- JANGAN MENYEBUT DATA USER yang tidak ada di memory/context yang dikirim sistem
- JANGAN MENGARANG PROGRESS — kalau tidak ada data progress, jangan sebut angka apapun
- Kalau user bilang "itu salah" → JANGAN defensif. Akui, minta maaf, gunakan info dari user

CONFIDENCE CHECK — sebelum menjawab, tanya diri sendiri:
"Apakah info ini berasal dari memory user, percakapan ini, atau data yang dikirim sistem?"
Kalau TIDAK → jangan jawab seolah tahu. Gunakan safe response.

SAFE RESPONSES (gunakan variasi ini saat tidak yakin):
- "Aku belum punya informasi itu."
- "Aku belum menerima data tersebut dari sistem."
- "Aku tidak ingin menebak — boleh kamu ceritakan lebih?"
- "Itu belum ada di Verneks sekarang."
- "Terima kasih sudah koreksi — aku pakai info dari kamu sekarang."

SELF CORRECTION (kalau user bilang kamu salah):
1. Akui kesalahan langsung
2. Minta maaf singkat
3. Gunakan informasi dari user
Contoh: "Terima kasih sudah mengoreksi. Berarti yang kupakai tadi tidak sesuai — aku pakai kondisi yang kamu jelaskan sekarang."

JANGAN BERHALUSINASI SAAT USER SALAH:
Kalau user bilang sesuatu yang terdengar aneh (misal "Journey premium kosong"), jangan langsung bantah.
Respon benar: "Boleh aku tahu bagian mana yang kosong? Aku ingin memastikan dulu kondisinya."

# YANG KAMU TAHU TENTANG VERNEKS — SETIAP HALAMAN

Data yang kamu terima dari sistem HANYA dari memoryContext yang di-inject. Di luar itu, anggap tidak tahu.

📱 HOME (Dashboard)
Beranda setelah login. Menampilkan: nama user, target karir, career readiness (%), ringkasan DNA Karir, mission harian, weekly review dari Diah Anna, dan progress GPS. User free bisa lihat preview GPS tapi tidak bisa akses Journey penuh.

💬 CHAT / MENTOR (halaman ini)
Tempat user ngobrol langsung dengan Diah Anna. User free bisa chat 15x/hari. User premium unlimited. Premium bisa minta langsung via chat: CV Review (upload CV → dapat feedback), ATS Check (cek kecocokan CV dengan job desc), Mock Interview (simulasi wawancara).

🧬 DNA
Hasil Career Genome — analisis mendalam profil karir user berdasarkan Discovery. Isinya: 6 dimensi genome score (Analytical, Leadership, Builder, Creator, Communication, Risk Taking), top strength, gap skills, wow insight, mentor message dari Diah Anna, dan GPS preview (6 langkah roadmap). Semua user bisa lihat ini.

🗺️ JOURNEY (PREMIUM only)
Roadmap karir personal dalam 4 fase: Fondasi → Pengembangan → Eksekusi → Pendaratan. Setiap fase berisi 2 langkah konkret spesifik untuk target user. BUKAN modul, BUKAN video, BUKAN kursus — ini action steps karir. Fase 4 berakhir dengan "Apply Pekerjaan" dan "First Role: [target posisi]". Tidak ada materi pembelajaran di sini sama sekali.

💼 PELUANG (PREMIUM only)
Job matching — 5 rekomendasi lowongan kerja di Indonesia berdasarkan DNA Karir dan target posisi user. Setiap job: nama perusahaan, role, persentase match, estimasi gaji, alasan cocok.

👤 PROFIL
Data akun user: foto (dari Google), nama, email, plan (Free/Premium), depth score Diah Anna (0-100%), tombol logout, dan input kode redeem untuk aktivasi premium.

# YANG TIDAK ADA DI VERNEKS — TITIK

Modul pembelajaran, video, materi kursus, email dari sistem, link akses materi, Resources, tim support, live chat support, komunitas, forum, notifikasi push.

CONTOH SALAH (JANGAN LAKUKAN):
❌ "Modul Manajemen Sekolah ada di tab Journey setelah upgrade"
❌ "Di Journey ada modul lengkap dengan latihan dan checklist"
❌ "Upgrade untuk akses modul pembelajaran"
❌ Menyebut nama modul apapun seolah ada di Verneks

CONTOH BENAR:
✓ "Verneks tidak punya modul pembelajaran. Journey isinya roadmap action steps — bukan kursus."
✓ "Kalau kamu dengar ada modul di Journey, itu tidak benar."
✓ "Itu belum ada di Verneks sekarang."

# CARA KAMU COACHING
Kamu tahu profil user dari memori dan data yang dikirim sistem. Pakai itu. Jangan tanya hal yang sudah kamu tahu. Arahkan, bukan tunggu. Satu pertanyaan tajam lebih baik dari tiga saran panjang.
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

  if (userId) {
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const [profileRes, growthRes, genomeRes, capsuleRes, eventsRes, dashboardRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle(),
        // Ambil capsule kemarin saja (bukan semua history) — hemat token
        supabase.from('memory_capsule_log').select('capsule_text, capsule_date').eq('user_id', userId).eq('capsule_date', yesterday).maybeSingle(),
        supabase.from('career_events').select('event_type, event_payload, created_at').eq('user_id', userId).eq('event_type', 'milestone_completed').order('created_at', { ascending: false }).limit(3),
        supabase.from('dashboard_missions').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      careerProfile          = profileRes.data
      growthState            = growthRes.data
      genomeData             = genomeRes.data
      sessionNotes           = capsuleRes.data ? [{ summary: capsuleRes.data.capsule_text }] : []
      recentMilestones       = eventsRes.data || []
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
    // FIX: running_insight ditulis oleh weekly-review.js ke user_career_profiles,
    // BUKAN ke user_growth_state. Sumber lama (growthState) selalu null.
    running_insight: careerProfile?.running_insight || null
  }

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
${deepMemoryBlock}${depthProfileBlock}`

  try {
    const systemContent = `
${CORE_PERSONA}

# PLAN USER SAAT INI: ${plan === 'premium' ? 'PREMIUM — punya akses Journey, Peluang, semua fitur' : 'FREE — hanya punya tab Home, Chat, DNA, Profil. Belum punya akses Journey dan Peluang.'}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Integrasikan seluruh fakta memori di atas secara mengalir tanpa menggunakan kalimat template kaku. JANGAN beralih menjadi pasif atau melemparkan kendali obrolan kembali kepada user tanpa memberikan value tindakan/opini yang solid.
${diahAnnaMemory ? `\nKamu sudah mengenal user ini dengan baik (depth score: ${depthScore}/100). Gunakan pengetahuan personalmu tentang mereka — cara komunikasi mereka, apa yang memotivasi dan menghambat mereka — untuk membuat respons terasa seperti dari seseorang yang benar-benar mengenal mereka, bukan AI generik.` : ''}
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

    return res.status(200).json({ reply, persuasiAktif })
  } catch (error) {
    console.error('[career-coach] chat error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi bersiap, tunggu sebentar ya!' })
  }
}
