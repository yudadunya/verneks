import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Onboarding from '../components/Onboarding'
import ShareCard from '../components/ShareCard'
import ShareAppModal from '../components/ShareAppModal'
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
  { id: 'ats',       label: '✅ ATS Friendly'    },
  { id: 'jobstreet', label: '🔍 JobStreet'        },
  { id: 'linkedin',  label: '💼 LinkedIn Profile' },
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
  const handleOnboardingDone = () => {
    if (ONBOARDING_KEY) localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }

  const bottomRef = useRef()
  const fileRef   = useRef()

  // ── Auth guard + greeting ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
    // Cek localStorage langsung — bukan messages state yang mungkin belum sync
    const key = user.id ? `lc_chat_${user.id}` : null
    if (key) {
      try {
        const saved = localStorage.getItem(key)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return // ada riwayat, skip greeting
        }
      } catch {}
    }
    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]
    pushBot(`Halo${firstName ? ` ${firstName}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nPilih fitur di atas atau langsung ketik pertanyaanmu ya!`)
  }, [user?.id])

  // ── Simpan ke localStorage setiap messages berubah ───────────────────
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const pushBot = useCallback((text, quickReplies = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, quickReplies }])
  }, [])

  const pushUser = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])
  }, [])

  // ── Paywall ────────────────────────────────────────────────────────────
  const showPaywall = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const label = FEATURE_LABEL[feature] || feature
    const msg = limit === 0
      ? `🔒 **${label}** tidak tersedia di paket **${PLAN_LABEL[plan]}**.\n\nUpgrade ke Pro untuk akses fitur ini!`
      : `🔒 Jatah **${label}** kamu sudah habis (${limit}x${plan !== 'free' ? '/bulan' : ''}).\n\nUpgrade untuk lanjut pakai fitur ini!`
    pushBot(msg, [
      { id: '__pricing', label: '⭐ Lihat Paket Upgrade' },
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
    if (id === '__share_app') { setShowShareApp(true); return }
    if (id === '__share_cv')  { const m = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 100); setShareCard({ text: m?.text || '', type: 'cv-review' }); return }
    if (id === '__share_ats') { const m = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 100); setShareCard({ text: m?.text || '', type: 'ats' }); return }
    if (id === '__pricing') { navigate('/pricing'); return }
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
      case 'cv-maker-info':   { setCvMakerInfo(prev => ({ ...prev, text: id })); setMode('cv-maker-format'); pushBot('Mau format CV apa?', CV_FORMATS); return }
      case 'cv-maker-format': { if (CV_FORMATS.find(f => f.id === id)) await doCvMaker(cvMakerInfo.text, id); return }
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
    setMode('cv-maker-info'); setCvMakerInfo({ text: '', format: '' })
    pushBot('Oke, kita bikin CV kamu! ✨\n\nCeritakan tentang dirimu:\n• Nama lengkap\n• Posisi yang dituju\n• Pengalaman kerja\n• Pendidikan\n• Keahlian / skills\n\nBisa panjang, nanti aku rapikan jadi CV profesional.')
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
    } catch (e) { pushBot(`Aduh, ada error: ${e.message}\n\nCoba lagi ya! 🙏`); setMode('menu') }
    setLoading(false)
  }

  const doAts = async (jobDescription) => {
    setMode('ats-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/ats-checker', { cvText, jobDescription })
      logUsage('ats')
      pushBot(data.result, [{ id: 'cv-review', label: '📄 Review CV juga' }, { id: '__share_ats', label: '📤 Bagikan hasil' }, { id: '__share_app', label: '👥 Ajak teman coba' }, { id: '__menu', label: '🏠 Kembali ke menu' }])
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
        pushBot(fbData.feedback || 'Sesi selesai! Kamu hebat! 🎉', [{ id: 'interview', label: '🔄 Interview lagi' }, { id: '__menu', label: '🏠 Kembali ke menu' }])
      } else { pushBot(data.reply) }
    } catch (e) { pushBot(`Error: ${e.message}`) }
    setLoading(false)
  }

  const doCvMaker = async (infoText, format) => {
    setMode('cv-maker-done'); setLoading(true)
    const nameGuess = infoText.split('\n')[0].replace(/nama\s*:?\s*/i, '').trim()
    try {
      const data = await apiFetch('/api/cv-maker', { mode: 'scratch', format, formData: { name: nameGuess || 'Nama Pengguna', experience: infoText, education: '', skills: '' } })
      logUsage('cv-maker')
      pushBot(data.result, [{ id: 'ats', label: '🎯 Cek ATS Score' }, { id: '__menu', label: '🏠 Kembali ke menu' }])
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    setLoading(false)
  }

  // Keyword yang trigger paywall langsung
  const PAID_TRIGGERS = {
    mock_interview: ['mock interview', 'latihan interview', 'simulasi interview', 'interview aku', 'interview saya', 'practice interview'],
    cv_review:      ['review cv', 'review cv aku', 'cek cv', 'koreksi cv', 'nilai cv', 'analisa cv', 'feedback cv'],
    cv_maker:       ['bikin cv', 'buat cv', 'buatkan cv', 'generate cv', 'cv maker', 'template cv', 'tulis cv'],
    ats_checker:    ['cek ats', 'ats score', 'skor ats', 'lolos ats'],
  }

  const checkPaidTrigger = (msg) => {
    const lower = msg.toLowerCase()
    for (const [feature, keywords] of Object.entries(PAID_TRIGGERS)) {
      if (keywords.some(kw => lower.includes(kw))) return feature
    }
    return null
  }

  const doCoach = async (msg) => {
    // Cek apakah user minta fitur berbayar secara eksplisit
    const triggeredFeature = checkPaidTrigger(msg)
    if (triggeredFeature) {
      const canUse = await checkUsage(triggeredFeature)
      if (!canUse) {
        showPaywall(triggeredFeature)
        return
      }
    }
    const newHistory = [...coachHistory, { role: 'user', content: msg }]
    setCoachHistory(newHistory); setLoading(true); await callCoachApi(newHistory); setLoading(false)
  }

  const callCoachApi = async (history) => {
    try {
      const name = user.user_metadata?.name || user.user_metadata?.full_name || ''
      const data = await apiFetch('/api/career-coach', { messages: history, userProfile: name ? `Nama: ${name}` : '' })
      setCoachHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      pushBot(data.reply, history.length <= 1 ? [{ id: '__menu', label: '🏠 Menu utama' }] : null)
    } catch { pushBot('Diah Anna lagi sibuk sebentar, coba lagi ya! 🙏') }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut(); navigate('/')
  }

  const [shareCard, setShareCard] = useState(null)
  const [showShareApp, setShowShareApp] = useState(false)

  const canUpload = ['cv-review-upload', 'ats-upload'].includes(mode)

  return (
    // ── FIX UTAMA: position fixed + inset 0 → header tidak pernah hilang ──
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, bottom: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--wa-chat-bg)',
    }}>
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} />}
      {shareCard && <ShareCard resultText={shareCard.text} type={shareCard.type} onClose={() => setShareCard(null)} />}
      {showShareApp && <ShareAppModal onClose={() => setShowShareApp(false)} />}

      {/* ── Header — selalu fixed di atas ── */}
      <div style={{ background: 'var(--wa-header)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, zIndex: 10 }}>
        <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(37,211,102,0.4)' }}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Diah Anna</div>
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
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: msg.quickReplies ? 2 : 1 }}>
            <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{ maxWidth: '82%', background: msg.role === 'user' ? '#DCF8C6' : '#fff', borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px', padding: '9px 13px', fontSize: '0.875rem', lineHeight: 1.55, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: '#111B21', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
              />
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
        ))}

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
  )
}
