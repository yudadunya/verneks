import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'

const SUGGESTED_TOPICS = [
  'Review CV aku dong',
  'Tips interview besok',
  'Cara negosiasi gaji',
  'Aku mau career switch',
  'Cara naik jabatan',
  'LinkedIn aku perlu dibenahi gak?',
]

export default function CareerCoach({ user }) {
  const { plan, canUse, getRemainingUses, trackUsage, loading: subLoading } = useSubscription(user?.id)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    if (messages.length === 0) await trackUsage('diah_anna')

    try {
      const res = await fetch('/api/career-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userProfile: user ? `Nama: ${user.user_metadata?.full_name || 'User'}` : null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Waduh, koneksi lagi gangguan nih. Coba kirim lagi ya! 🙏' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (subLoading) return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar">🧠</div>
        <div><div className="wa-header-title">Diah Anna</div><div className="wa-header-subtitle">Memuat...</div></div>
      </div>
    </div>
  )

  if (!user) { window.location.href = '/register'; return null }

  if (!canUse('diah_anna') && messages.length === 0) return (
    <FeatureGate canUse={false} feature="diah_anna" plan={plan} user={user} />
  )

  const remaining = getRemainingUses('diah_anna')
  const isFirst = messages.length === 0

  return (
    <div className="wa-screen" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* WA Chat Header */}
      <div className="wa-header">
        <div className="wa-header-avatar" style={{ background: '#9C27B0', fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>DA</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Diah Anna 🧠</div>
          <div className="wa-header-subtitle">
            {loading ? 'mengetik...' : 'Career Coach · AI · Online'}
          </div>
        </div>
        {plan !== 'platinum' && (
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>
            {remaining} sesi<br />tersisa
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="wa-chat-area" style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>

        {/* Welcome message */}
        {isFirst && (
          <>
            <div className="wa-section-divider"><span>Mulai percakapan</span></div>
            <div className="wa-bubble-wrap incoming">
              <div>
                <div className="wa-bubble incoming">
                  <p>Hei! Saya <strong>Diah Anna</strong>, career coach kamu 👋</p>
                  <p style={{ marginTop: '6px' }}>Mau cerita soal karir, CV, interview, atau apapun — saya siap dengerin dan bantu. Mulai dari mana dulu?</p>
                  <div className="wa-bubble-time">sekarang ✓</div>
                </div>
                <div className="wa-quick-replies" style={{ paddingLeft: 0 }}>
                  {SUGGESTED_TOPICS.map((topic) => (
                    <button key={topic} className="wa-quick-reply" onClick={() => sendMessage(topic)}>
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Messages */}
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

        {/* Typing */}
        {loading && (
          <div className="wa-bubble-wrap incoming">
            <div className="wa-typing">
              <div className="wa-typing-dot" />
              <div className="wa-typing-dot" />
              <div className="wa-typing-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="wa-input-bar">
        <div className="wa-input-wrap">
          <textarea
            ref={inputRef}
            className="wa-input"
            placeholder="Cerita ke Diah Anna..."
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>
        <button
          className="wa-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>

      {/* Bottom nav spacer */}
      <div style={{ height: '64px' }} />
    </div>
  )
}
