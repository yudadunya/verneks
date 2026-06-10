import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const OPENING = {
  role: 'bot',
  text: 'Halo! 👋\n\nSaya Diah Anna.\n\nSaya ingin mengenal kamu lebih dulu agar bisa memetakan karier yang paling cocok.\n\nApa target karier terbesar kamu saat ini?',
  id: 'open'
}

const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1', insight: 'Kamu cenderung berpikir sistematis, suka data, dan membuat keputusan berbasis fakta. Cocok untuk peran yang butuh analisis mendalam dan pemecahan masalah kompleks.' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1', insight: 'Kamu punya dorongan alami untuk memimpin, mengarahkan, dan menginspirasi orang lain. Peran manajerial atau kepemimpinan tim adalah arena terbaikmu.' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366', insight: 'Kamu senang membangun sesuatu dari nol — sistem, produk, atau proses. Kamu paling produktif ketika bisa melihat hasil nyata dari pekerjaanmu.' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D', insight: 'Kamu punya kemampuan berpikir orisinal dan ekspresif. Kamu berkembang di lingkungan yang menghargai inovasi, desain, dan ide-ide segar.' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8', insight: 'Kamu pandai menyampaikan ide dengan jelas dan membangun hubungan. Peran yang melibatkan presentasi, negosiasi, atau kolaborasi lintas tim adalah kekuatanmu.' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A', insight: 'Kamu nyaman dengan ketidakpastian dan berani mengambil langkah besar. Lingkungan startup, entrepreneurship, atau peran strategis sangat cocok untukmu.' },
]

// Mapping posisi → roles yang cocok
const CAREER_RELATIVES = {
  'data analyst':      [['Data Analyst', 88], ['Business Analyst', 82], ['Product Analyst', 76]],
  'product manager':   [['Product Manager', 90], ['Product Analyst', 84], ['Growth Manager', 78]],
  'software engineer': [['Software Engineer', 91], ['Backend Engineer', 85], ['DevOps Engineer', 77]],
  'ui ux':             [['UI/UX Designer', 89], ['Product Designer', 83], ['UX Researcher', 75]],
  'marketing':         [['Digital Marketer', 87], ['Growth Hacker', 81], ['Brand Manager', 74]],
  'finance':           [['Financial Analyst', 86], ['Business Analyst', 80], ['Risk Analyst', 72]],
  'hr':                [['HR Business Partner', 88], ['Talent Acquisition', 82], ['People Ops', 76]],
  'default':           [['Posisi Target', 87], ['Posisi Terkait', 81], ['Posisi Alternatif', 74]],
}

function getOpportunities(targetPosisi) {
  if (!targetPosisi) return CAREER_RELATIVES.default
  const key = targetPosisi.toLowerCase()
  for (const [k, v] of Object.entries(CAREER_RELATIVES)) {
    if (k === 'default') continue
    if (key.includes(k) || k.split(' ').some(w => key.includes(w))) return v
  }
  return CAREER_RELATIVES.default
}

// ── Komponen Hasil Analisis (ditampilkan inline) ──────────────────────────────
function AnalysisResult({ result, onSave, saving }) {
  const [revealed, setRevealed] = useState(false)
  const [expandedGenome, setExpandedGenome] = useState(null)

  useEffect(() => { setTimeout(() => setRevealed(true), 80) }, [])

  if (!result) return null

  const gs          = result.genome_scores || {}
  const p           = result.profile_preview || {}
  const growth      = result.growth_state || {}
  const gapSkills   = result.gap_skills || []
  const gpsSteps    = result.gps_steps || []
  const readiness   = result.career_readiness || 0
  const opportunities = getOpportunities(p.target_posisi)

  const sortedGenome = [...GENOME_MAP]
    .map(g => ({ ...g, val: gs[g.key] || 0 }))
    .filter(g => g.val > 0)
    .sort((a, b) => b.val - a.val)

  const topGenome = sortedGenome.slice(0, 3)

  const fade = (delay = 0) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  })

  return (
    <div style={{ background: '#0a0f0d', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* ── Header hasil ── */}
      <div style={{ background: 'rgba(37,211,102,0.07)', borderBottom: '1px solid rgba(37,211,102,0.15)', padding: '14px 18px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/diah-anna.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.82rem' }}>Diah Anna selesai menganalisis kamu</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem' }}>Hasil Career Discovery</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 18px 180px', maxWidth: 480, margin: '0 auto' }}>

        {/* ── Hero: Target + Readiness ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,211,102,0.1), rgba(52,183,241,0.06))',
          border: '1px solid rgba(37,211,102,0.2)',
          borderRadius: 18, padding: '20px', marginBottom: 14,
          ...fade(0)
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', letterSpacing: '1.5px', marginBottom: 4 }}>🎯 TARGET KARIER</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2, marginBottom: 10 }}>
                {p.target_posisi || 'Karier Impianmu'}
              </div>
              {p.posisi_saat_ini && (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                  Dari: {p.posisi_saat_ini}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
              <div style={{ color: '#25D366', fontWeight: 900, fontSize: '2rem', lineHeight: 1 }}>{readiness}%</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', marginTop: 2 }}>Career Readiness</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 6, marginTop: 14, overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(90deg,#25D366,#34B7F1)',
              height: '100%', borderRadius: 99,
              width: revealed ? `${readiness}%` : '0%',
              transition: 'width 1.4s ease 0.3s',
            }} />
          </div>
        </div>

        {/* ── Career Gap Analysis ── */}
        {gapSkills.length > 0 && (
          <div style={{
            background: 'rgba(255,183,77,0.06)', border: '1px solid rgba(255,183,77,0.18)',
            borderRadius: 16, padding: '16px', marginBottom: 14,
            ...fade(0.08)
          }}>
            <div style={{ color: '#FFB74D', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>⚠ Gap Utama</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {gapSkills.slice(0, 4).map((skill, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i === 0 ? '#EF5350' : i === 1 ? '#FFB74D' : 'rgba(255,255,255,0.25)',
                    flexShrink: 0,
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: i === 0 ? 600 : 400 }}>{skill}</span>
                </div>
              ))}
            </div>
            {result.gap_summary && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', lineHeight: 1.6 }}>
                {result.gap_summary}
              </div>
            )}
          </div>
        )}

        {/* ── Career Genome ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '16px', marginBottom: 14,
          ...fade(0.14)
        }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: 14 }}>🧠 Career Genome</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedGenome.map((g, i) => (
              <div key={g.key}>
                <div
                  onClick={() => setExpandedGenome(expandedGenome === g.key ? null : g.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {g.emoji} {g.label}
                    </span>
                    <span style={{ color: g.color, fontWeight: 800, fontSize: '0.88rem' }}>{g.val}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                    <div style={{
                      background: g.color, height: '100%', borderRadius: 99,
                      width: revealed ? `${g.val}%` : '0%',
                      transition: `width 0.9s ease ${0.3 + i * 0.07}s`,
                    }} />
                  </div>
                </div>
                {expandedGenome === g.key && (
                  <div style={{ marginTop: 7, padding: '9px 11px', background: `${g.color}11`, border: `1px solid ${g.color}22`, borderRadius: 9, fontSize: '0.78rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>
                    {GENOME_MAP.find(m => m.key === g.key)?.insight || '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem' }}>Tap nama untuk lihat insight</div>
        </div>

        {/* ── Cocok untuk kamu ── */}
        <div style={{
          background: 'rgba(52,183,241,0.05)', border: '1px solid rgba(52,183,241,0.15)',
          borderRadius: 16, padding: '16px', marginBottom: 14,
          ...fade(0.20)
        }}>
          <div style={{ color: '#34B7F1', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>💼 Cocok untuk Kamu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {opportunities.map(([role, pct], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: i === 0 ? 700 : 400 }}>
                  {i === 0 && p.target_posisi ? p.target_posisi : role}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: i === 0 ? '#34B7F1' : 'rgba(52,183,241,0.4)',
                      width: revealed ? `${pct}%` : '0%',
                      transition: `width 0.9s ease ${0.5 + i * 0.1}s`,
                    }} />
                  </div>
                  <span style={{ color: i === 0 ? '#34B7F1' : 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── GPS Preview (3 step pertama visible, sisanya blur) ── */}
        {gpsSteps.length > 0 && (
          <div style={{
            background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.15)',
            borderRadius: 16, padding: '16px', marginBottom: 14,
            ...fade(0.26)
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.85rem' }}>🗺️ Career GPS (Preview)</div>
              <div style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>6 LANGKAH</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', marginBottom: 12 }}>Roadmap personal untuk {p.target_posisi || 'target kariermu'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gpsSteps.map((step, i) => {
                const isVisible = i < 3
                const isDone = step.done
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10,
                    background: isDone ? 'rgba(37,211,102,0.1)' : isVisible ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                    border: isDone ? '1px solid rgba(37,211,102,0.2)' : isVisible ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.03)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? '#25D366' : isVisible ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700,
                      color: isDone ? '#fff' : isVisible ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                    }}>
                      {isDone ? '✓' : isVisible ? i + 1 : '🔒'}
                    </div>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: isDone ? 600 : 500,
                      color: isDone ? '#25D366' : isVisible ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)',
                      filter: !isVisible ? 'blur(4px)' : 'none',
                      userSelect: !isVisible ? 'none' : 'auto',
                      flex: 1,
                    }}>
                      {step.title}
                    </span>
                    {!isVisible && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,13,0.5)', backdropFilter: 'blur(1px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>🔒 Tersimpan setelah login</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Pesan Diah Anna ── */}
        {result.mentor_message && (
          <div style={{
            background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)',
            borderRadius: 14, padding: '14px', marginBottom: 14,
            display: 'flex', gap: 10,
            ...fade(0.32)
          }}>
            <img src="/diah-anna.png" alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.72rem', marginBottom: 5 }}>Pesan dari Diah Anna</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', lineHeight: 1.65 }}>{result.mentor_message}</div>
            </div>
          </div>
        )}

      </div>

      {/* ── CTA Fixed Bottom ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        padding: '16px 18px 32px',
        background: 'linear-gradient(to top, #0a0f0d 70%, transparent)',
      }}>
        <div style={{ marginBottom: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>🔒</span>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', fontWeight: 600 }}>Simpan hasil + buka roadmap lengkap</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Gratis · Login dengan Google · 30 detik</div>
            </div>
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            width: '100%', padding: '15px',
            background: saving ? 'rgba(37,211,102,0.4)' : 'linear-gradient(135deg,#25D366,#128C7E)',
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            borderRadius: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 24px rgba(37,211,102,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? (
            <>⏳ Menyimpan...</>
          ) : (
            <>
              <GoogleIcon />
              🚀 Simpan Hasil Saya
            </>
          )}
        </button>
        <div style={{ textAlign: 'center', marginTop: 7, color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem' }}>
          Hasil & roadmap tersimpan otomatis ke akunmu
        </div>
      </div>

    </div>
  )
}

// Google Icon kecil
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#fff" fillOpacity="0.9" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#fff" fillOpacity="0.7" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#fff" fillOpacity="0.8" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#fff" fillOpacity="0.9" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

// ── Main Discovery Component ──────────────────────────────────────────────────
export default function Discovery() {
  const navigate = useNavigate()
  const [messages, setMessages]     = useState([OPENING])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showResultBtn, setShowResultBtn] = useState(false)
  const [computing, setComputing]   = useState(false)

  // Fase: 'chat' | 'result'
  const [phase, setPhase]           = useState('chat')
  const [result, setResult]         = useState(null)
  const [saving, setSaving]         = useState(false)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Kalau sudah login DAN sudah punya data Discovery → ke /chat
  // Kalau sudah login tapi belum punya data → tetap di /discovery
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: cp } = await supabase
          .from('user_career_profiles')
          .select('career_readiness')
          .eq('user_id', session.user.id)
          .maybeSingle()
        // Sudah punya data → ke /chat
        // Belum ada data tapi sudah login → tetap di /discovery (bisa re-do onboarding)
        // Tapi kalau premium dan tidak sengaja masuk sini → langsung balik
        if (cp?.career_readiness != null) {
          navigate('/chat')
        } else if (cp !== null) {
          // Profile ada tapi career_readiness belum → tetap di discovery
        } else {
          // Cek plan — kalau premium, berarti lewat jalur lain, balik ke chat
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (sub?.plan === 'premium') navigate('/chat')
        }
      }
    })
  }, [])

  // Restore chat dari localStorage
  useEffect(() => {
    const savedMsgs = localStorage.getItem('lc_discovery_messages')
    const savedResult = localStorage.getItem('lc_discovery_result')
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult)
        setResult(parsed)
        setPhase('result')
        return
      } catch {}
    }
    if (savedMsgs) {
      try {
        const parsed = JSON.parse(savedMsgs)
        if (parsed?.length > 1) {
          setMessages(parsed)
          const userCount = parsed.filter(m => m.role === 'user').length
          if (userCount >= 6) setShowResultBtn(true)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (phase === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, phase])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', text, id: Date.now() }]
    setMessages(newMessages)
    try { localStorage.setItem('lc_discovery_messages', JSON.stringify(newMessages)) } catch {}
    setLoading(true)

    try {
      const res = await fetch('/api/discovery-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      if (!res.ok || !data.reply) throw new Error(data.error || 'Reply kosong')
      const withReply = [...newMessages, { role: 'bot', text: data.reply, id: Date.now() + 1 }]
      setMessages(withReply)
      try { localStorage.setItem('lc_discovery_messages', JSON.stringify(withReply)) } catch {}
      if (data.showResultButton) setShowResultBtn(true)
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Waduh, ada gangguan koneksi. 🙏\n\nSilakan ketik ulang pesanmu atau refresh halaman.',
        id: Date.now()
      }])
    }
    setLoading(false)
  }

  // Klik "Lihat Career DNA" → compute genome → tampilkan hasil inline
  const handleComputeResult = async () => {
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
        setResult(data.result)
        setPhase('result')  // ← tampilkan hasil, BUKAN redirect
      } else {
        alert('Gagal menganalisis. Coba lagi!')
      }
    } catch {
      alert('Koneksi bermasalah. Coba lagi!')
    }
    setComputing(false)
  }

  // Klik "Simpan Hasil Saya" → Google OAuth → setelah login App.jsx handle sync
  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/discovery` }
      })
      // Setelah redirect balik, App.jsx akan sync discovery_result ke Supabase
    } catch {
      alert('Gagal login. Coba lagi!')
      setSaving(false)
    }
  }

  // ── Fase hasil: tampilkan AnalysisResult ──
  if (phase === 'result') {
    return <AnalysisResult result={result} onSave={handleSave} saving={saving} />
  }

  // ── Fase chat: Discovery conversation ──
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
              dangerouslySetInnerHTML={{ __html: (m.text || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
            />
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
            <img src="/diah-anna.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ background: '#fff', borderRadius: '3px 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', animation: `dot-bounce 1s ease ${d * 0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Tombol "Lihat Career DNA" muncul setelah cukup data */}
        {showResultBtn && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0 8px' }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '3px 12px 12px 12px', padding: '10px 14px', fontSize: '0.85rem', color: '#333', marginBottom: 10, maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
              <img src="/diah-anna.png" alt="" style={{ width: 18, height: 18, borderRadius: '50%', verticalAlign: 'middle', marginRight: 5 }} />
              Oke! Aku sudah punya gambaran yang cukup. Klik di bawah untuk lihat hasil analisisnya 🎯
            </div>
            <button
              onClick={handleComputeResult}
              disabled={computing}
              style={{
                background: computing ? '#aaa' : 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                padding: '13px 28px', borderRadius: 12, border: 'none',
                cursor: computing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {computing
                ? <><span style={{ animation: 'dot-bounce 1s infinite' }}>⏳</span> Menganalisis...</>
                : <>🧬 Lihat Hasil Analisis Saya</>
              }
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        background: '#f0f2f5', padding: '8px 10px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        display: 'flex', gap: 8, alignItems: 'center',
        flexShrink: 0, borderTop: '1px solid #e0e0e0',
      }}>
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
