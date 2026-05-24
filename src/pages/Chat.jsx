import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

// ─── Simple Markdown Renderer ───────────────────────────────────────────────
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

// ─── Safe JSON fetch ─────────────────────────────────────────────────────────
async function apiFetch(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error(text.slice(0, 120)) }
  if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`)
  return data
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MAIN_MENU = [
  { id: 'cv-review',  label: '📄 Review CV',      desc: 'Feedback AI untuk CV kamu'       },
  { id: 'ats',        label: '🎯 Cek ATS Score',  desc: 'Seberapa lolos ATS?'              },
  { id: 'interview',  label: '🎤 Mock Interview', desc: 'Latihan interview kerja'          },
  { id: 'cv-maker',   label: '✨ Bikin CV',        desc: 'CV profesional dalam menit'      },
  { id: 'coach',      label: '🧠 Tanya Karir',    desc: 'Chat bebas sama Diah Anna'       },
]

const INTERVIEW_LEVELS = [
  { id: 'Fresh Graduate', label: '🌱 Fresh Graduate' },
  { id: 'Junior (1-3 thn)', label: '🔰 Junior (1-3 thn)' },
  { id: 'Mid (3-5 thn)', label: '⭐ Mid (3-5 thn)' },
  { id: 'Senior (5+ thn)', label: '🏆 Senior (5+ thn)' },
]

const CV_FORMATS = [
  { id: 'ats',       label: '✅ ATS Friendly'    },
  { id: 'jobstreet', label: '🔍 JobStreet'        },
  { id: 'linkedin',  label: '💼 LinkedIn Profile' },
]

// ─── Main Chat Component ─────────────────────────────────────────────────────
export default function Chat({ user }) {
  const navigate = useNavigate()
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [mode, setMode]               = useState('menu')
  // Collected data across turns
  const [cvText, setCvText]           = useState('')
  const [interview, setInterview]     = useState({ position: '', level: '', messages: [], qNum: 0 })
  const [coachHistory, setCoachHistory] = useState([])
  const [cvMakerInfo, setCvMakerInfo] = useState({ text: '', format: '' })
  const bottomRef = useRef()
  const fileRef   = useRef()

  // ── localStorage key per user ────────────────────────────────────────────
  const storageKey = user ? `lc_chat_${user.id}` : null

  // ── Auth guard, load history or show welcome ──────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch {}
    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]
    pushBot(`Halo${firstName ? ` ${firstName}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nPilih fitur di atas atau langsung ketik pertanyaanmu ya!`)
  }, [])

  // ── Simpan pesan ke localStorage setiap ada perubahan ────────────────────
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages])

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // ── Message helpers ───────────────────────────────────────────────────────
  const pushBot = useCallback((text, quickReplies = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, quickReplies }])
  }, [])

  const pushUser = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])
  }, [])

  // ── File upload (parse CV) ────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    pushUser(`📎 ${file.name}`)
    setLoading(true)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const data = await apiFetch('/api/parse-cv', { base64, fileName: file.name })

      setCvText(data.text)
      if (mode === 'cv-review-upload') {
        setMode('cv-review-job')
        pushBot('CV berhasil dibaca! 📄\n\nKamu mau apply ke posisi apa? (opsional, ketik "-" kalau skip)', [
          { id: '__skip_job', label: 'Skip langsung review' },
        ])
      } else if (mode === 'ats-upload') {
        setMode('ats-jd')
        pushBot('CV berhasil dibaca! 🎯\n\nPaste job description yang mau dilamar di sini. (opsional)', [
          { id: '__skip_jd', label: 'Skip, cek aja' },
        ])
      }
    } catch (e) {
      pushBot(`Gagal baca file: ${e.message}\n\nCoba paste teks CV kamu langsung ya.`)
    }
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Quick reply click ─────────────────────────────────────────────────────
  const handleQuickReply = (id, label) => {
    pushUser(label)
    route(id, label)
  }

  // ── Text send ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    pushUser(msg)
    route(msg, msg)
  }

  // ── Central router ────────────────────────────────────────────────────────
  const route = async (id, label) => {
    // ── Named feature shortcuts ────────────────────────────────────────────
    if (id === '__menu' || id === 'menu') {
      setMode('menu')
      pushBot('Oke! Mau ngapain lagi?', MAIN_MENU)
      return
    }
    if (id === 'cv-review')  { startCvReview(); return }
    if (id === 'ats')        { startAts(); return }
    if (id === 'interview')  { startInterview(); return }
    if (id === 'cv-maker')   { startCvMaker(); return }
    if (id === 'coach')      { startCoach(); return }

    // ── Skips ──────────────────────────────────────────────────────────────
    if (id === '__skip_job') { await doCvReview('') ; return }
    if (id === '__skip_jd')  { await doAts('');        return }

    // ── Mode-based routing ─────────────────────────────────────────────────
    switch (mode) {
      case 'cv-review-upload': {
        // User pasted CV text
        setCvText(id)
        setMode('cv-review-job')
        pushBot('Oke! Kamu mau apply ke posisi apa? (ketik "-" kalau skip)', [
          { id: '__skip_job', label: 'Skip langsung review' },
        ])
        return
      }

      case 'cv-review-job': {
        const job = (id === '-' || id === '__skip_job') ? '' : id
        await doCvReview(job)
        return
      }

      case 'ats-upload': {
        setCvText(id)
        setMode('ats-jd')
        pushBot('Oke! Paste job description-nya di sini kalau ada. (opsional)', [
          { id: '__skip_jd', label: 'Skip, cek aja' },
        ])
        return
      }

      case 'ats-jd': {
        const jd = (id === '__skip_jd') ? '' : id
        await doAts(jd)
        return
      }

      case 'interview-position': {
        setInterview(prev => ({ ...prev, position: id }))
        setMode('interview-level')
        pushBot(`Posisi: *${id}*\n\nLevel pengalaman kamu?`, INTERVIEW_LEVELS)
        return
      }

      case 'interview-level': {
        const level = id
        const position = interview.position
        setInterview(prev => ({ ...prev, level }))
        await startInterviewSession(position, level)
        return
      }

      case 'interview-active': {
        await answerInterview(id)
        return
      }

      case 'cv-maker-info': {
        setCvMakerInfo(prev => ({ ...prev, text: id }))
        setMode('cv-maker-format')
        pushBot('Mau format CV apa?', CV_FORMATS)
        return
      }

      case 'cv-maker-format': {
        const fmt = CV_FORMATS.find(f => f.id === id)
        if (fmt) {
          await doCvMaker(cvMakerInfo.text, id)
        }
        return
      }

      case 'coach': {
        await doCoach(id)
        return
      }

      default: {
        // Anything typed in menu mode → goes to coach
        setMode('coach')
        setCoachHistory([{ role: 'user', content: id }])
        setLoading(true)
        await callCoachApi([{ role: 'user', content: id }])
        setLoading(false)
      }
    }
  }

  // ── Feature starters ──────────────────────────────────────────────────────
  const startCvReview = () => {
    setMode('cv-review-upload')
    setCvText('')
    pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau langsung paste teks CV-nya di sini.')
  }

  const startAts = () => {
    setMode('ats-upload')
    setCvText('')
    pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau paste teks CV-nya di sini.')
  }

  const startInterview = () => {
    setMode('interview-position')
    setInterview({ position: '', level: '', messages: [], qNum: 0 })
    pushBot('Siap latihan interview! 🎤\n\nMau melamar posisi apa?\n(contoh: Data Analyst, Software Engineer, Marketing Manager)')
  }

  const startCvMaker = () => {
    setMode('cv-maker-info')
    setCvMakerInfo({ text: '', format: '' })
    pushBot('Oke, kita bikin CV kamu! ✨\n\nCeritakan tentang dirimu:\n• Nama lengkap\n• Posisi yang dituju\n• Pengalaman kerja\n• Pendidikan\n• Keahlian / skills\n\nBisa panjang, nanti aku rapikan jadi CV profesional.')
  }

  const startCoach = () => {
    setMode('coach')
    setCoachHistory([])
    pushBot('Halo! Aku Diah Anna 💙\n\nMau ngobrolin apa soal karir kamu?')
  }

  // ── CV Review API ─────────────────────────────────────────────────────────
  const doCvReview = async (jobTarget) => {
    setMode('cv-review-done')
    setLoading(true)
    try {
      const data = await apiFetch('/api/cv-review', { cvText, jobTarget })
      pushBot(data.review, [
        { id: 'ats', label: '🎯 Cek ATS Score juga' },
        { id: '__menu', label: '🏠 Kembali ke menu' },
      ])
    } catch (e) {
      pushBot(`Aduh, ada error: ${e.message}\n\nCoba lagi ya! 🙏`)
      setMode('menu')
    }
    setLoading(false)
  }

  // ── ATS Checker API ───────────────────────────────────────────────────────
  const doAts = async (jobDescription) => {
    setMode('ats-done')
    setLoading(true)
    try {
      const data = await apiFetch('/api/ats-checker', { cvText, jobDescription })
      pushBot(data.result, [
        { id: 'cv-review', label: '📄 Review CV juga' },
        { id: '__menu', label: '🏠 Kembali ke menu' },
      ])
    } catch (e) {
      pushBot(`Error: ${e.message}`)
      setMode('menu')
    }
    setLoading(false)
  }

  // ── Mock Interview API ────────────────────────────────────────────────────
  const startInterviewSession = async (position, level) => {
    setMode('interview-active')
    setLoading(true)
    try {
      const data = await apiFetch('/api/mock-interview', { action: 'start', position, level, messages: [] })
      const msgs = [{ role: 'assistant', content: data.reply }]
      setInterview(prev => ({ ...prev, messages: msgs, qNum: data.questionNumber }))
      pushBot(data.reply)
    } catch (e) {
      pushBot(`Error: ${e.message}`)
      setMode('menu')
    }
    setLoading(false)
  }

  const answerInterview = async (answer) => {
    setLoading(true)
    const newMsgs = [...interview.messages, { role: 'user', content: answer }]
    try {
      const data = await apiFetch('/api/mock-interview', {
          action: 'answer',
          position: interview.position,
          level: interview.level,
          messages: newMsgs,
          questionNumber: interview.qNum,
        })
      const updatedMsgs = [...newMsgs, { role: 'assistant', content: data.reply }]
      setInterview(prev => ({ ...prev, messages: updatedMsgs, qNum: data.questionNumber }))

      if (data.isComplete) {
        pushBot(data.reply)
        // Get full feedback
        const fbData = await apiFetch('/api/mock-interview', { action: 'feedback', position: interview.position, level: interview.level, messages: updatedMsgs })
        setMode('interview-done')
        pushBot(fbData.feedback || 'Sesi interview selesai! Kamu hebat! 🎉', [
          { id: 'interview', label: '🔄 Interview lagi' },
          { id: '__menu', label: '🏠 Kembali ke menu' },
        ])
      } else {
        pushBot(data.reply)
      }
    } catch (e) {
      pushBot(`Error: ${e.message}`)
    }
    setLoading(false)
  }

  // ── CV Maker API ──────────────────────────────────────────────────────────
  const doCvMaker = async (infoText, format) => {
    setMode('cv-maker-done')
    setLoading(true)
    // Extract name from first line as best guess
    const nameGuess = infoText.split('\n')[0].replace(/nama\s*:?\s*/i, '').trim()
    try {
      const data = await apiFetch('/api/cv-maker', {
          mode: 'scratch',
          format,
          formData: {
            name: nameGuess || 'Nama Pengguna',
            experience: infoText,
            education: '',
            skills: '',
          },
        })
      pushBot(data.result, [
        { id: 'ats', label: '🎯 Cek ATS Score' },
        { id: '__menu', label: '🏠 Kembali ke menu' },
      ])
    } catch (e) {
      pushBot(`Error: ${e.message}`)
      setMode('menu')
    }
    setLoading(false)
  }

  // ── Career Coach API ──────────────────────────────────────────────────────
  const doCoach = async (msg) => {
    const newHistory = [...coachHistory, { role: 'user', content: msg }]
    setCoachHistory(newHistory)
    setLoading(true)
    await callCoachApi(newHistory)
    setLoading(false)
  }

  const callCoachApi = async (history) => {
    try {
      const name = user.user_metadata?.name || user.user_metadata?.full_name || ''
      const data = await apiFetch('/api/career-coach', { messages: history, userProfile: name ? `Nama: ${name}` : '' })
      setCoachHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      pushBot(data.reply, coachHistory.length === 0 ? [
        { id: '__menu', label: '🏠 Menu utama' },
      ] : null)
    } catch {
      pushBot('Diah Anna lagi sibuk sebentar, coba lagi ya! 🙏')
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    if (storageKey) localStorage.removeItem(storageKey)
    await supabase.auth.signOut()
    navigate('/')
  }

  // ── Upload button state ───────────────────────────────────────────────────
  const canUpload = ['cv-review-upload', 'ats-upload'].includes(mode)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--wa-chat-bg)', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'var(--wa-header)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: '#25D366',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', overflow: 'hidden', flexShrink: 0,
        }}>
          🧠
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Diah Anna</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.73rem' }}>AI Career Coach • online</div>
        </div>
        {user?.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', opacity: 0.9 }}
          />
        )}
        <button
          onClick={handleSignOut}
          style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}
        >
          Keluar
        </button>
      </div>

      {/* ── Menu Fitur Statis ── */}
      <div style={{
        background: 'var(--wa-header)',
        padding: '0 10px 10px',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {MAIN_MENU.map(item => (
          <button
            key={item.id}
            onClick={() => handleQuickReply(item.id, item.label)}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 20,
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: msg.quickReplies ? 2 : 1 }}>
            {/* Bubble */}
            <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '82%',
                  background: msg.role === 'user' ? '#DCF8C6' : '#fff',
                  borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                  padding: '9px 13px',
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  color: '#111B21',
                  wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
              />
            </div>

            {/* Quick replies */}
            {msg.quickReplies && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '5px 4px 6px', justifyContent: 'flex-start' }}>
                {msg.quickReplies.map(qr => (
                  <button
                    key={qr.id}
                    onClick={() => handleQuickReply(qr.id, qr.label)}
                    disabled={loading}
                    style={{
                      background: '#fff',
                      border: '1.5px solid #25D366',
                      color: '#075E54',
                      borderRadius: 20,
                      padding: '5px 13px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    }}
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing dots */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 2 }}>
            <div style={{
              background: '#fff',
              borderRadius: '3px 14px 14px 14px',
              padding: '12px 16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#aaa',
                  animation: `dot-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Upload hint ── */}
      {canUpload && (
        <div style={{
          background: '#e8f5e9',
          borderTop: '1px solid #c8e6c9',
          padding: '6px 14px',
          fontSize: '0.75rem',
          color: '#2e7d32',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          📎 Klik ikon clip untuk upload PDF/Word, atau paste teks CV langsung
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        background: '#f0f2f5',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        borderTop: '1px solid #e0e0e0',
      }}>
        {/* File attach */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <button
          onClick={() => canUpload && fileRef.current?.click()}
          title={canUpload ? 'Upload CV (PDF/Word)' : 'Upload tersedia saat Review CV atau ATS Checker'}
          style={{
            width: 38, height: 38,
            borderRadius: '50%',
            background: canUpload ? '#25D366' : '#ccc',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
            flexShrink: 0,
            cursor: canUpload ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          📎
        </button>

        {/* Text input */}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); handleSend() } }}
          placeholder="Ketik pesan..."
          disabled={loading}
          style={{
            flex: 1,
            background: '#fff',
            border: 'none',
            borderRadius: 24,
            padding: '10px 16px',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'var(--font-body)',
          }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            width: 38, height: 38,
            borderRadius: '50%',
            background: !loading && input.trim() ? '#25D366' : '#ccc',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem',
            flexShrink: 0,
            cursor: !loading && input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s',
            color: '#fff',
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5 }
          40% { transform: scale(1.2); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
