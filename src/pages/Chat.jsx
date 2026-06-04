import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Onboarding from '../components/Onboarding'
import ShareCard from '../components/ShareCard'
import ShareAppModal from '../components/ShareAppModal'
import BottomNav from '../components/BottomNav'
import { useSubscription, LIMITS, PLAN_LABEL, FEATURE_LABEL } from '../hooks/useSubscription'

function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:0.9rem;margin:10px 0 3px;color:#111">$1</div>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:600;font-size:0.85rem;margin:8px 0 2px;color:#333">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<div style="padding:2px 0 2px 14px;position:relative"><span style="position:absolute;left:4px;color:var(--wa-green)">•</span>$1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding:2px 0 2px 14px;position:relative">$1</div>')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

async function apiFetch(url, body) {
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error(text.slice(0, 120)) }
  if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`)
  return data
}

const MAIN_MENU = [
  { id: 'cv-review', label: '📄 Review CV'     },
  { id: 'ats',       label: '🎯 ATS Checker'   },
  { id: 'interview', label: '🎤 Mock Interview' },
  { id: 'cv-maker',  label: '✨ Bikin CV'       },
  { id: 'coach',     label: '🧠 Tanya Karir'   },
]

const INTERVIEW_LEVELS = [
  { id: 'Fresh Graduate',    label: '🌱 Fresh Graduate'    },
  { id: 'Junior (1-3 thn)', label: '🔰 Junior (1-3 thn)' },
  { id: 'Mid (3-5 thn)',    label: '⭐ Mid (3-5 thn)'    },
  { id: 'Senior (5+ thn)', label: '🏆 Senior (5+ thn)'  },
]

const CV_FORMATS = [
  { id: 'fmt_ats',       label: '✅ ATS Friendly'    },
  { id: 'fmt_jobstreet', label: '🔍 JobStreet'        },
  { id: 'fmt_linkedin',  label: '💼 LinkedIn Profile' },
]

export default function Chat({ user, chatMessages = [], setChatMessages }) {
  const navigate = useNavigate()
  const { plan, loading: subLoading, checkUsage, logUsage } = useSubscription(user?.id)

  const storageKey     = user?.id ? `lc_chat_${user.id}` : null
  const ONBOARDING_KEY = user?.id ? `onboarded_${user.id}` : null

  // Pakai chatMessages dari App.jsx langsung sebagai source of truth
  const messages    = chatMessages
  const setMessages = setChatMessages

  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [mode, setMode]                 = useState('menu')
  const [cvText, setCvText]             = useState('')
  const [interview, setInterview]       = useState({ position: '', level: '', messages: [], qNum: 0 })
  const [coachHistory, setCoachHistory] = useState([])
  const [cvMakerInfo, setCvMakerInfo]   = useState({ text: '', format: '' })
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!ONBOARDING_KEY) return false
    return !localStorage.getItem(ONBOARDING_KEY)
  })
  const handleOnboardingDone = (data) => {
    if (ONBOARDING_KEY) localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
    // Sapa user pakai nama dari onboarding
    if (data?.nama) {
      const firstName = data.nama.split(' ')[0]
      const targetText = data.target ? ` Goal kamu: ${data.target.toLowerCase()}.` : ''
      const cvText = data.cvText ? ' CV kamu sudah aku baca ya!' : ''
      pushBot(`Halo ${firstName}! 👋 Senang kenalan sama kamu.${targetText}${cvText}\n\nAda yang mau kamu ceritakan atau tanyakan soal karir sekarang?`)
    }
  }

  const bottomRef = useRef()
  const fileRef   = useRef()
  const containerRef = useRef()

  // ── visualViewport: adjust container saat keyboard muncul di mobile ──
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (containerRef.current) {
        containerRef.current.style.height = vv.height + 'px'
        containerRef.current.style.top    = vv.offsetTop + 'px'
      }
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // ── pushBot & pushUser didefinisikan DULU sebelum dipakai di useEffect ──
  const pushBot = useCallback((text, quickReplies = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, quickReplies }])
  }, [])

  const pushUser = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])
  }, [])

  // ── Auth guard + greeting ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
  }, [user?.id])

  // ── Dynamic Greeting dari user_growth_state ──────────────────────────────
  useEffect(() => {
    if (!user) return
    if (messages.length > 0) return
    if (chatMessages && chatMessages.length > 0) return

    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]

    // Fetch growth_state untuk personalisasi greeting
    supabase
      .from('user_growth_state')
      .select('career_stage, progress_percent, current_focus, next_milestone, streak_days')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: g }) => {
        let greeting
        if (!g || !g.career_stage) {
          // User baru — belum ada profil
          greeting = `Halo${firstName ? ` ${firstName}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nCeritain dong sekarang kamu di posisi apa dan mau ke mana? Kita mulai petualangan karir kamu! 🚀`
        } else {
          const stage = g.career_stage
          const progress = g.progress_percent || 0
          const focus = g.current_focus
          const milestone = g.next_milestone
          const streak = g.streak_days || 0

          const greetingByStage = {
            'Career Explorer':    `Halo${firstName ? ` ${firstName}` : ''}! 🌱 Kamu masih di tahap eksplorasi karir (${progress}% progress).${focus ? ` Sekarang fokus: **${focus}**.` : ''} Yuk kita telusuri lebih dalam potensimu!`,
            'Career Builder':     `Halo${firstName ? ` ${firstName}` : ''}! 🔰 Kamu udah di tahap Career Builder — bagus banget! Progress ${progress}%.${milestone ? ` Next target: **${milestone}**.` : ''} Kita gas bareng ya!`,
            'Career Professional':`Halo${firstName ? ` ${firstName}` : ''}! ⭐ Kamu udah jadi Career Professional (${progress}% progress).${focus ? ` Fokus saat ini: **${focus}**.` : ''} Mau ningkatin ke level berikutnya?`,
            'Career Expert':      `Halo${firstName ? ` ${firstName}` : ''}! 🏆 Impressive! Kamu sudah di level Career Expert (${progress}%).${milestone ? ` Target selanjutnya: **${milestone}**.` : ''} Apa yang mau kita capai hari ini?`,
            'Career Leader':      `Halo${firstName ? ` ${firstName}` : ''}! 👑 Career Leader — kamu udah di puncak! Progress ${progress}%.${focus ? ` Sekarang fokusmu: **${focus}**.` : ''} Bagaimana aku bisa bantu lebih jauh?`,
          }

          greeting = greetingByStage[stage] || `Halo${firstName ? ` ${firstName}` : ''}! 👋 Selamat datang kembali. Progress karirmu: ${progress}%. Ada yang bisa aku bantu?`

          if (streak >= 3) greeting += `\n\n🔥 Streak ${streak} hari — konsistensimu keren banget!`
        }
        pushBot(greeting)
      })
      .catch(() => {
        // Fallback kalau fetch gagal
        const firstName2 = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]
        pushBot(`Halo${firstName2 ? ` ${firstName2}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nAda yang bisa aku bantu hari ini?`)
      })
  }, [user?.id, chatMessages])

  // ── Simpan ke localStorage setiap messages berubah ───────────────────
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])



  // ── Paywall (Diah Anna persuasive messages) ───────────────────────────
  const PAYWALL_LOCKED = {
    'cv-review': `Hei, aku Diah Anna — career coach AI kamu 😊\n\nKamu udah sampai di sini, artinya kamu serius soal karir. Sayang banget kalau berhenti di sini.\n\n**CV Review** adalah fitur yang paling banyak bantu user aku lolos ke tahap interview. Rata-rata ATS score naik dari 48 ke 78+ setelah direvisi.\n\nFitur ini tersedia mulai paket Starter (Rp 49rb/bulan). Mau lanjut?`,
    'ats': `Aku tau kamu udah usaha keras nulis CV itu 💙\n\nTapi tanpa cek ATS score, kamu gak tau apakah CV kamu bahkan dibaca manusia — atau langsung dibuang algoritma.\n\n**75% lamaran ditolak ATS** sebelum HRD lihat. Fitur ATS Checker ini bisa kasih tahu persis di mana masalahnya.\n\nTersedia di paket Starter. Investasinya lebih murah dari satu kali ngopi bareng teman 😄`,
    'cv-maker': `Wah, kamu mau bikin CV baru! Bagus banget 🎉\n\nAku bisa bantu kamu bikin CV yang langsung ATS-friendly dan menarik HRD — tapi fitur **CV Maker AI** ini ada di paket berbayar.\n\nDaripada kamu buang waktu berjam-jam di Canva tapi hasilnya mungkin ditolak ATS, mending aku yang buatkan dengan format yang terbukti lolos 😊\n\nMau coba?`,
    'interview': `Mock Interview adalah fitur favorit user aku yang akhirnya berhasil dapat kerja 🎤\n\nBanyak yang bilang: setelah latihan sama aku, interview benerannya jauh lebih gampang.\n\nFitur ini ada di paket **Pro** — karena aku mau mastiin kamu beneran siap, bukan cuma latihan asal-asalan.\n\nKalau kamu lagi aktif cari kerja, ini investasi paling worth it yang bisa kamu lakukan sekarang.`,
  }
  const PAYWALL_EXHAUSTED = {
    'cv-review': `Wah, kamu udah pakai semua kuota CV Review bulan ini — artinya kamu serius banget soal karir ini! 💪\n\nAku senang bisa bantu sejauh ini. Kalau kamu mau terus improve dan makin dekat ke pekerjaan impian, upgrade ke paket yang lebih tinggi biar aku bisa review lebih banyak lagi.\n\nYuk lanjut — kamu udah di jalur yang benar!`,
    'ats': `Kuota ATS Checker kamu udah habis untuk periode ini 🎯\n\nKamu udah cek beberapa versi CV — itu langkah yang tepat! Banyak yang nyerah di langkah pertama, kamu tidak.\n\nUpgrade sekarang biar aku bisa terus bantu kamu optimalkan CV sampai beneran siap kirim ke perusahaan impian kamu.`,
    'cv-maker': `Kamu udah aktif banget pakai CV Maker — keren! ✨\n\nKuota bulan ini udah habis, tapi perjalanan kamu belum selesai. Upgrade biar aku bisa terus bantu kamu poles CV sampai sempurna.\n\nInget: CV yang tepat bisa mengubah segalanya.`,
    'interview': `Kamu udah latihan mock interview sebanyak itu? Luar biasa serius! 🏆\n\nKuota kamu udah habis bulan ini. Tapi justru ini saat yang tepat untuk upgrade — karena semakin banyak latihan, semakin percaya diri kamu saat interview beneran.\n\nUpgrade sekarang dan teruskan latihan!`,
  }

  // showPaywallInCoach: khusus saat di dalam coach — tidak setMode, context tetap nyambung
  const showPaywallInCoach = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const isLocked = limit === 0
    const label = FEATURE_LABEL[feature] || feature
    const fallback = isLocked
      ? `Fitur **${label}** ada di paket berbayar. Mau aku tunjukkan pilihan paketnya? 😊`
      : `Kuota **${label}** kamu udah habis bulan ini. Upgrade untuk lanjut! 💪`
    const msg = isLocked
      ? (PAYWALL_LOCKED[feature] || fallback)
      : (PAYWALL_EXHAUSTED[feature] || fallback)
    // Tambah ke coachHistory agar context tetap nyambung
    setCoachHistory(prev => [...prev, { role: 'assistant', content: msg }])
    pushBot(msg, [
      { id: '__pricing', label: '⭐ Lihat Paket & Harga' },
      { id: '__continue_coach', label: '💬 Lanjut ngobrol' },
    ])
    // Tidak setMode — tetap di coach!
  }

  const showPaywall = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const isLocked = limit === 0
    const label = FEATURE_LABEL[feature] || feature
    const fallback = isLocked
      ? `Hai! Fitur **${label}** belum tersedia di paket kamu sekarang.\n\nUpgrade untuk akses fitur ini dan bantu aku bantu kamu lebih maksimal ya 😊`
      : `Kuota **${label}** kamu udah habis bulan ini.\n\nUpgrade untuk lanjut — kamu udah di jalur yang benar! 💪`
    const msg = isLocked
      ? (PAYWALL_LOCKED[feature] || fallback)
      : (PAYWALL_EXHAUSTED[feature] || fallback)
    pushBot(msg, [
      { id: '__pricing', label: '⭐ Lihat Paket & Harga' },
      { id: '__menu',    label: '🏠 Menu utama' },
    ])
    setMode('menu')
  }

  // ── File upload ────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    pushUser(`📎 ${file.name}`)
    setLoading(true)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
      })
      const data = await apiFetch('/api/parse-cv', { base64, fileName: file.name })
      setCvText(data.text)
      if (mode === 'cv-review-upload') {
        setMode('cv-review-job')
        pushBot('CV berhasil dibaca! 📄\n\nKamu mau apply ke posisi apa? (opsional, ketik "-" kalau skip)', [{ id: '__skip_job', label: 'Skip langsung review' }])
      } else if (mode === 'ats-upload') {
        setMode('ats-jd')
        pushBot('CV berhasil dibaca! 🎯\n\nPaste job description yang mau dilamar di sini. (opsional)', [{ id: '__skip_jd', label: 'Skip, cek aja' }])
      } else if (mode === 'cv-maker-upload') {
        setMode('cv-maker-format')
        pushBot('CV lama berhasil dibaca! ✨\n\nSekarang pilih format CV baru yang kamu mau — AI akan tulis ulang jadi lebih optimal:', CV_FORMATS)
      }
    } catch (e) { pushBot(`Gagal baca file: ${e.message}\n\nCoba paste teks CV kamu langsung ya.`) }
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleQuickReply = (id, label) => { pushUser(label); route(id, label) }
  const handleSend = () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput(''); pushUser(msg); route(msg, msg)
  }

  // ── Router ─────────────────────────────────────────────────────────────
  const route = async (id, label) => {
    if (id === '__menu' || id === 'menu') { setMode('menu'); pushBot('Oke! Mau ngapain lagi?', MAIN_MENU); return }
    if (id === '__download_docx') {
      const lastBot = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 200)
      if (lastBot?.text) await downloadDocx(lastBot.text)
      return
    }
    if (id === '__share_app') { setShowShareApp(true); return }
    if (id === '__share_cv')  { const m = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 100); setShareCard({ text: m?.text || '', type: 'cv-review' }); return }
    if (id === '__share_ats') { const m = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 100); setShareCard({ text: m?.text || '', type: 'ats' }); return }
    if (id === '__pricing') { navigate('/pricing'); return }
    if (id === '__continue_coach') {
      // User mau lanjut ngobrol setelah lihat paywall — tetap di coach, context aman
      pushBot('Oke, lanjut ya! Ada yang mau kamu ceritakan atau tanyakan soal karir? 😊')
      return
    }
    if (id === 'cv-review') { startCvReview(); return }
    if (id === 'ats')       { startAts(); return }
    if (id === 'interview') { startInterview(); return }
    if (id === 'cv-maker')  { startCvMaker(); return }
    if (id === 'coach')     { startCoach(); return }
    if (id === '__skip_job') { await doCvReview(''); return }
    if (id === '__skip_jd')  { await doAts(''); return }

    switch (mode) {
      case 'cv-review-upload': { setCvText(id); setMode('cv-review-job'); pushBot('Oke! Kamu mau apply ke posisi apa? (ketik "-" kalau skip)', [{ id: '__skip_job', label: 'Skip langsung review' }]); return }
      case 'cv-review-job':   { await doCvReview(id === '-' || id === '__skip_job' ? '' : id); return }
      case 'ats-upload':      { setCvText(id); setMode('ats-jd'); pushBot('Oke! Paste job description-nya di sini kalau ada. (opsional)', [{ id: '__skip_jd', label: 'Skip, cek aja' }]); return }
      case 'ats-jd':          { await doAts(id === '__skip_jd' ? '' : id); return }
      case 'interview-position': { setInterview(prev => ({ ...prev, position: id })); setMode('interview-level'); pushBot(`Posisi: **${id}**\n\nLevel pengalaman kamu?`, INTERVIEW_LEVELS); return }
      case 'interview-level':    { setInterview(prev => ({ ...prev, level: id })); await startInterviewSession(interview.position, id); return }
      case 'interview-active':   { await answerInterview(id); return }
      case 'cv-maker-upload': {
        // User paste teks CV langsung — terima dan lanjut ke pilih format
        if (id.length > 100) {
          setCvText(id)
          setMode('cv-maker-format')
          pushBot('CV berhasil dibaca! ✨\n\nPilih format CV baru yang kamu mau:', CV_FORMATS)
        } else {
          pushBot('Paste teks CV kamu di sini, atau upload file PDF/Word pakai tombol 📎 di bawah.')
        }
        return
      }
      case 'cv-maker-format': { if (CV_FORMATS.find(f => f.id === id)) await doCvMaker(id.replace('fmt_', '')); return }
      case 'coach': {
        // Cek keyword fitur berbayar bahkan saat dalam sesi coach
        const msg = id.toLowerCase()
        const isInterviewTopic = /interview|wawancara|latihan interview|mock|pertanyaan interview|simulasi interview/.test(msg)
        const isCvReviewTopic  = /review cv|cek cv|koreksi cv|nilai cv|feedback cv|benerin cv/.test(msg)
        const isAtsTopic       = /ats|applicant tracking|ats score|lolos ats/.test(msg)
        const isCvMakerTopic   = /bikin cv|buat cv|template cv|contoh cv|cv maker|tulis cv/.test(msg)

        if (isInterviewTopic && !await checkUsage('interview')) { showPaywall('interview'); return }
        if (isCvReviewTopic  && !await checkUsage('cv-review')) { showPaywall('cv-review'); return }
        if (isAtsTopic       && !await checkUsage('ats'))        { showPaywall('ats');       return }
        if (isCvMakerTopic   && !await checkUsage('cv-maker'))   { showPaywall('cv-maker');  return }

        await doCoach(id); return
      }
      default: {
        // Kalau sedang dalam flow cv-maker, jangan masuk coach
        if (mode.startsWith('cv-maker')) return

        // Deteksi keyword fitur berbayar sebelum masuk coach
        const msg = id.toLowerCase()
        const isInterviewTopic = /interview|wawancara|latihan interview|mock|pertanyaan interview|simulasi interview/.test(msg)
        const isCvReviewTopic  = /review cv|cek cv|koreksi cv|nilai cv|feedback cv|benerin cv/.test(msg)
        const isAtsTopic       = /ats|applicant tracking|ats score|lolos ats/.test(msg)
        const isCvMakerTopic   = /bikin cv|buat cv|template cv|contoh cv|cv maker|tulis cv/.test(msg)

        if (isInterviewTopic && !await checkUsage('interview')) { showPaywall('interview'); return }
        if (isCvReviewTopic  && !await checkUsage('cv-review')) { showPaywall('cv-review'); return }
        if (isAtsTopic       && !await checkUsage('ats'))        { showPaywall('ats');       return }
        if (isCvMakerTopic   && !await checkUsage('cv-maker'))   { showPaywall('cv-maker');  return }

        setMode('coach'); setCoachHistory([{ role: 'user', content: id }])
        setLoading(true); await callCoachApi([{ role: 'user', content: id }]); setLoading(false)
      }
    }
  }

  // ── Feature starters ────────────────────────────────────────────────────
  const startCvReview = async () => {
    if (!await checkUsage('cv-review')) { showPaywall('cv-review'); return }
    setMode('cv-review-upload'); setCvText('')
    pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau langsung paste teks CV-nya di sini.')
  }

  const startAts = async () => {
    if (!await checkUsage('ats')) { showPaywall('ats'); return }
    setMode('ats-upload'); setCvText('')
    pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau paste teks CV-nya di sini.')
  }

  const startInterview = async () => {
    if (!await checkUsage('interview')) { showPaywall('interview'); return }
    setMode('interview-position'); setInterview({ position: '', level: '', messages: [], qNum: 0 })
    pushBot('Siap latihan interview! 🎤\n\nMau melamar posisi apa?\n(contoh: Data Analyst, Software Engineer, Marketing Manager)')
  }

  const startCvMaker = async () => {
    if (!await checkUsage('cv-maker')) { showPaywall('cv-maker'); return }
    setMode('cv-maker-upload')
    setCvMakerInfo({ text: '', format: '' })
    pushBot('Oke, kita optimalkan CV kamu! ✨\n\nUpload CV lama kamu (PDF atau Word) — nanti AI tulis ulang jadi CV baru yang lolos ATS, JobStreet, atau LinkedIn.')
  }

  const startCoach = async () => {
    // coach unlimited — langsung masuk
    setMode('coach'); setCoachHistory([])
    pushBot('Halo! Aku Diah Anna 💙\n\nMau ngobrolin apa soal karir kamu?')
  }

  // ── API calls ────────────────────────────────────────────────────────────
  const doCvReview = async (jobTarget) => {
    setMode('cv-review-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/cv-review', { cvText, jobTarget })
      logUsage('cv-review')
      pushBot(data.review, [{ id: 'ats', label: '🎯 Cek ATS Score juga' }, { id: '__share_cv', label: '📤 Bagikan hasil' }, { id: '__share_app', label: '👥 Ajak teman coba' }, { id: '__menu', label: '🏠 Kembali ke menu' }])
      // Inject hasil review ke coachHistory agar Diah Anna ingat konteksnya
      // saat user lanjut ngobrol setelah review selesai
      setCoachHistory([
        {
          role: 'user',
          content: `Tolong review CV saya${jobTarget ? ` untuk posisi ${jobTarget}` : ''}.\n\nIsi CV:\n${cvText.slice(0, 2000)}`
        },
        {
          role: 'assistant',
          content: data.review
        }
      ])
      setMode('coach')
      // Ekstrak profil — ada sinyal target posisi & kondisi CV
      extractAndSaveProfile([
        { role: 'user', content: `Tolong review CV saya${jobTarget ? ` untuk posisi ${jobTarget}` : ''}.` },
        { role: 'assistant', content: data.review.slice(0, 600) }
      ]).catch(() => {})
    } catch (e) { pushBot(`Aduh, ada error: ${e.message}\n\nCoba lagi ya! 🙏`); setMode('menu') }
    setLoading(false)
  }

  const doAts = async (jobDescription) => {
    setMode('ats-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/ats-checker', { cvText, jobDescription })
      logUsage('ats')
      pushBot(data.result, [{ id: 'cv-review', label: '📄 Review CV juga' }, { id: '__share_ats', label: '📤 Bagikan hasil' }, { id: '__share_app', label: '👥 Ajak teman coba' }, { id: '__menu', label: '🏠 Kembali ke menu' }])
      // Inject hasil ATS ke coachHistory agar Diah Anna ingat konteksnya
      setCoachHistory([
        {
          role: 'user',
          content: `Tolong cek ATS score CV saya${jobDescription ? ` untuk job description: ${jobDescription.slice(0, 500)}` : ''}.`
        },
        {
          role: 'assistant',
          content: data.result
        }
      ])
      setMode('coach')
      // Ekstrak profil — ada sinyal karir dari ATS check
      extractAndSaveProfile([
        { role: 'user', content: `Cek ATS score CV saya.` },
        { role: 'assistant', content: data.result.slice(0, 600) }
      ]).catch(() => {})
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    setLoading(false)
  }

  const startInterviewSession = async (position, level) => {
    setMode('interview-active'); setLoading(true)
    logUsage('interview')
    try {
      const data = await apiFetch('/api/mock-interview', { action: 'start', position, level, messages: [] })
      setInterview(prev => ({ ...prev, messages: [{ role: 'assistant', content: data.reply }], qNum: data.questionNumber }))
      pushBot(data.reply)
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    setLoading(false)
  }

  const answerInterview = async (answer) => {
    setLoading(true)
    const newMsgs = [...interview.messages, { role: 'user', content: answer }]
    try {
      const data = await apiFetch('/api/mock-interview', { action: 'answer', position: interview.position, level: interview.level, messages: newMsgs, questionNumber: interview.qNum })
      const updatedMsgs = [...newMsgs, { role: 'assistant', content: data.reply }]
      setInterview(prev => ({ ...prev, messages: updatedMsgs, qNum: data.questionNumber }))
      if (data.isComplete) {
        pushBot(data.reply)
        const fbData = await apiFetch('/api/mock-interview', { action: 'feedback', position: interview.position, level: interview.level, messages: updatedMsgs })
        setMode('interview-done')
        const feedbackText = fbData.feedback || 'Sesi selesai! Kamu hebat! 🎉'
        pushBot(feedbackText, [{ id: 'interview', label: '🔄 Interview lagi' }, { id: '__menu', label: '🏠 Kembali ke menu' }])
        // Inject ke coachHistory agar Diah Anna tahu hasil interview
        const interviewSummary = updatedMsgs
          .map(m => `${m.role === 'user' ? 'Kandidat' : 'Interviewer'}: ${m.content.slice(0, 200)}`)
          .join('\n')
        setCoachHistory([
          { role: 'user', content: `Aku baru selesai mock interview untuk posisi ${interview.position} level ${interview.level}.\n\nRingkasan sesi:\n${interviewSummary.slice(0, 1500)}` },
          { role: 'assistant', content: `Ini feedback lengkap sesi mock interview kamu:\n\n${feedbackText.slice(0, 1500)}` }
        ])
        setMode('coach')
        // Ekstrak profil — interview memberi sinyal kuat soal target posisi & level
        extractAndSaveProfile([
          { role: 'user', content: `Saya baru selesai mock interview untuk posisi ${interview.position} level ${interview.level}.` },
          { role: 'assistant', content: feedbackText.slice(0, 600) }
        ]).catch(() => {})
      } else { pushBot(data.reply) }
    } catch (e) { pushBot(`Error: ${e.message}`) }
    setLoading(false)
  }

  const doCvMaker = async (format) => {
    setMode('cv-maker-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/cv-maker', { mode: 'optimize', format, cvText })
      logUsage('cv-maker')
      pushBot(data.result, [
        { id: '__download_docx', label: '📥 Download Word (.docx)' },
        { id: '__share_cv', label: '📤 Bagikan CV' },
        { id: '__share_app', label: '👥 Ajak teman coba' },
        { id: '__menu', label: '🏠 Kembali ke menu' },
      ])
      // Inject ke coachHistory agar Diah Anna tahu CV sudah dibuat
      setCoachHistory([
        { role: 'user', content: `Tolong buatkan CV saya dalam format ${format}.\n\nCV asli:\n${cvText.slice(0, 1500)}` },
        { role: 'assistant', content: `Oke! Berikut CV kamu yang sudah dioptimalkan dalam format ${format}:\n\n${data.result.slice(0, 1500)}` }
      ])
      setMode('coach')
      // Ekstrak profil — CV maker memberi banyak konteks karir
      extractAndSaveProfile([
        { role: 'user', content: `Saya minta CV dioptimalkan format ${format}.` },
        { role: 'assistant', content: data.result.slice(0, 600) }
      ]).catch(() => {})
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    setLoading(false)
  }

  // Download hasil CV sebagai .docx
  const downloadDocx = async (markdown) => {
    try {
      const res = await fetch('/api/cv-to-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, filename: 'CV-LamarCerdas' })
      })
      if (!res.ok) throw new Error('Gagal generate file')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'CV-LamarCerdas.docx'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      pushBot('Gagal download file Word. Coba lagi ya!')
    }
  }

  // Keyword yang trigger paywall — hanya jika user EKSPLISIT minta mulai fitur
  // Sengaja dibuat ketat: harus ada kata kerja imperatif + objek fitur
  // "cerita tentang interview" atau "switch karir" TIDAK trigger
  const PAID_TRIGGERS = {
    mock_interview: [
      'mulai mock interview', 'mau mock interview', 'coba mock interview',
      'simulasikan interview', 'roleplay interview', 'latihan interview sekarang',
      'mulai latihan interview', 'mau latihan interview', 'interview sekarang',
    ],
    cv_review:      [
      'review cv ku', 'review cv saya', 'tolong review cv', 'cek cv ku', 'cek cv saya',
      'koreksi cv ku', 'koreksi cv saya', 'nilai cv ku', 'nilai cv saya',
      'analisa cv ku', 'analisa cv saya', 'feedback cv ku', 'feedback cv saya',
      'upload cv', 'kirim cv',
    ],
    cv_maker:       [
      'buatkan cv', 'bikin cv ku', 'bikin cv saya', 'buat cv ku', 'buat cv saya',
      'generate cv', 'tolong bikin cv', 'tolong buat cv', 'bantu bikin cv', 'bantu buat cv',
    ],
    ats_checker:    [
      'cek ats', 'cek skor ats', 'cek score ats', 'tes ats', 'test ats',
      'analisa ats', 'lihat ats score',
    ],
  }

  const checkPaidTrigger = (msg) => {
    const lower = msg.toLowerCase().trim()
    // Minimal 3 kata agar tidak salah trigger kalimat panjang
    if (lower.split(' ').length < 2) return null
    for (const [feature, keywords] of Object.entries(PAID_TRIGGERS)) {
      if (keywords.some(kw => lower.includes(kw))) return feature
    }
    return null
  }

  // ── Profile Extraction Engine ────────────────────────────────────────────

  // Konversi messages (format chat: {role,text}) → format API ({role,content})
  const messagesRef = useRef(chatMessages)
  useEffect(() => { messagesRef.current = chatMessages }, [chatMessages])

  const getChatHistoryForExtract = () => {
    return messagesRef.current
      .filter(m => (m.role === 'user' || m.role === 'bot') && (m.text || '').length > 0)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
  }

  // Ekstrak profil — jalan di background, silent fail
  const extractAndSaveProfile = async (extraMessages = []) => {
    if (!user?.id) return
    try {
      const combined = [...getChatHistoryForExtract(), ...extraMessages]
      const userCount = combined.filter(m => m.role === 'user').length
      if (userCount < 3) return
      await apiFetch('/api/extract-profile', { userId: user.id, messages: combined })
    } catch (e) {
      console.warn('[profile] extract error (silent):', e)
    }
  }

  // Trigger setelah setiap pesan user — API punya guard sendiri (min 3 msg)
  const maybeExtractProfile = (extraMessages = []) => {
    if (!user?.id) return
    extractAndSaveProfile(extraMessages).catch(() => {})
  }

  const doCoach = async (msg) => {
    const newHistory = [...coachHistory, { role: 'user', content: msg }]
    setCoachHistory(newHistory); setLoading(true); await callCoachApi(newHistory); setLoading(false)
    maybeExtractProfile()
  }

  const callCoachApi = async (history) => {
    try {
      const data = await apiFetch('/api/career-coach', { messages: history, userId: user?.id || null })
      setCoachHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      pushBot(data.reply, history.length <= 1 ? [{ id: '__menu', label: '🏠 Menu utama' }] : null)
    } catch { pushBot('Diah Anna lagi sibuk sebentar, coba lagi ya! 🙏') }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const [shareCard, setShareCard] = useState(null)
  const [showShareApp, setShowShareApp] = useState(false)

  const canUpload = ['cv-review-upload', 'ats-upload', 'cv-maker-upload'].includes(mode)

  return (
    <>
    {/* ── FIX UTAMA: position fixed + inset 0 → header tidak pernah hilang ── */}
    <div ref={containerRef} style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      height: 'calc(100vh - 65px)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wa-chat-bg)',
      overflow: 'hidden',
    }}>
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} user={user} />}
      {shareCard && <ShareCard resultText={shareCard.text} type={shareCard.type} onClose={() => setShareCard(null)} />}
      {showShareApp && <ShareAppModal onClose={() => setShowShareApp(false)} />}

      {/* ── Header — selalu fixed di atas ── */}
      <div style={{ background: 'var(--wa-header)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, zIndex: 10 }}>
        <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(37,211,102,0.4)' }}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
            Diah Anna
            <img src="/icons/verified.png" width="16" height="16" alt="verified" style={{ flexShrink: 0, marginTop: 1 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.73rem' }}>AI Career Coach • online</div>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          style={{ color: '#fff', fontSize: '0.72rem', padding: '3px 8px', background: plan === 'free' ? 'rgba(255,200,0,0.25)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {PLAN_LABEL[plan] || 'Free'}
        </button>
        <button onClick={() => setShowShareApp(true)} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontWeight: 600, padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          Bagikan
        </button>
        <button onClick={handleSignOut} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          Keluar
        </button>
      </div>

      {/* ── Menu shortcut tabs ── */}
      <div style={{ background: 'var(--wa-header)', padding: '0 10px 10px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {MAIN_MENU.map(item => (
          <button key={item.id} onClick={() => handleQuickReply(item.id, item.label)} disabled={loading}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 20, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, flexShrink: 0 }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Messages — satu-satunya yang scroll ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: '2px', WebkitOverflowScrolling: 'touch' }}>
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const ts = new Date(Math.floor(msg.id))
          const timeStr = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0')
          return (
          <div key={msg.id} style={{ marginBottom: msg.quickReplies ? 2 : 1 }}>
            <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '82%', background: isUser ? '#DCF8C6' : '#fff', borderRadius: isUser ? '14px 3px 14px 14px' : '3px 14px 14px 14px', padding: '9px 13px 5px', fontSize: '0.875rem', lineHeight: 1.55, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: '#111B21', wordBreak: 'break-word' }}>
                <div dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 }}>
                  <span style={{ fontSize: '0.68rem', color: isUser ? '#5d8a6a' : '#999', lineHeight: 1 }}>{timeStr}</span>
                  {isUser && (
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                      <path d="M1 6L4.5 9.5L10.5 2" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L9.5 9.5L15.5 2" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
            {msg.quickReplies && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '5px 4px 6px' }}>
                {msg.quickReplies.map(qr => (
                  <button key={qr.id} onClick={() => handleQuickReply(qr.id, qr.label)} disabled={loading}
                    style={{ background: '#fff', border: '1.5px solid #25D366', color: '#075E54', borderRadius: 20, padding: '5px 13px', fontSize: '0.8rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 2 }}>
            <div style={{ background: '#fff', borderRadius: '3px 14px 14px 14px', padding: '12px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#aaa', animation: `dot-bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Upload hint ── */}
      {canUpload && (
        <div style={{ background: '#e8f5e9', borderTop: '1px solid #c8e6c9', padding: '6px 14px', fontSize: '0.75rem', color: '#2e7d32', textAlign: 'center', flexShrink: 0 }}>
          📎 Klik ikon clip untuk upload PDF/Word, atau paste teks CV langsung
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{ background: '#f0f2f5', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderTop: '1px solid #e0e0e0' }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        <button onClick={() => canUpload && fileRef.current?.click()}
          style={{ width: 38, height: 38, borderRadius: '50%', background: canUpload ? '#25D366' : '#ccc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, cursor: canUpload ? 'pointer' : 'default' }}>
          📎
        </button>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); handleSend() } }}
          placeholder="Ketik pesan..." disabled={loading}
          style={{ flex: 1, background: '#fff', border: 'none', borderRadius: 24, padding: '10px 16px', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-body)' }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          style={{ width: 38, height: 38, borderRadius: '50%', background: !loading && input.trim() ? '#25D366' : '#ccc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, cursor: !loading && input.trim() ? 'pointer' : 'default', color: '#fff' }}>
          ➤
        </button>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5 }
          40% { transform: scale(1.2); opacity: 1 }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
    <BottomNav />
    </>
  )
}
