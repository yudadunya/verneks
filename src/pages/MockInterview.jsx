import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'

const POSITIONS = ['Data Analyst', 'Software Engineer', 'Product Manager', 'Marketing', 'UI/UX Designer', 'Business Analyst', 'HR', 'Finance', 'Sales', 'Lainnya']
const LEVELS = ['Fresh Grad', 'Junior (1-2 tahun)', 'Mid (3-5 tahun)', 'Senior (5+ tahun)']
const TOTAL_QUESTIONS = 6

export default function MockInterview({ user }) {
  const { plan, canUse, getRemainingUses, trackUsage, loading: subLoading } = useSubscription(user?.id)
  const [phase, setPhase] = useState('setup')
  const [position, setPosition] = useState('')
  const [level, setLevel] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [feedback, setFeedback] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const startInterview = async () => {
    if (!position || !level) return
    setLoading(true); setPhase('interview')
    await trackUsage('mock_interview')
    try {
      const res = await fetch('/api/mock-interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', position, level }) })
      const data = await res.json()
      setMessages([{ role: 'assistant', content: data.reply }]); setQuestionNumber(1)
    } catch { setMessages([{ role: 'assistant', content: 'Waduh ada error, coba lagi ya!' }]) }
    setLoading(false)
  }

  const sendAnswer = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/mock-interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'answer', position, level, messages: newMessages, questionNumber, totalQuestions: TOTAL_QUESTIONS }) })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      setQuestionNumber(data.questionNumber)
      if (data.isComplete) setTimeout(() => getFeedback([...newMessages, { role: 'assistant', content: data.reply }]), 1000)
    } catch { setMessages([...newMessages, { role: 'assistant', content: 'Ada error, coba lagi!' }]) }
    setLoading(false)
  }

  const getFeedback = async (finalMessages) => {
    setLoadingFeedback(true); setPhase('feedback')
    try {
      const res = await fetch('/api/mock-interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'feedback', position, level, messages: finalMessages }) })
      const data = await res.json(); setFeedback(data.feedback)
    } catch { setFeedback('Waduh gagal generate feedback. Coba refresh ya.') }
    setLoadingFeedback(false)
  }

  const reset = () => { setPhase('setup'); setPosition(''); setLevel(''); setMessages([]); setInput(''); setQuestionNumber(1); setFeedback(null) }

  if (subLoading) return (
    <div className="wa-screen">
      <div className="wa-header"><div className="wa-header-avatar">🎤</div><div><div className="wa-header-title">Mock Interview</div></div></div>
    </div>
  )
  if (!user) { window.location.href = '/register'; return null }
  if (!canUse('mock_interview')) return <FeatureGate canUse={false} feature="mock_interview" plan={plan} user={user} />

  // SETUP
  if (phase === 'setup') return (
    <div className="wa-screen">
      <div className="wa-header">
        <button className="wa-header-back" onClick={() => window.history.back()}>‹</button>
        <div className="wa-header-avatar" style={{ background: '#FF9800' }}>🎤</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Mock Interview</div>
          <div className="wa-header-subtitle">dengan Diah Anna · AI</div>
        </div>
      </div>

      <div className="wa-section-header">Posisi yang dilamar</div>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid var(--wa-border)' }}>
        <div className="wa-chip-group" style={{ padding: 0 }}>
          {POSITIONS.map(p => (
            <button key={p} className={`wa-chip ${position === p ? 'selected' : ''}`} onClick={() => setPosition(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="wa-section-header">Level pengalaman</div>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid var(--wa-border)' }}>
        <div className="wa-chip-group" style={{ padding: 0 }}>
          {LEVELS.map(l => (
            <button key={l} className={`wa-chip ${level === l ? 'selected' : ''}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="wa-alert green">
        📋 <strong>{TOTAL_QUESTIONS} pertanyaan</strong> · ⏱️ 15-20 menit · 💬 Jawab seperti interview sungguhan!
      </div>

      <div style={{ padding: '16px' }}>
        <button
          className="wa-btn-primary"
          onClick={startInterview}
          disabled={!position || !level || loading}
          style={{ opacity: (!position || !level) ? 0.5 : 1 }}
        >
          {loading ? 'Mempersiapkan...' : '🎤 Mulai Interview'}
        </button>
      </div>
      <div style={{ height: '64px' }} />
    </div>
  )

  // FEEDBACK
  if (phase === 'feedback') return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar" style={{ background: '#FF9800' }}>🎤</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Feedback Interview</div>
          <div className="wa-header-subtitle">{position} · {level}</div>
        </div>
      </div>

      {loadingFeedback ? (
        <div className="wa-empty" style={{ flex: 1 }}>
          <span className="wa-empty-icon">⏳</span>
          <p className="wa-empty-text">Diah Anna lagi nulis feedback lengkap kamu...</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid var(--wa-border)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
          <div style={{ padding: '16px 0' }}>
            <button className="wa-btn-primary" onClick={reset}>🔄 Coba Interview Lagi</button>
          </div>
        </div>
      )}
      <div style={{ height: '64px' }} />
    </div>
  )

  // INTERVIEW CHAT
  const progress = Math.min(questionNumber - 1, TOTAL_QUESTIONS)
  return (
    <div className="wa-screen" style={{ height: '100vh', flexDirection: 'column' }}>
      <div className="wa-header">
        <div className="wa-header-avatar" style={{ background: '#FF9800', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>DA</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Diah Anna · Interview</div>
          <div className="wa-header-subtitle">{position} · {loading ? 'mengetik...' : `Pertanyaan ${progress}/${TOTAL_QUESTIONS}`}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
          {progress}/{TOTAL_QUESTIONS}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.3)' }}>
        <div style={{ height: '100%', background: 'var(--wa-green)', width: `${(progress / TOTAL_QUESTIONS) * 100}%`, transition: 'width 0.5s' }} />
      </div>

      <div className="wa-chat-area" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg, i) => {
          const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={i} className={`wa-bubble-wrap ${msg.role === 'user' ? 'outgoing' : 'incoming'}`}>
              <div className={`wa-bubble ${msg.role === 'user' ? 'outgoing' : 'incoming'}`}>
                {msg.role === 'assistant'
                  ? <div className="wa-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  : msg.content}
                <div className="wa-bubble-time">{time}{msg.role === 'user' ? ' ✓✓' : ''}</div>
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="wa-bubble-wrap incoming">
            <div className="wa-typing"><div className="wa-typing-dot" /><div className="wa-typing-dot" /><div className="wa-typing-dot" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="wa-input-bar">
        <div className="wa-input-wrap">
          <textarea
            className="wa-input"
            rows={2}
            placeholder="Jawab seperti interview sungguhan..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendAnswer())}
            disabled={loading}
          />
        </div>
        <button className="wa-send-btn" onClick={sendAnswer} disabled={loading || !input.trim()}>➤</button>
      </div>
      <div style={{ height: '64px' }} />
    </div>
  )
}
