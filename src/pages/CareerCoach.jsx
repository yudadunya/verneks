import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const SUGGESTED_TOPICS = [
  'Review CV aku dong',
  'Tips interview besok',
  'Cara negosiasi gaji',
  'Aku mau career switch',
  'Cara naik jabatan',
  'LinkedIn aku perlu dibenahi gak?',
]

export default function CareerCoach({ user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

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
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Waduh, koneksi lagi gangguan nih. Coba kirim lagi ya! 🙏'
      }])
    }
    setLoading(false)
  }

  const isFirstMessage = messages.length === 0

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.avatar}>DA</div>
        <div>
          <div style={styles.name}>Diah Anna</div>
          <div style={styles.role}>Career Coach · AI</div>
        </div>
        <div style={styles.onlineDot} />
      </div>

      {/* Chat area */}
      <div style={styles.chatArea}>
        {isFirstMessage && (
          <div style={styles.welcome}>
            <div style={styles.welcomeAvatar}>DA</div>
            <div style={styles.welcomeBubble}>
              <p>Hei! Saya <strong>Diah Anna</strong>, career coach kamu 👋</p>
              <p style={{ marginTop: '8px' }}>Mau cerita soal karir, CV, interview, atau apapun — saya siap dengerin dan bantu. Mulai dari mana dulu?</p>
            </div>

            <div style={styles.suggestions}>
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => sendMessage(topic)}
                  style={styles.suggestionBtn}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.userRow : styles.assistantRow}>
            {msg.role === 'assistant' && (
              <div style={styles.msgAvatar}>DA</div>
            )}
            <div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              {msg.role === 'assistant' ? (
                <div style={styles.markdown}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
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
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          placeholder="Cerita ke Diah Anna..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={styles.sendBtn}
        >
          ↑
        </button>
      </div>

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
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 64px)',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 0',
    borderBottom: '1px solid var(--border)',
    position: 'relative',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'var(--green)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
    fontFamily: 'var(--font-display)',
    flexShrink: 0,
  },
  name: {
    fontWeight: 700,
    fontSize: '1rem',
    fontFamily: 'var(--font-display)',
  },
  role: {
    fontSize: '0.75rem',
    color: 'var(--gray)',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    marginLeft: 'auto',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  welcome: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  welcomeAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--green)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  welcomeBubble: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '0 16px 16px 16px',
    padding: '16px',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    maxWidth: '480px',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px',
  },
  suggestionBtn: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: 'var(--green-dark)',
    borderRadius: '100px',
    padding: '8px 16px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  assistantRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  msgAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--green)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.7rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  userBubble: {
    background: 'var(--green)',
    color: '#fff',
    borderRadius: '16px 16px 0 16px',
    padding: '12px 16px',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    maxWidth: '480px',
  },
  assistantBubble: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '0 16px 16px 16px',
    padding: '12px 16px',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    maxWidth: '520px',
  },
  typingBubble: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '0 16px 16px 16px',
    padding: '16px',
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--gray)',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite',
  },
  markdown: {
    fontSize: '0.95rem',
    lineHeight: 1.7,
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '16px 0',
    borderTop: '1px solid var(--border)',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--border)',
    borderRadius: '100px',
    fontSize: '0.95rem',
    outline: 'none',
    background: '#fff',
    fontFamily: 'var(--font-body)',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'var(--green)',
    color: '#fff',
    border: 'none',
    fontSize: '1.2rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
}
