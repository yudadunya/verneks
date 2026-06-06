import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'
import { supabase } from '../lib/supabase'

const SUGGESTED_TOPICS = [
  'Review CV aku dong',
  'Tips interview besok',
  'Cara negosiasi gaji',
  'Aku mau career switch',
  'Cara naik jabatan',
  'LinkedIn aku perlu dibenahi gak?',
]

const MAX_HISTORY = 50 // maksimal pesan yang disimpan & diload per user

export default function CareerCoach({ user }) {
  const { plan, canUse, getRemainingUses, trackUsage, loading: subLoading } = useSubscription(user?.id)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const isPaid = plan === 'premium'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Load histori dari Supabase (hanya untuk plan berbayar) ──
  useEffect(() => {
    if (subLoading || historyLoaded) return
    if (!user?.id || !isPaid) { setHistoryLoaded(true); return }
    loadHistory()
  }, [subLoading, user?.id, isPaid])

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('career_coach_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(MAX_HISTORY)
      if (error) throw error
      if (data?.length) setMessages(data)
    } catch (e) {
      console.error('[CareerCoach] loadHistory error:', e.message)
    }
    setHistoryLoaded(true)
  }

  // ── Simpan 2 pesan terakhir (user + assistant) ke Supabase ──
  const saveToSupabase = async (msgs) => {
    if (!isPaid || !user?.id) return
    try {
      const newMsgs = msgs.slice(-2)
      await supabase.from('career_coach_messages').insert(
        newMsgs.map(m => ({ user_id: user.id, role: m.role, content: m.content }))
      )
      // Trim pesan lama kalau melebihi MAX_HISTORY
      const { count } = await supabase
        .from('career_coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (count > MAX_HISTORY) {
        const { data: oldest } = await supabase
          .from('career_coach_messages')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(count - MAX_HISTORY)
        if (oldest?.length) {
          await supabase
            .from('career_coach_messages')
            .delete()
            .in('id', oldest.map(r => r.id))
        }
      }
    } catch (e) {
      console.error('[CareerCoach] saveToSupabase error:', e.message)
    }
  }

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
          userId: user?.id,
          userProfile: user ? `Nama: ${user.user_metadata?.full_name || 'User'}` : null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const finalMessages = [...newMessages, { role: 'assistant', content: data.reply }]
      setMessages(finalMessages)
      await saveToSupabase(finalMessages)
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

  if (subLoading || (isPaid && !historyLoaded)) return (
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
  const isFirst   = messages.length === 0

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

        {/* Notice untuk Free user */}
        {!isPaid && messages.length === 0 && (
          <div style={{
            margin: '8px 16px',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '8px',
            fontSize: '0.72rem',
            color: '#666',
            textAlign: 'center',
          }}>
            💡 Histori chat tidak tersimpan di perangkat lain.{' '}
            <a href="/pricing" style={{ color: '#1a73e8', fontWeight: 600 }}>Upgrade ke Premium</a> untuk sinkronisasi antar device.
          </div>
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
