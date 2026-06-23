import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import Onboarding from '../components/Onboarding'
import ShareCard from '../components/ShareCard'
import ShareAppModal from '../components/ShareAppModal'
import BottomNav from '../components/BottomNav'

function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:0.9rem;margin:10px 0 3px;color:#111">$1</div>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:600;font-size:0.85rem;margin:8px 0 2px;color:#333">$1</div>')
    .replace(/\*\*(.+?)\*\"/g, '<strong>$1</strong>')
    .replace(/- (.+)$/gm, '<div style="padding:2px 0 2px 14px;position:relative"><span style="position:absolute;left:4px;color:var(--wa-green)">•</span>$1</div>')
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

const CV_FORMATS = [
  { id: 'fmt_ats',       label: '✅ ATS Friendly'    },
  { id: 'fmt_jobstreet', label: '🔍 JobStreet'        },
  { id: 'fmt_linkedin',  label: '💼 LinkedIn Profile' },
]

const DEFAULT_SUBSCRIPTION = {
  plan: 'free',
  loading: true,
  checkUsage: async () => false,
  logUsage: () => {},
  fetchPlan: () => {},
  getRemainingChat: async () => 0,
  isExpired: false,
}

// NOTE: getNextFocus() dihapus dari sini.
// Single source of truth sekarang adalah api/career-coach.js (action: 'init-chat'),
// supaya prioritas next-focus tidak pernah drift antara client dan server.

export default function Chat({ user, chatMessages = [], setChatMessages, subscription = DEFAULT_SUBSCRIPTION }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { plan, loading: subLoading, checkUsage, isExpired } = subscription

  const storageKey     = user?.id ? `lc_chat_${user.id}` : null
  const ONBOARDING_KEY = user?.id ? `onboarded_${user.id}` : null

  const messages    = chatMessages
  const setMessages = setChatMessages

  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [mode, setMode]                 = useState('coach')
  const [cvText, setCvText]             = useState('')
  const [interview, setInterview]       = useState({ position: '', level: '', messages: [], qNum: 0 })
  
  const coachKey = user?.id ? `lc_coach_${user.id}` : null
  const greetingKey     = user?.id ? `lc_greeted_${user.id}` : null
  const greetingFiredRef = useRef(false) 
  
  const [coachHistory, setCoachHistoryRaw] = useState(() => {
    if (!coachKey) return []
    try {
      const saved = localStorage.getItem(coachKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return []
  })

  const setCoachHistory = (updater) => {
    setCoachHistoryRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (coachKey) {
        try { localStorage.setItem(coachKey, JSON.stringify(next.slice(-30))) } catch {}
      }
      return next
    })
  }
  
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [shareCard, setShareCard] = useState(null)
  const [showShareApp, setShowShareApp] = useState(false)

  const bottomRef = useRef()
  const fileRef   = useRef()
  const containerRef = useRef()

  // ── Deep Memory: flag guard supaya tidak double-fire ─────────────────────
  const memoryFiredRef = useRef(false)

  // Kirim memory update ke server pakai sendBeacon (reliable saat tab ditutup)
  // atau fetch biasa (saat logout manual)
  const sendMemoryUpdate = useCallback((triggerType = 'visibility') => {
    if (!user?.id) return
    if (memoryFiredRef.current) return
    if (coachHistory.filter(m => m.role === 'user').length < 3) return

    memoryFiredRef.current = true

    const payload = JSON.stringify({
      userId:   user.id,
      messages: coachHistory.slice(-20),
      trigger:  triggerType,
    })

    // sendBeacon: dijamin terkirim walau tab ditutup (tapi tidak bisa await)
    if (triggerType !== 'logout' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/update-memory', new Blob([payload], { type: 'application/json' }))
    } else {
      // Logout manual: pakai fetch biasa karena kita masih punya waktu
      fetch('/api/update-memory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    payload,
        keepalive: true,
      }).catch(() => {})
    }
  }, [user?.id, coachHistory])

  const pushBot = useCallback((text, quickReplies = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, quickReplies }])
    window.dispatchEvent(new CustomEvent('diah-anna-replied'))
  }, [])

  const pushUser = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])
  }, [])

  // 1. Dashboard Mission Synchronization
  useEffect(() => {
    if (location.state?.triggerMission && user?.id) {
      const mission = location.state.triggerMission;
      const missionContext = `[SYSTEM SYNC]: User baru saja mengeksekusi Misi Harian dari Dashboard: "${mission}". Mulai percakapan dengan menanyakan kesiapan atau progres mereka mengenai misi ini secara taktis dan spesifik.`;
      
      const newHistory = [...coachHistory, { role: 'user', content: missionContext }];
      setCoachHistory(newHistory);
      setLoading(true);
      
      apiFetch('/api/career-coach', { messages: newHistory, userId: user.id })
        .then(data => {
          pushBot(data.reply);
          setCoachHistory([...newHistory, { role: 'assistant', content: data.reply }]);
          setLoading(false);
        })
        .catch(() => {
          pushBot(`Agenda kita saat ini terkunci pada misi: **${mission}**. Apa yang menjadi hambatan utamamu untuk menyelesaikannya hari ini?`);
          setLoading(false);
        });
        
      window.history.replaceState({}, document.title);
      greetingFiredRef.current = true; // Skip normal greeting
    }
  }, [location.state, user?.id]);

  // 2. Onboarding Flow
  useEffect(() => {
    if (!user?.id) return
    const key = `onboarded_${user.id}`
    if (localStorage.getItem(key)) { setShowOnboarding(false); return }
    
    supabase
      .from('user_career_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          localStorage.setItem(key, '1')
          setShowOnboarding(false)
        } else {
          setShowOnboarding(true)
        }
      })
  }, [user?.id])

  const handleOnboardingDone = (data) => {
    if (ONBOARDING_KEY) localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
    if (data?.nama) {
      const firstName = data.nama.split(' ')[0]
      pushBot(`Halo ${firstName}! 👋\n\nAku sudah mempelajari profil dan target spesifikmu untuk menjadi **${data.target || 'Profesional Unggul'}**.\n\nSebelum kita menyusun taktik pergerakan, aku ingin tahu satu hal penting:\n\n*Apa alasan terbesar yang membuat target ini begitu penting bagimu?*`)
    }
  }

  // 3. Proactive V2 Greeting — single source of truth: server-side init-chat.
  // Sebelumnya logic next-focus & teks greeting ditulis ulang di client,
  // sekarang sepenuhnya delegasi ke api/career-coach.js (action: init-chat)
  // supaya tidak ada drift antara prioritas next-focus client vs server.
  useEffect(() => {
    if (!user || subLoading || greetingFiredRef.current || (greetingKey && sessionStorage.getItem(greetingKey))) return

    greetingFiredRef.current = true
    if (greetingKey) sessionStorage.setItem(greetingKey, '1')

    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]

    apiFetch('/api/career-coach', { action: 'init-chat', userId: user.id })
      .then(data => {
        pushBot(data.openingMessage)
        if (coachHistory.length === 0) {
          setCoachHistory([
            { role: 'user', content: '[SYSTEM ENGINE V2 CONTEXT INJECTION] Sesi baru dimulai, greeting proaktif sudah dikirim oleh server.' },
            { role: 'assistant', content: data.openingMessage }
          ])
        }
      })
      .catch(() => {
        pushBot(`Halo ${firstName || 'Sobat'} 👋\n\nMari kita kunci kembali fokus pergerakan karirmu hari ini. Sampaikan kendala eksekusi yang kamu hadapi di lapangan agar bisa langsung kita bedah taktiknya.`)
      })
  }, [user?.id, plan, subLoading])

  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (containerRef.current) {
        containerRef.current.style.height = (vv.height - 65) + 'px'
        containerRef.current.style.top    = vv.offsetTop + 'px'
      }
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])

  // ── Deep Memory triggers ──────────────────────────────────────────────────
  // Reset flag tiap sesi baru (user berubah)
  useEffect(() => {
    memoryFiredRef.current = false
  }, [user?.id])

  useEffect(() => {
    // visibilitychange: tab ditutup, pindah tab, lock screen, dll
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendMemoryUpdate('visibility')
      }
    }
    // beforeunload: close browser / refresh paksa — backup
    const onBeforeUnload = () => {
      sendMemoryUpdate('beforeunload')
    }

    // logout manual: Profile.jsx dispatch event ini sebelum signOut
    const onLogout = () => sendMemoryUpdate('logout')

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('diah-anna-logout-memory', onLogout)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('diah-anna-logout-memory', onLogout)
    }
  }, [sendMemoryUpdate])

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput(''); pushUser(msg); 
    const newHistory = [...coachHistory, { role: 'user', content: msg }]
    setCoachHistory(newHistory)
    setLoading(true)
    
    apiFetch('/api/career-coach', { messages: newHistory, userId: user?.id })
      .then(data => {
        pushBot(data.reply)
        setCoachHistory([...newHistory, { role: 'assistant', content: data.reply }])
        apiFetch('/api/extract-profile', { userId: user?.id, messages: newHistory }).catch(() => {})
      })
      .catch(() => pushBot('Terjadi kepadatan jalur komunikasi. Sampaikan ulang poin terakhirmu.'))
      .finally(() => setLoading(false))
  }

  return (
    <>
    <div ref={containerRef} style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', background: 'var(--wa-chat-bg)', overflow: 'hidden' }}>
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} user={user} />}

      <div style={{ background: 'var(--wa-header)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, zIndex: 10 }}>
        <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(37,211,102,0.4)' }}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
            Diah Anna
            <img src="/icons/verified.png" width="16" height="16" alt="verified" style={{ flexShrink: 0, marginTop: 1 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.73rem' }}>Career Companion • aktif memantau</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          return (
          <div key={msg.id} style={{ marginBottom: msg.quickReplies ? 2 : 1 }}>
            <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '82%', background: isUser ? '#DCF8C6' : '#fff', borderRadius: isUser ? '14px 3px 14px 14px' : '3px 14px 14px 14px', padding: '9px 13px 5px', fontSize: '0.875rem', lineHeight: 1.55, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: '#111B21', wordBreak: 'break-word' }}>
                <div dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }} />
              </div>
            </div>
          </div>
          )
        })}
        {loading && <div style={{ background: '#fff', borderRadius: '3px 14px 14px 14px', padding: '12px 16px', width: 60, display: 'flex', gap: 4, marginTop: 4 }}>...</div>}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      <div style={{ background: '#f0f2f5', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderTop: '1px solid #e0e0e0' }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); handleSend() } }}
          placeholder="Ketik progres strategismu..." disabled={loading}
          style={{ flex: 1, background: '#fff', border: 'none', borderRadius: 24, padding: '10px 16px', fontSize: '0.9rem', outline: 'none' }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          style={{ width: 38, height: 38, borderRadius: '50%', background: !loading && input.trim() ? '#25D366' : '#ccc', border: 'none', color: '#fff' }}>➤</button>
      </div>
    </div>
    <BottomNav isPremium={plan === 'premium'} />
    </>
  )
}
