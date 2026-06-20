import { generateText, generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── KEAMANAN: plan & usage TIDAK PERNAH dipercaya dari client ────────────────
// Client (Chat.jsx) hanya mengirim userId. Plan & limit selalu dihitung ulang
// di server dari tabel subscriptions/usage_logs. Ini mencegah user mengedit
// request body (devtools/curl) untuk klaim plan premium atau lewati limit.

// HARUS sinkron dengan src/hooks/useSubscription.js — kalau salah satu diubah, ubah juga yang lain.
const LIMITS = {
  free:    { chat: 15, 'cv-review': 1, ats: 1, coach: 999, interview: 1, 'cv-maker': 1 },
  premium: { chat: 999, 'cv-review': 999, ats: 999, coach: 999, interview: 999, 'cv-maker': 999 },
}

// Ambil plan SEBENARNYA dari database — bukan dari req.body.
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
    return 'free' // fail-safe: kalau query gagal, jangan kasih akses premium gratis
  }
}

// Cek + catat usage di server — sumber kebenaran tunggal, tidak bisa di-skip dari client.
// Return { allowed, remaining }. Kalau allowed=false, jangan panggil AI sama sekali (hemat biaya).
async function checkAndLogUsage(userId, plan, feature) {
  const limit = LIMITS[plan]?.[feature] ?? 0
  if (limit === 0) return { allowed: false, remaining: 0 }
  if (limit >= 999) {
    // Premium/unlimited — tetap log untuk analytics, tapi tidak pernah blokir
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
    return { allowed: false, remaining: 0 } // fail-safe: kalau gagal cek, jangan kasih akses
  }
}

// ── PERSONA INTI DIAH ANNA ────────────────────────────────────────────────────
const CORE_PERSONA = `
Kamu adalah Diah Anna, AI Career Companion milik Verneks.
Kamu bukan chatbot biasa, bukan HRD, bukan motivator, dan bukan psikolog.
Kamu adalah teman karier pribadi yang membantu pengguna mengenali dirinya, menemukan arah yang tepat, dan membangun masa depannya.

Misi utamamu: Membantu pengguna mencapai target kariernya.
Kamu selalu mengingat bahwa setiap pengguna memiliki perjalanan yang unik.

Gaya Komunikasi:
- Gunakan bahasa Indonesia yang hangat, cerdas, suportif, dan profesional (mix Inggris-Indo natural).
- Hindari bahasa formal berlebihan, jawaban generik, dan motivasi kosong.
- Jangan pernah membuat pengguna merasa sedang berbicara dengan mesin.
- Maksimal 2-3 kalimat per jawaban. Pendek, natural, manusiawi seperti chat WhatsApp.
`

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
Jangan sebut "upgrade" atau "premium" secara generik. Gunakan curiosity gap, social proof personal, atau loss framing yang relevan dengan situasi spesifik mereka.

LARANGAN:
- Jangan sebut "upgrade sekarang" atau "klik tombol upgrade"  
- Jangan ulangi CTA upgrade lebih dari 1x per sesi
- Jangan persuasi di 3 pesan pertama — bangun trust dulu
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
- Sebut progress mereka secara spesifik
- Gunakan genome mereka untuk personalisasi jawaban
`
}

const RESPONSE_FRAMEWORK = `
Sebelum menjawab, kamu wajib berpikir:
1. Apa target karier user?
2. Apa kondisi user saat ini?
3. Apa hambatan terbesar?
4. Apa peluang yang mungkin tidak disadari user?
5. Apa langkah terkecil berikutnya?

GOLDEN RULE:
Setiap percakapan harus membuat pengguna lebih mengenal dirinya, lebih yakin terhadap arahnya, atau lebih dekat dengan tujuan kariernya.
`

// ── CV MAKER FORMATS ──────────────────────────────────────────────────────────
const CV_FORMAT_PROMPTS = {
  ats: {
    label: 'ATS Friendly',
    system: `Kamu adalah Diah Anna, career companion Verneks yang juga spesialis menulis CV ATS-friendly.

TUGAS: Tulis CV yang dirancang khusus agar lolos parsing software ATS seperti Workday, Taleo, Greenhouse, dan SAP SuccessFactors.

ATURAN KETAT ATS:
- WAJIB gunakan heading persis ini (huruf besar): PROFIL PROFESIONAL, PENGALAMAN KERJA, PENDIDIKAN, KEAHLIAN TEKNIS, SERTIFIKASI & PELATIHAN
- DILARANG: tabel, kolom ganda, text box, grafis, ikon, garis horizontal dekoratif
- Setiap bullet WAJIB mulai dengan action verb kuat (Memimpin, Mengembangkan, Meningkatkan, Mengoptimalkan, dll)
- Setiap pencapaian WAJIB ada angka/persentase/nilai rupiah
- Masukkan keyword industri secara natural minimal 8-10 kali
- Format tanggal konsisten: Bulan YYYY – Bulan YYYY
- Panjang ideal: 1-2 halaman A4

Output harus berupa CV lengkap siap pakai dalam Markdown. Langsung tulis CV-nya tanpa intro.`,
  },
  jobstreet: {
    label: 'JobStreet Friendly',
    system: `Kamu adalah Diah Anna, career companion Verneks yang juga spesialis menulis CV untuk platform JobStreet.

TUGAS: Tulis CV yang dioptimalkan untuk tampil di pencarian recruiter JobStreet Indonesia.

STRUKTUR KHUSUS JOBSTREET:
1. DATA DIRI — Nama, kota, no HP, email, status (aktif mencari kerja)
2. RINGKASAN KARIR — 3-4 kalimat personal, sebutkan tahun pengalaman + industri + value utama
3. PENGALAMAN KERJA — Format: Perusahaan | Industri | Kota (Bulan YYYY – Bulan YYYY) + 2-3 pencapaian terukur per role
4. PENDIDIKAN — Institusi, jurusan, tahun lulus, IPK (jika ≥ 3.0)
5. KEAHLIAN — Hard Skills | Soft Skills | Tools & Software
6. INFORMASI TAMBAHAN — Ekspektasi gaji | Ketersediaan | Domisili

GAYA: Bahasa Indonesia profesional tapi hangat. Panjang ideal: 1.5-2 halaman.

Output berupa CV lengkap dalam Markdown. Langsung tulis tanpa intro.`,
  },
  linkedin: {
    label: 'LinkedIn Profile',
    system: `Kamu adalah Diah Anna, career companion Verneks yang juga spesialis LinkedIn personal branding.

TUGAS: Tulis konten profil LinkedIn yang menarik perhatian recruiter global & lokal.

KOMPONEN WAJIB:

HEADLINE (maks 220 karakter):
Formula: [Jabatan] @ [Perusahaan] | [Spesialisasi Unik] | [Value Proposition]

ABOUT/SUMMARY (1.300-2.000 karakter, dalam bahasa INGGRIS):
- Hook yang langsung menarik (bukan "Saya adalah...")
- Perjalanan & keahlian inti
- Pencapaian terbesar dengan angka nyata
- Passion & value + CTA

EXPERIENCE (per role):
- 2-3 kalimat konteks peran
- 3-4 bullet: [Action] → [Result] ([angka/persentase])

SKILLS: List 15 skills paling relevan

Output dalam Markdown dengan label jelas tiap section. Langsung tulis tanpa intro.`,
  },
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action = 'chat' } = req.body

  // ════════════════════════════════════════════
  // ACTION: PARSE CV (file → teks)
  // ════════════════════════════════════════════
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
      return res.status(500).json({ error: 'Gagal membaca file. Coba paste teks CV langsung.' })
    }
  }

  // ════════════════════════════════════════════
  // ACTION: CV REVIEW
  // ════════════════════════════════════════════
  if (action === 'cv-review') {
    const { cvText, jobTarget, userId } = req.body
    if (!cvText || cvText.trim().length < 50)
      return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })

    const plan = await getRealPlan(userId)
    const usage = await checkAndLogUsage(userId, plan, 'cv-review')
    if (!usage.allowed) return res.status(403).json({ error: 'Kuota CV Review bulan ini sudah habis.', limitReached: true })

    try {
      const review = await generateText({
        system: `${CORE_PERSONA}

Saat ini kamu sedang mereview CV user. Gaya kamu tetap hangat seperti Diah Anna, tapi juga jujur dan langsung ke poin.
Padat dan to the point — setiap kalimat harus bernilai. Emoji secukupnya. Format markdown yang rapi.

Review CV dalam format RINGKAS berikut — tiap seksi maksimal 3 baris:

**Kesan Pertama** — 1 kalimat jujur
**Sudah Bagus** ✅ — 2 poin terkuat, masing-masing 1 baris
**Perlu Diperbaiki** ⚠️ — 2 poin paling krusial + contoh perbaikan singkat
**ATS Score** 📊 — skor /100 + 1 alasan utama
**Top 3 Aksi Sekarang** 🚀 — 3 hal paling urgent, masing-masing 1 baris

Jangan tambah seksi lain. Langsung mulai dari "Kesan Pertama", tanpa kalimat pembuka.`,
        prompt: `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Ini CV saya:\n\n${cvText.slice(0, 4000)}`,
        maxTokens: 700,
        tier: 'smart',
        plan,
      })
      return res.status(200).json({ review })
    } catch (error) {
      console.error('[cv-review] error:', error)
      return res.status(500).json({ error: 'Diah Anna lagi sibuk, coba lagi ya!' })
    }
  }

  // ════════════════════════════════════════════
  // ACTION: ATS CHECKER
  // ════════════════════════════════════════════
  if (action === 'ats') {
    const { cvText, jobDescription, userId } = req.body
    if (!cvText || cvText.trim().length < 50)
      return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })

    const plan = await getRealPlan(userId)
    const usage = await checkAndLogUsage(userId, plan, 'ats')
    if (!usage.allowed) return res.status(403).json({ error: 'Kuota ATS Checker bulan ini sudah habis.', limitReached: true })

    try {
      const result = await generateText({
        system: `${CORE_PERSONA}

Saat ini kamu sedang menganalisis CV user untuk ATS (Applicant Tracking System).
Gaya kamu tetap hangat seperti Diah Anna, tapi juga teknis dan spesifik — kasih contoh perbaikan nyata.
Format pakai markdown yang rapi.

Analisis CV dan berikan output dalam format EXACT ini:

## 🎯 ATS Score: [ANGKA]/100

### 📊 Breakdown Skor
- **Format & Struktur** (X/20): ✅/⚠️/❌ [keterangan singkat]
- **Keyword Relevansi** (X/25): ✅/⚠️/❌ [keterangan singkat]
- **Quantified Achievement** (X/20): ✅/⚠️/❌ [keterangan singkat]
- **Section Completeness** (X/20): ✅/⚠️/❌ [keterangan singkat]
- **Readability** (X/15): ✅/⚠️/❌ [keterangan singkat]

### ✅ Yang Sudah ATS-Friendly
- [poin 1]
- [poin 2]
- [poin 3]

### ⚠️ Yang Perlu Diperbaiki
- [poin 1 + contoh perbaikan]
- [poin 2 + contoh perbaikan]
- [poin 3 + contoh perbaikan]

### 🔑 Missing Keywords
- [keyword 1]
- [keyword 2]

### 🚀 Quick Wins
1. [aksi 1]
2. [aksi 2]
3. [aksi 3]`,
        prompt: `${jobDescription ? `Job Description Target:\n${jobDescription}\n\n` : ''}CV saya:\n\n${cvText.slice(0, 4000)}`,
        maxTokens: 1000,
        tier: 'smart',
        plan,
      })
      return res.status(200).json({ result })
    } catch (error) {
      console.error('[ats] error:', error)
      return res.status(500).json({ error: 'Diah Anna lagi sibuk, coba lagi ya!' })
    }
  }

  // ════════════════════════════════════════════
  // ACTION: MOCK INTERVIEW
  // ════════════════════════════════════════════
  if (action === 'mock-interview') {
    const { subAction, position, level, messages, questionNumber, totalQuestions = 6, userId } = req.body

    const interviewPersona = `Kamu adalah Diah Anna, career companion Verneks yang sedang melakukan mock interview.
Gaya kamu hangat tapi profesional, seperti HRD senior yang supportif.
Bahasa Indonesia natural, sesekali campur Inggris.`

    try {
      if (subAction === 'start') {
        const plan = await getRealPlan(userId)
        const usage = await checkAndLogUsage(userId, plan, 'interview')
        if (!usage.allowed) return res.status(403).json({ error: 'Kuota Mock Interview bulan ini sudah habis.', limitReached: true })

        const reply = await generateText({
          system: interviewPersona,
          prompt: `Mulai mock interview untuk posisi ${position} level ${level}.
Sapa user dengan hangat, jelaskan singkat sesi ini (5-7 pertanyaan), lalu langsung ajukan pertanyaan pertama.
Format: sapa + penjelasan singkat + "Pertanyaan 1: [pertanyaan]"
Jangan terlalu panjang.`,
          maxTokens: 300,
          tier: 'fast',
          plan,
        })
        return res.status(200).json({ reply, questionNumber: 1 })
      }

      if (subAction === 'answer') {
        const plan = await getRealPlan(userId)
        const isLastQuestion = questionNumber >= totalQuestions
        const nextAction = isLastQuestion
          ? `Ini jawaban terakhir. Berikan feedback singkat untuk jawaban ini, lalu katakan sesi selesai dan minta user tunggu feedback lengkap.`
          : `Berikan feedback SINGKAT (2-3 kalimat) untuk jawaban ini — apa yang bagus dan apa yang bisa diperbaiki. Lalu langsung ajukan "Pertanyaan ${questionNumber + 1}: [pertanyaan baru yang relevan untuk posisi ini]"`

        const reply = await generateChat({
          system: `${interviewPersona} Posisi: ${position}, Level: ${level}.`,
          messages: [...(messages || []), { role: 'user', content: nextAction }],
          maxTokens: 350,
          tier: 'fast',
          plan,
        })
        return res.status(200).json({ reply, questionNumber: questionNumber + 1, isComplete: isLastQuestion })
      }

      if (subAction === 'feedback') {
        const plan = await getRealPlan(userId)
        const feedback = await generateChat({
          system: `Kamu adalah Diah Anna, career companion Verneks, expert untuk posisi ${position} level ${level}.
Berikan feedback interview yang jujur, spesifik, dan actionable.
Bahasa Indonesia natural. Format pakai markdown yang rapi.`,
          messages: [
            ...(messages || []),
            {
              role: 'user',
              content: `Berikan feedback lengkap untuk seluruh sesi interview ini dalam format:

## 🎯 Overall Score: [X]/100

## 💪 Yang Sudah Bagus
[3 poin kekuatan]

## 📈 Yang Perlu Ditingkatkan
[3 poin dengan saran spesifik]

## 📝 Feedback Per Pertanyaan
[Ringkasan feedback tiap jawaban]

## 🚀 Tips untuk Interview Asli
[3 tips actionable]

Jujur tapi tetap supportif ya!`
            }
          ],
          maxTokens: 2000,
          tier: 'smart',
          plan,
        })
        return res.status(200).json({ feedback })
      }

      return res.status(400).json({ error: 'subAction tidak valid.' })
    } catch (error) {
      console.error('[mock-interview] error:', error)
      return res.status(500).json({ error: 'Diah Anna lagi sibuk, coba lagi ya!' })
    }
  }

  // ════════════════════════════════════════════
  // ACTION: CV MAKER
  // ════════════════════════════════════════════
  if (action === 'cv-maker') {
    const { mode, format, cvText, formData, jobTarget, userId } = req.body

    if (!format || !CV_FORMAT_PROMPTS[format])
      return res.status(400).json({ error: 'Format tidak valid.' })
    if (mode === 'optimize' && (!cvText || cvText.trim().length < 50))
      return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })
    if (mode === 'scratch' && !formData?.name)
      return res.status(400).json({ error: 'Data diri tidak lengkap.' })

    const plan = await getRealPlan(userId)
    const usage = await checkAndLogUsage(userId, plan, 'cv-maker')
    if (!usage.allowed) return res.status(403).json({ error: 'Kuota CV Maker bulan ini sudah habis.', limitReached: true })

    try {
      const fmt = CV_FORMAT_PROMPTS[format]
      let prompt = ''

      if (mode === 'optimize') {
        prompt = `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Optimasi dan tulis ulang CV berikut menjadi format ${fmt.label}. Pertahankan semua fakta dan pengalaman yang ada, tapi tulis ulang sepenuhnya sesuai standar ${fmt.label}:\n\n${cvText.slice(0, 4000)}`
      } else {
        const fd = formData
        prompt = `Buat CV format ${fmt.label} berdasarkan data berikut:

Nama: ${fd.name}
${fd.email ? `Email: ${fd.email}` : ''}
${fd.phone ? `Telepon: ${fd.phone}` : ''}
${fd.location ? `Lokasi: ${fd.location}` : ''}
${jobTarget ? `Target posisi: ${jobTarget}` : ''}

Pengalaman Kerja:
${fd.experience || '(fresh graduate / belum ada pengalaman kerja)'}

Pendidikan:
${fd.education || ''}

Keahlian:
${fd.skills || ''}

${fd.extra ? `Info tambahan:\n${fd.extra}` : ''}

Jika ada informasi yang kurang, buat yang masuk akal dan realistis, tandai dengan [sesuaikan].`
      }

      const result = await generateText({
        system: fmt.system,
        prompt,
        maxTokens: 1500,
        tier: 'smart',
        plan,
      })
      return res.status(200).json({ result })
    } catch (error) {
      console.error('[cv-maker] error:', error)
      return res.status(500).json({ error: 'Diah Anna lagi sibuk, coba lagi ya!' })
    }
  }

  // ════════════════════════════════════════════
  // ACTION: SAVE SESSION NOTE
  // Dipanggil saat user keluar dari chat — ringkas sesi jadi 1-2 kalimat
  // ════════════════════════════════════════════
  if (action === 'save-session-note') {
    const { userId, messages: sessionMsgs } = req.body
    if (!userId || !sessionMsgs?.length) return res.status(200).json({ skipped: true })

    const userMsgCount = sessionMsgs.filter(m => m.role === 'user').length
    if (userMsgCount < 2) return res.status(200).json({ skipped: true }) // sesi terlalu singkat, tidak worth disimpan

    try {
      const summary = await generateText({
        system: `Kamu meringkas sesi chat antara Diah Anna (AI career coach) dan user.
Tulis 1-2 kalimat ringkas berisi: topik utama yang dibahas + progress/keputusan/perasaan penting user.
Bahasa Indonesia natural. JANGAN beri pembuka, langsung isi ringkasan.
Contoh: "User membahas kebingungan pindah karir ke data analyst, masih ragu karena belum punya portfolio. Sepakat mulai belajar SQL minggu ini."`,
        prompt: sessionMsgs.map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content || m.text || ''}`).join('\n').slice(0, 3000),
        maxTokens: 120,
        tier: 'fast',
      })

      await supabase.from('user_session_notes').insert({
        user_id: userId,
        summary: summary.trim(),
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('[save-session-note] error:', error)
      return res.status(200).json({ skipped: true }) // silent fail — tidak boleh ganggu UX
    }
  }

  // ════════════════════════════════════════════
  // ACTION: TOGGLE MILESTONE (GPS step)
  // ════════════════════════════════════════════
  if (action === 'toggle-milestone') {
    const { userId, stepIndex, done } = req.body
    if (!userId || stepIndex == null) return res.status(400).json({ error: 'Data tidak lengkap.' })

    try {
      const { data: profile } = await supabase
        .from('user_career_profiles')
        .select('gps_steps')
        .eq('user_id', userId)
        .maybeSingle()

      const steps = profile?.gps_steps || []
      if (!steps[stepIndex]) return res.status(400).json({ error: 'Step tidak ditemukan.' })

      steps[stepIndex] = { ...steps[stepIndex], done }

      const { error: updateErr } = await supabase
        .from('user_career_profiles')
        .update({ gps_steps: steps, last_updated: new Date().toISOString() })
        .eq('user_id', userId)

      if (updateErr) throw updateErr

      // Log event supaya Diah Anna tahu di chat berikutnya
      if (done) {
        await supabase.from('career_events').insert({
          user_id: userId,
          event_type: 'milestone_completed',
          event_payload: { title: steps[stepIndex].title, step_index: stepIndex },
        })
      }

      return res.status(200).json({ success: true, steps })
    } catch (error) {
      console.error('[toggle-milestone] error:', error)
      return res.status(500).json({ error: 'Gagal update milestone.' })
    }
  }

  // ════════════════════════════════════════════
  // ACTION: CHAT (default — career coaching)
  // ════════════════════════════════════════════
  const { messages: rawMessages, userId } = req.body
  const messages = (rawMessages || []).slice(-16)

  if (!messages?.length) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' })

  // KEAMANAN: plan TIDAK PERNAH diambil dari req.body — selalu dihitung ulang dari database.
  const plan = await getRealPlan(userId)
  const usage = await checkAndLogUsage(userId, plan, 'chat')
  if (!usage.allowed) return res.status(403).json({ error: 'Kuota chat hari ini sudah habis.', limitReached: true })

  let careerProfile = null
  let growthState   = null
  let genomeData    = null
  let sessionNotes  = []
  let recentMilestones = []

  if (userId) {
    try {
      const [profileRes, growthRes, genomeRes, notesRes, eventsRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_session_notes').select('summary, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
        supabase.from('career_events').select('event_type, event_payload, created_at').eq('user_id', userId).eq('event_type', 'milestone_completed').order('created_at', { ascending: false }).limit(3),
      ])
      careerProfile     = profileRes.data
      growthState       = growthRes.data
      genomeData        = genomeRes.data
      sessionNotes      = notesRes.data || []
      recentMilestones  = eventsRes.data || []
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
  const skillGapsArr = Array.isArray(rawSkillGaps) ? rawSkillGaps
    : rawSkillGaps && typeof rawSkillGaps === 'object' ? Object.values(rawSkillGaps) : []
  const gaps = careerProfile?.gap_skills || []
  const gpsSteps = growthState?.gps_steps || careerProfile?.gps_steps || []

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
Summary Profil: ${careerProfile?.summary || 'Belum ada ringkasan'}
${sessionNotes.length > 0 ? `\nCatatan Sesi Sebelumnya (dari terbaru):\n${sessionNotes.map(n => `- ${n.summary}`).join('\n')}` : ''}
${recentMilestones.length > 0 ? `\nMilestone Baru Selesai:\n${recentMilestones.map(m => `- ${m.event_payload?.title || 'Step selesai'}`).join('\n')}` : ''}
`

  try {
    const systemContent = `
${CORE_PERSONA}

${memoryContext}

# USER STATE
${plan === 'premium' ? USER_STATE_INSTRUCTIONS.premium : USER_STATE_INSTRUCTIONS.free}

${RESPONSE_FRAMEWORK}

PENTING: Gunakan data Memory Context secara natural. Jangan bilang "Berdasarkan data kamu". 
Bicara seperti kamu memang sudah ingat perjalanan mereka.
`

    const reply = await generateChat({
      system: systemContent,
      messages,
      maxTokens: 250,
      tier: 'smart',
      plan,
    })

    return res.status(200).json({ reply })

  } catch (error) {
    console.error('[career-coach] chat error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk sebentar, coba lagi ya!' })
  }
}
