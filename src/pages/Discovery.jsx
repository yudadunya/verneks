import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const OPENING = {
  role: 'bot',
  text: 'Halo! 👋\n\nSaya Diah Anna.\n\nSaya ingin mengenal kamu lebih dulu agar bisa memetakan karier yang paling cocok.\n\nApa target karier terbesar kamu saat ini?',
  id: 'open'
}

export default function Discovery() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([OPENING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [computing, setComputing] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Cek session — kalau sudah login langsung ke dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate('/dashboard')
    })
  }, [])

  // Restore dari localStorage kalau ada
  useEffect(() => {
    const saved = localStorage.getItem('lc_discovery_messages')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.length > 1) {
          setMessages(parsed)
          const userCount = parsed.filter(m => m.role === 'user').length
          if (userCount >= 6) setShowResult(true)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', text, id: Date.now() }]
    setMessages(newMessages)
    localStorage.setItem('lc_discovery_messages', JSON.stringify(newMessages))
    setLoading(true)

    try {
      const res = await fetch('/api/discovery-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      const withReply = [...newMessages, { role: 'bot', text: data.reply, id: Date.now() + 1 }]
      setMessages(withReply)
      localStorage.setItem('lc_discovery_messages', JSON.stringify(withReply))
      if (data.showResultButton) setShowResult(true)
      if (data.discoveryComplete) {
        setTimeout(() => inputRef.current?.blur(), 100)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Koneksi bermasalah. Coba lagi ya! 🙏', id: Date.now() }])
    }
    setLoading(false)
  }

  const handleSeeResult = async () => {
    setComputing(true)
    const msgs = JSON.parse(localStorage.getItem('lc_discovery_messages') || '[]')
    try {
      const res = await fetch('/api/compute-genome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('lc_discovery_result', JSON.stringify(data.result))
        // Cek session — kalau belum login, wajib Google Sign In dulu
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/genome-result` }
          })
          return
        }
        navigate('/genome-result')
      }
    } catch {
      alert('Gagal menghitung genome. Coba lagi!')
    }
    setComputing(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100%', maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wa-chat-bg)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="wa-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexShrink: 0 }}>
        <img src="/diah-anna.png" alt="Diah Anna"
          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            Diah Anna
            <img src="/icons/verified.png" width="16" height="16" alt="verified" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>Career Discovery Coach</div>
        </div>
        <button onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}>
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{
            display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 6,
          }}>
            {m.role === 'bot' && (
              <img src="/diah-anna.png" alt=""
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginRight: 6, alignSelf: 'flex-end', flexShrink: 0 }} />
            )}
            <div style={{
              maxWidth: '80%',
              background: m.role === 'user' ? '#d9fdd3' : '#fff',
              borderRadius: m.role === 'user' ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
              padding: '8px 11px', fontSize: '0.88rem', lineHeight: 1.55,
              color: '#111', whiteSpace: 'pre-line',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
              dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
            />
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
            <img src="/diah-anna.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ background: '#fff', borderRadius: '3px 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(d => (
                <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', animation: `dot-bounce 1s ease ${d*0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        {/* Lihat Hasil Button */}
        {showResult && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <button onClick={handleSeeResult} disabled={computing}
              style={{
                background: computing ? '#aaa' : 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                padding: '12px 28px', borderRadius: 12, border: 'none',
                cursor: computing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {computing ? '⏳ Menganalisis...' : '🧬 Lihat Career DNA Kamu'}
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: '#f0f2f5', padding: '8px 10px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, borderTop: '1px solid #e0e0e0' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ketik jawabanmu..."
          disabled={loading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 22,
            border: '1px solid #e0e0e0', fontSize: '0.9rem',
            outline: 'none', background: '#fff',
          }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="wa-send-btn">
          ➤
        </button>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%,80%,100%{transform:scale(0.8);opacity:.5}
          40%{transform:scale(1.2);opacity:1}
        }
      `}</style>
    </div>
  )
}
