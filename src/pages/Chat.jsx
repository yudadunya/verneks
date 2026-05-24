import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useSubscription, LIMITS, FEATURE_LABEL } from '../hooks/useSubscription'

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
  { id: 'cv-review',  label: '📄 Review CV',     feature: 'cv_review'      },
  { id: 'ats',        label: '🎯 Cek ATS Score', feature: 'ats_checker'    },
  { id: 'interview',  label: '🎤 Mock Interview',feature: 'mock_interview'  },
  { id: 'cv-maker',   label: '✨ Bikin CV',       feature: 'cv_maker'       },
  { id: 'coach',      label: '🧠 Tanya Karir',   feature: 'diah_anna'      },
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

function paywallMessage(feature, plan) {
  const label  = FEATURE_LABEL[feature] || feature
  const limit  = LIMITS[plan]?.[feature] ?? 0
  const isPaid = plan !== 'free'
  if (limit === 0) return `🔒 *${label}* tidak tersedia di paket *${plan.toUpperCase()}*.\n\nUpgrade ke Pro untuk akses fitur ini.`
  if (isPaid) return `🔒 Kuota *${label}* bulan ini sudah habis (${limit}x).\n\nUpgrade paket untuk kuota lebih banyak, atau tunggu bulan depan.`
  return `🔒 Jatah gratis *${label}* kamu sudah habis (${limit}x).\n\nUpgrade ke Starter atau Pro untuk lanjut pakai fitur ini.`
}

const PRICING_QR = [
  { id: '__pricing', label: '⭐ Lihat paket & harga' },
  { id: '__menu',    label: '🏠 Kembali ke menu'      },
]

export default function Chat({ user }) {
  const navigate = useNavigate()
  const { plan, loading: subLoading, canUse, trackUsage } = useSubscription(user?.id)

  // Ambil riwayat coach dari localStorage saat pertama load
  const STORAGE_KEY = user?.id ? `coach_history_${user.id}` : null
  const savedHistory = STORAGE_KEY ? (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } })() : []

  const [messages, setMessages]         = useState([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [mode, setMode]                 = useState('menu')
  const [cvText, setCvText]             = useState('')
  const [interview, setInterview]       = useState({ position: '', level: '', messages: [], qNum: 0 })
  const [coachHistory, setCoachHistory] = useState(savedHistory)
  const [cvMakerInfo, setCvMakerInfo]   = useState({ text: '', format: '' })
  const bottomRef = useRef()
  const fileRef   = useRef()

  useEffect(() => { if (!user) navigate('/') }, [user])

  useEffect(() => {
    if (subLoading || !user) return
    const sessionKey = `greeted_${user.id}`
    const alreadyGreeted = sessionStorage.getItem(sessionKey)
    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]
    const planLabel = { free: 'Free', starter: 'Starter', pro: 'Pro' }[plan] || 'Free'
    if (!alreadyGreeted) {
      pushBot(
        `Halo${firstName ? ` ${firstName}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nPaket kamu: *${planLabel}*\n\nMau mulai dari mana hari ini?`,
        MAIN_MENU
      )
      sessionStorage.setItem(sessionKey, '1')
    } else {
      // tidak perlu pushBot saat refresh
    }
  }, [subLoading])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Simpan riwayat coach ke localStorage setiap kali berubah (max 50 pesan terakhir)
  useEffect(() => {
    if (!STORAGE_KEY) return
    const trimmed = coachHistory.slice(-50)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)) } catch {}
  }, [coachHistory]) // eslint-disable-line

  const pushBot = useCallback((text, quickReplies = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, quickReplies }])
  }, [])

  const pushUser = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])
  }, [])

  const checkPaywall = useCallback((feature) => {
    if (canUse(feature)) return true
    pushBot(paywallMessage(feature, plan), PRICING_QR)
    setMode('menu')
    return false
  }, [canUse, plan, pushBot])

  const handleFile = async (file) => {
    if (!file) return
    pushUser(`📎 ${file.name}`)
    setLoading(true)
    try {
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
      const data = await apiFetch('/api/parse-cv', { base64, fileName: file.name })
      setCvText(data.text)
      if (mode === 'cv-review-upload') { setMode('cv-review-job'); pushBot('CV berhasil dibaca! 📄\n\nKamu mau apply ke posisi apa? (opsional, ketik "-" kalau skip)', [{ id: '__skip_job', label: 'Skip langsung review' }]) }
      else if (mode === 'ats-upload')  { setMode('ats-jd');        pushBot('CV berhasil dibaca! 🎯\n\nPaste job description yang mau dilamar di sini. (opsional)', [{ id: '__skip_jd', label: 'Skip, cek aja' }]) }
    } catch (e) { pushBot(`Gagal baca file: ${e.message}\n\nCoba paste teks CV kamu langsung ya.`) }
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleQuickReply = (id, label) => {
    if (id === '__pricing') { navigate('/pricing'); return }
    pushUser(label)
    route(id, label)
  }

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    pushUser(msg)
    route(msg, msg)
  }

  const route = async (id, label) => {
    if (id === '__menu' || id === 'menu') { setMode('menu'); return }
    if (id === '__clear_coach') { setCoachHistory([]); if (STORAGE_KEY) try { localStorage.removeItem(STORAGE_KEY) } catch {}; pushBot('Riwayat dihapus. 🌱 Ketik pertanyaan karir kamu.'); return }
    if (id === 'cv-review')  { if (checkPaywall('cv_review'))     startCvReview();  return }
    if (id === 'ats')        { if (checkPaywall('ats_checker'))    startAts();       return }
    if (id === 'interview')  { if (checkPaywall('mock_interview')) startInterview(); return }
    if (id === 'cv-maker')   { if (checkPaywall('cv_maker'))       startCvMaker();   return }
    if (id === 'coach')      { if (checkPaywall('diah_anna'))      startCoach();     return }
    if (id === '__skip_job') { await doCvReview(''); return }
    if (id === '__skip_jd')  { await doAts('');       return }

    switch (mode) {
      case 'cv-review-upload': { setCvText(id); setMode('cv-review-job'); pushBot('Oke! Kamu mau apply ke posisi apa? (ketik "-" kalau skip)', [{ id: '__skip_job', label: 'Skip langsung review' }]); return }
      case 'cv-review-job':   { await doCvReview(id === '-' || id === '__skip_job' ? '' : id); return }
      case 'ats-upload':      { setCvText(id); setMode('ats-jd'); pushBot('Oke! Paste job description-nya di sini kalau ada. (opsional)', [{ id: '__skip_jd', label: 'Skip, cek aja' }]); return }
      case 'ats-jd':          { await doAts(id === '__skip_jd' ? '' : id); return }
      case 'interview-position': { setInterview(prev => ({ ...prev, position: id })); setMode('interview-level'); pushBot(`Posisi: *${id}*\n\nLevel pengalaman kamu?`, INTERVIEW_LEVELS); return }
      case 'interview-level':    { setInterview(prev => ({ ...prev, level: id })); await startInterviewSession(interview.position, id); return }
      case 'interview-active':   { await answerInterview(id); return }
      case 'cv-maker-info':   { setCvMakerInfo(prev => ({ ...prev, text: id })); setMode('cv-maker-format'); pushBot('Mau format CV apa?', CV_FORMATS); return }
      case 'cv-maker-format': { if (CV_FORMATS.find(f => f.id === id)) await doCvMaker(cvMakerInfo.text, id); return }
      case 'coach':           { await doCoach(id); return }
      default: {
        if (!checkPaywall('diah_anna')) return
        setMode('coach'); setCoachHistory([{ role: 'user', content: id }]); setLoading(true)
        await callCoachApi([{ role: 'user', content: id }]); setLoading(false)
      }
    }
  }

  const startCvReview  = () => { setMode('cv-review-upload'); setCvText(''); pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau langsung paste teks CV-nya di sini.') }
  const startAts       = () => { setMode('ats-upload'); setCvText(''); pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau paste teks CV-nya di sini.') }
  const startInterview = () => { setMode('interview-position'); setInterview({ position: '', level: '', messages: [], qNum: 0 }); pushBot('Siap latihan interview! 🎤\n\nMau melamar posisi apa?\n(contoh: Data Analyst, Software Engineer, Marketing Manager)') }
  const startCvMaker   = () => { setMode('cv-maker-info'); setCvMakerInfo({ text: '', format: '' }); pushBot('Oke, kita bikin CV kamu! ✨\n\nCeritakan tentang dirimu:\n• Nama lengkap\n• Posisi yang dituju\n• Pengalaman kerja\n• Pendidikan\n• Keahlian / skills') }
  const startCoach = () => {
    setMode('coach')
    // Tidak ada pesan tambahan — user langsung ketik
  }

  const doCvReview = async (jobTarget) => {
    setMode('cv-review-done'); setLoading(true); await trackUsage('cv_review')
    try { const data = await apiFetch('/api/cv-review', { cvText, jobTarget }); pushBot(data.review) }
    catch (e) { pushBot(`Aduh, ada error: ${e.message}`) }
    setLoading(false)
  }

  const doAts = async (jobDescription) => {
    setMode('ats-done'); setLoading(true); await trackUsage('ats_checker')
    try { const data = await apiFetch('/api/ats-checker', { cvText, jobDescription }); pushBot(data.result) }
    catch (e) { pushBot(`Error: ${e.message}`) }
    setLoading(false)
  }

  const startInterviewSession = async (position, level) => {
    setMode('interview-active'); setLoading(true); await trackUsage('mock_interview')
    try { const data = await apiFetch('/api/mock-interview', { action: 'start', position, level, messages: [] }); setInterview(prev => ({ ...prev, messages: [{ role: 'assistant', content: data.reply }], qNum: data.questionNumber })); pushBot(data.reply) }
    catch (e) { pushBot(`Error: ${e.message}`) }
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
        setMode('interview-done'); pushBot(fbData.feedback || 'Sesi interview selesai! 🎉')
      } else { pushBot(data.reply) }
    } catch (e) { pushBot(`Error: ${e.message}`) }
    setLoading(false)
  }

  const doCvMaker = async (infoText, format) => {
    setMode('cv-maker-done'); setLoading(true); await trackUsage('cv_maker')
    const nameGuess = infoText.split('\n')[0].replace(/nama\s*:?\s*/i, '').trim()
    try { const data = await apiFetch('/api/cv-maker', { mode: 'scratch', format, formData: { name: nameGuess || 'Nama Pengguna', experience: infoText, education: '', skills: '' } }); pushBot(data.result) }
    catch (e) { pushBot(`Error: ${e.message}`) }
    setLoading(false)
  }

  const doCoach = async (msg) => {
    const newHistory = [...coachHistory, { role: 'user', content: msg }]
    setCoachHistory(newHistory); setLoading(true); await callCoachApi(newHistory); setLoading(false)
  }

  const callCoachApi = async (history) => {
    await trackUsage('diah_anna')
    try {
      const name = user.user_metadata?.name || user.user_metadata?.full_name || ''
      const data = await apiFetch('/api/career-coach', { messages: history, userProfile: name ? `Nama: ${name}` : '' })
      setCoachHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      pushBot(data.reply)
    } catch { pushBot('Diah Anna lagi sibuk sebentar, coba lagi ya! 🙏') }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/') }
  const canUpload = ['cv-review-upload', 'ats-upload'].includes(mode)

  return (
    // ─── Layout: fixed full-screen, tidak geser saat keyboard/scroll ───────
    <div style={{
      position: 'fixed', inset: 0,           // ← fix header hilang saat scroll
      display: 'flex', flexDirection: 'column',
      background: 'var(--wa-chat-bg)',
      maxWidth: 480, margin: '0 auto',
      left: '50%', transform: 'translateX(-50%)',
      right: 'auto', width: '100%',
    }}>

      {/* ── Header — selalu terlihat karena parent fixed ── */}
      <div style={{
        background: 'var(--wa-header)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        flexShrink: 0,                        // ← tidak boleh menyusut
        zIndex: 10,
      }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🧠</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Diah Anna</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.73rem' }}>
            AI Career Coach • {subLoading ? 'memuat...' : `Paket ${plan.charAt(0).toUpperCase() + plan.slice(1)}`}
          </div>
        </div>
        <button onClick={handleSignOut} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          Keluar
        </button>
      </div>

      {/* ── Messages — satu-satunya area yang scroll ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: '2px', WebkitOverflowScrolling: 'touch' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: msg.quickReplies ? 2 : 1 }}>
            {msg.text && (
              <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{ maxWidth: '82%', background: msg.role === 'user' ? '#DCF8C6' : '#fff', borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px', padding: '9px 13px', fontSize: '0.875rem', lineHeight: 1.55, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: '#111B21', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}
                  dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
                />
              </div>
            )}
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
      `}</style>
    </div>
  )
}
