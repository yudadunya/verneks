import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'

const POSITIONS = [
  'Data Analyst', 'Software Engineer', 'Product Manager', 'Marketing',
  'UI/UX Designer', 'Business Analyst', 'HR', 'Finance', 'Sales', 'Lainnya'
]

const LEVELS = ['Fresh Grad', 'Junior (1-2 tahun)', 'Mid (3-5 tahun)', 'Senior (5+ tahun)']

const TOTAL_QUESTIONS = 6

export default function MockInterview({ user }) {
  const { plan, canUse, trackUsage, loading: subLoading } = useSubscription(user?.id)
  console.log('plan:', plan, 'canUse mock:', canUse('mock_interview'))
  const [phase, setPhase] = useState('setup') // setup | interview | feedback
  const [position, setPosition] = useState('')
  const [level, setLevel] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [feedback, setFeedback] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const startInterview = async () => {
    if (!position || !level) return
    setLoading(true)
    setPhase('interview')
    await trackUsage('mock_interview')

    try {
      const res = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', position, level }),
      })
      const data = await res.json()
      setMessages([{ role: 'assistant', content: data.reply }])
      setQuestionNumber(1)
    } catch (e) {
      setMessages([{ role: 'assistant', content: 'Waduh ada error, coba lagi ya!' }])
    }
    setLoading(false)
  }

  const sendAnswer = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          position,
          level,
          messages: newMessages,
          questionNumber,
          totalQuestions: TOTAL_QUESTIONS,
        }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      setQuestionNumber(data.questionNumber)

      if (data.isComplete) {
        setTimeout(() => getFeedback([...newMessages, { role: 'assistant', content: data.reply }]), 1000)
      }
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Ada error, coba lagi!' }])
    }
    setLoading(false)
  }

  const getFeedback = async (finalMessages) => {
    setLoadingFeedback(true)
    setPhase('feedback')
    try {
      const res = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', position, level, messages: finalMessages }),
      })
      const data = await res.json()
      setFeedback(data.feedback)
    } catch (e) {
      setFeedback('Waduh gagal generate feedback. Coba refresh ya.')
    }
    setLoadingFeedback(false)
  }

  const reset = () => {
    setPhase('setup')
    setPosition('')
    setLevel('')
    setMessages([])
    setInput('')
    setQuestionNumber(1)
    setFeedback(null)
  }

  // SETUP PHASE
  if (subLoading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)' }}>Memuat...</div>
if (!user) {
  window.location.href = '/register'
  return null
}
  if (!canUse('mock_interview')) return (
    <FeatureGate canUse={false} feature="mock_interview" plan={plan} />
  )

  if (phase === 'setup') return (
    <main style={styles.page}>
      <div style={styles.setupContainer}>
        <div style={styles.setupHeader}>
          <div style={styles.avatar}>DA</div>
          <div>
            <h1 style={styles.title}>🎤 Mock Interview</h1>
            <p style={styles.sub}>Latihan interview bareng Diah Anna — feedback jujur, bukan basa-basi.</p>
          </div>
        </div>

        <div style={styles.setupCard}>
          <div style={styles.field}>
            <label style={styles.label}>Posisi yang dilamar</label>
            <div style={styles.chipGrid}>
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  style={{ ...styles.chip, ...(position === p ? styles.chipActive : {}) }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Level pengalaman</label>
            <div style={styles.chipGrid}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  style={{ ...styles.chip, ...(level === l ? styles.chipActive : {}) }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.infoBox}>
            <p>📋 Sesi ini terdiri dari <strong>{TOTAL_QUESTIONS} pertanyaan</strong></p>
            <p>⏱️ Estimasi waktu: <strong>15-20 menit</strong></p>
            <p>💬 Jawab seperti interview sungguhan ya!</p>
          </div>

          <button
            onClick={startInterview}
            disabled={!position || !level || loading}
            style={{ ...styles.startBtn, opacity: (!position || !level) ? 0.5 : 1 }}
          >
            {loading ? 'Mempersiapkan...' : 'Mulai Interview →'}
          </button>
        </div>
      </div>
    </main>
  )

  // FEEDBACK PHASE
  if (phase === 'feedback') return (
    <main style={styles.page}>
      <div style={styles.feedbackContainer}>
        <div style={styles.feedbackHeader}>
          <div style={styles.avatar}>DA</div>
          <div>
            <h2 style={styles.title}>Feedback Interview Kamu</h2>
            <p style={styles.sub}>{position} · {level}</p>
          </div>
        </div>

        {loadingFeedback ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{ color: 'var(--gray)' }}>Diah Anna lagi nulis feedback lengkap kamu...</p>
          </div>
        ) : (
          <div style={styles.feedbackCard}>
            <div style={styles.markdown}>
              <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
            <button onClick={reset} style={styles.retryBtn}>
              🔄 Coba Interview Lagi
            </button>
          </div>
        )}
      </div>
    </main>
  )

  // INTERVIEW PHASE
  return (
    <div style={styles.chatPage}>
      {/* Header */}
      <div style={styles.chatHeader}>
        <div style={styles.avatar}>DA</div>
        <div style={{ flex: 1 }}>
          <div style={styles.name}>Diah Anna · Mock Interview</div>
          <div style={styles.role}>{position} · {level}</div>
        </div>
        <div style={styles.progress}>
          {Math.min(questionNumber - 1, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{
          ...styles.progressFill,
          width: `${(Math.min(questionNumber - 1, TOTAL_QUESTIONS) / TOTAL_QUESTIONS) * 100}%`
        }} />
      </div>

      {/* Chat */}
      <div style={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.userRow : styles.assistantRow}>
            {msg.role === 'assistant' && <div style={styles.msgAvatar}>DA</div>}
            <div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              {msg.role === 'assistant' ? (
                <div style={styles.markdown}><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              ) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={styles.assistantRow}>
            <div style={styles.msgAvatar}>DA</div>
            <div style={styles.typingBubble}>
              <span style={styles.dot} />
              <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
              <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {phase === 'interview' && (
        <div style={styles.inputArea}>
          <textarea
            style={styles.textarea}
            placeholder="Jawab seperti interview sungguhan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendAnswer())}
            disabled={loading}
            rows={3}
          />
          <button onClick={sendAnswer} disabled={loading || !input.trim()} style={styles.sendBtn}>
            ↑
          </button>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  page: { padding: '40px 24px', minHeight: 'calc(100vh - 64px)' },
  setupContainer: { maxWidth: '680px', margin: '0 auto' },
  setupHeader: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' },
  avatar: {
    width: '48px', height: '48px', borderRadius: '50%',
    background: 'var(--green)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
    fontFamily: 'var(--font-display)',
  },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, marginBottom: '4px' },
  sub: { color: 'var(--gray)', fontSize: '0.9rem' },
  setupCard: {
    background: '#fff', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '32px',
  },
  field: { marginBottom: '24px' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    padding: '8px 16px', borderRadius: '100px',
    border: '1px solid var(--border)', background: '#fff',
    fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
    color: 'var(--dark)',
  },
  chipActive: {
    background: 'var(--green)', color: '#fff',
    border: '1px solid var(--green)',
  },
  infoBox: {
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: '12px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '6px',
    fontSize: '0.875rem', color: 'var(--dark)', marginBottom: '24px',
  },
  startBtn: {
    width: '100%', background: 'var(--green)', color: '#fff',
    fontWeight: 600, fontSize: '1rem', padding: '14px',
    borderRadius: '12px', border: 'none', cursor: 'pointer',
  },
  feedbackContainer: { maxWidth: '800px', margin: '0 auto' },
  feedbackHeader: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' },
  feedbackCard: {
    background: '#fff', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '32px',
  },
  loadingBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '16px', padding: '80px',
  },
  spinner: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid var(--green)', borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
  },
  retryBtn: {
    marginTop: '24px', background: 'var(--green)', color: '#fff',
    fontWeight: 600, fontSize: '0.95rem', padding: '12px 24px',
    borderRadius: '10px', border: 'none', cursor: 'pointer',
  },
  chatPage: {
    display: 'flex', flexDirection: 'column',
    height: 'calc(100vh - 64px)', maxWidth: '800px',
    margin: '0 auto', padding: '0 24px',
  },
  chatHeader: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px 0', borderBottom: '1px solid var(--border)',
  },
  name: { fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-display)' },
  role: { fontSize: '0.75rem', color: 'var(--gray)' },
  progress: {
    fontWeight: 700, fontSize: '0.875rem',
    color: 'var(--green)', background: '#f0fdf4',
    padding: '4px 12px', borderRadius: '100px',
  },
  progressBar: {
    height: '3px', background: '#e5e7e0',
    borderRadius: '100px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: 'var(--green)',
    borderRadius: '100px', transition: 'width 0.5s ease',
  },
  chatArea: {
    flex: 1, overflowY: 'auto',
    padding: '24px 0', display: 'flex',
    flexDirection: 'column', gap: '16px',
  },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  assistantRow: { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  msgAvatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--green)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.7rem', flexShrink: 0, marginTop: '2px',
  },
  userBubble: {
    background: 'var(--green)', color: '#fff',
    borderRadius: '16px 16px 0 16px',
    padding: '12px 16px', fontSize: '0.95rem',
    lineHeight: 1.6, maxWidth: '520px',
  },
  assistantBubble: {
    background: '#fff', border: '1px solid var(--border)',
    borderRadius: '0 16px 16px 16px',
    padding: '12px 16px', fontSize: '0.95rem',
    lineHeight: 1.6, maxWidth: '560px',
  },
  typingBubble: {
    background: '#fff', border: '1px solid var(--border)',
    borderRadius: '0 16px 16px 16px',
    padding: '16px', display: 'flex', gap: '4px', alignItems: 'center',
  },
  dot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: 'var(--gray)', display: 'inline-block',
    animation: 'bounce 1.2s infinite',
  },
  markdown: { fontSize: '0.95rem', lineHeight: 1.7 },
  inputArea: {
    display: 'flex', gap: '8px',
    padding: '16px 0', borderTop: '1px solid var(--border)',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1, padding: '12px 16px',
    border: '1px solid var(--border)', borderRadius: '16px',
    fontSize: '0.95rem', outline: 'none',
    background: '#fff', fontFamily: 'var(--font-body)',
    resize: 'none', lineHeight: 1.5,
  },
  sendBtn: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'var(--green)', color: '#fff',
    border: 'none', fontSize: '1.2rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
}

