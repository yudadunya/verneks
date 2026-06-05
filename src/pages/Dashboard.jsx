import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A' },
]

function LockedOverlay({ onTap }) {
  return (
    <div
      onClick={onTap}
      style={{
        position: 'absolute', inset: 0, borderRadius: 14,
        background: 'rgba(10,15,13,0.72)',
        backdropFilter: 'blur(3px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 2,
      }}
    >
      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🔒</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>Premium</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: 2 }}>Tap untuk buka</div>
    </div>
  )
}

function UpgradeModal({ trigger, onClose }) {
  if (!trigger) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111a14', borderRadius: '20px 20px 0 0',
          padding: '28px 20px 40px', width: '100%', maxWidth: 480,
          border: '1px solid rgba(37,211,102,0.2)',
        }}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', marginBottom: 6 }}>
            Career GPS Premium
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            {trigger === 'gps'
              ? 'Buka roadmap lengkap, langkah demi langkah, khusus untuk kamu.'
              : trigger === 'gap'
              ? 'Lihat rencana spesifik untuk menutup gap skill kamu.'
              : 'Akses penuh mentor Diah Anna tanpa batas pesan.'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['🗺️ Career GPS — roadmap personal step by step', '💬 Mentor Diah Anna unlimited', '📈 Progress tracking harian', '💼 Opportunity matching'].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ color: '#25D366', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
            </div>
          ))}
        </div>
        <button
          onClick={() => window.location.href = '/pricing'}
          style={{
            width: '100%', marginTop: 20, padding: '14px',
            background: 'linear-gradient(135deg,#25D366,#128C7E)',
            color: '#fff', fontWeight: 800, fontSize: '0.95rem',
            borderRadius: 12, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(37,211,102,0.35)',
          }}
        >
          🚀 Upgrade Premium — Rp199.000/bln
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 10, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem' }}
        >
          Nanti saja
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [genome, setGenome]   = useState(null)
  const [growth, setGrowth]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [modal, setModal]     = useState(null) // 'gps' | 'gap' | 'chat'
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').gte('expires_at', new Date().toISOString()).limit(1).maybeSingle(),
    ]).then(([{ data: p }, { data: g }, { data: gw }, { data: sub }]) => {
      setProfile(p); setGenome(g); setGrowth(gw)
      setIsPremium(!!sub?.plan && sub.plan !== 'free')
      setLoading(false)
      setTimeout(() => setRevealed(true), 80)
    })
  }, [user?.id])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
                 || user?.user_metadata?.name?.split(' ')[0] || 'Kamu'

  const hasGenome  = genome && GENOME_MAP.some(g => (genome[g.key] || 0) > 0)
  const genomeList = hasGenome
    ? GENOME_MAP.filter(g => (genome[g.key] || 0) > 0).sort((a, b) => (genome[b.key] || 0) - (genome[a.key] || 0))
    : []
  const topGenome = genomeList[0] || null

  const readiness    = growth?.progress_percent || profile?.career_readiness || 0
  const targetPosisi = profile?.target_posisi || null
  const gpsSteps     = growth?.gps_steps || profile?.gps_steps || []
  const gaps         = profile?.skill_gaps || profile?.gap_skills || []
  const mentorMsg    = profile?.mentor_message || growth?.mentor_message || null

  const fade = (delay = 0) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'none' : 'translateY(12px)',
    transition: `opacity 0.45s ease ${delay}s, transform 0.45s ease ${delay}s`,
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Memuat dashboard...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', paddingBottom: 90, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(37,211,102,0.3)', flexShrink: 0 }}>
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: '#1a3a20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Halo, {firstName} 👋</div>
          {!isPremium && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Free Plan · <span style={{ color: '#25D366', cursor: 'pointer' }} onClick={() => setModal('gps')}>Upgrade Premium</span></div>
          )}
        </div>
        {isPremium && (
          <div style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 99, padding: '3px 10px', color: '#25D366', fontSize: '0.7rem', fontWeight: 700 }}>⭐ Premium</div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0', maxWidth: 480, margin: '0 auto' }}>

        {/* ── CARD 1: HERO — Target + Readiness ── */}
        {(targetPosisi || readiness > 0) && (
          <div style={{ background: 'linear-gradient(135deg, #0d2b1a, #0f3324)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 16, padding: '18px', marginBottom: 12, ...fade(0.05) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', letterSpacing: '1px', marginBottom: 4 }}>🎯 TARGET KARIER</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>{targetPosisi || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#25D366', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1 }}>{readiness}%</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>Career Readiness</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', width: `${readiness}%`, height: '100%', borderRadius: 99, transition: 'width 1.2s ease' }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              Masih ada gap <span style={{ color: '#FFB74D', fontWeight: 700 }}>{100 - readiness}%</span> untuk mencapai target kamu.
            </div>
          </div>
        )}

        {/* ── CARD 2: GENOME ── */}
        {hasGenome && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', marginBottom: 12, ...fade(0.1) }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>🧬 Career Genome</div>
            {genomeList.map(g => {
              const val = genome[g.key] || 0
              return (
                <div key={g.key} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{g.emoji} {g.label}</span>
                    <span style={{ color: g.color, fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                    <div style={{ background: g.color, width: `${val}%`, height: '100%', borderRadius: 99, transition: 'width 1s ease' }} />
                  </div>
                </div>
              )
            })}
            <button
              onClick={() => navigate('/dna')}
              style={{ marginTop: 8, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
            >
              Lihat Detail →
            </button>
          </div>
        )}

        {/* ── CARD 3: GAP TERBESAR ── */}
        {gaps.length > 0 && (
          <div style={{ background: 'rgba(239,83,80,0.06)', border: '1px solid rgba(239,83,80,0.18)', borderRadius: 16, padding: '16px', marginBottom: 12, ...fade(0.15) }}>
            <div style={{ color: '#EF5350', fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>⚠️ Gap Terbesar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {gaps.slice(0, 6).map((g, i) => (
                <div
                  key={i}
                  onClick={() => !isPremium && setModal('gap')}
                  style={{
                    background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.2)',
                    borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.7)', cursor: isPremium ? 'default' : 'pointer',
                    position: 'relative',
                  }}
                >
                  {isPremium ? g : (i < 2 ? g : <span style={{ filter: 'blur(4px)', userSelect: 'none' }}>{g}</span>)}
                  {!isPremium && i >= 2 && (
                    <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem' }}>🔒</span>
                  )}
                </div>
              ))}
            </div>
            {!isPremium && (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: 10 }}>
                Tap skill yang terkunci untuk lihat rencana penutupan gap.
              </div>
            )}
          </div>
        )}

        {/* ── CARD 4: CAREER GPS PREVIEW ── */}
        {gpsSteps.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', marginBottom: 12, position: 'relative', overflow: 'hidden', ...fade(0.2) }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>🚀 Career GPS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gpsSteps.map((step, i) => {
                const unlocked = isPremium || i < 2
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.8rem', flexShrink: 0, color: step.done ? '#25D366' : unlocked ? '#34B7F1' : 'rgba(255,255,255,0.15)' }}>
                      {step.done ? '✓' : unlocked ? `${i + 1}.` : '🔒'}
                    </span>
                    <span style={{
                      fontSize: '0.84rem',
                      color: step.done ? '#25D366' : unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)',
                      filter: !unlocked ? 'blur(4px)' : 'none',
                      userSelect: !unlocked ? 'none' : 'auto',
                      flex: 1,
                    }}>
                      {step.title}
                    </span>
                  </div>
                )
              })}
            </div>
            {!isPremium && (
              <>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #0d1a10, transparent)', pointerEvents: 'none' }} />
                <button
                  onClick={() => setModal('gps')}
                  style={{ marginTop: 14, width: '100%', padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25D366', fontWeight: 700, fontSize: '0.82rem', borderRadius: 10, cursor: 'pointer' }}
                >
                  🔓 Buka Roadmap Lengkap
                </button>
              </>
            )}
          </div>
        )}

        {/* ── CARD 5: PESAN DARI DIAH ANNA ── */}
        <div style={{ background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 16, padding: '16px', marginBottom: 12, ...fade(0.25) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.3)', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.82rem' }}>Diah Anna</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>AI Career Mentor</div>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem', lineHeight: 1.7 }}>
            {mentorMsg || (targetPosisi
              ? `${firstName}, target kamu menjadi ${targetPosisi} itu realistis${readiness > 0 ? ` — kamu sudah ${readiness}% siap` : ''}. ${gaps.length > 0 ? `Fokus utama sekarang adalah menutup gap di ${gaps.slice(0, 2).join(' dan ')}.` : 'Yuk teruskan langkah berikutnya.'}`
              : `Halo ${firstName}! Saya sudah siap membantu perjalanan karier kamu. Mulai ngobrol untuk saya petakan DNA karier kamu.`
            )}
          </div>

          {/* Chat CTA dengan limit info */}
          <button
            onClick={() => navigate('/chat')}
            style={{
              marginTop: 14, width: '100%', padding: '11px',
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 3px 14px rgba(37,211,102,0.3)',
            }}
          >
            💬 Tanya Diah Anna
            {!isPremium && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '1px 7px', fontSize: '0.68rem' }}>3/hari</span>}
          </button>
        </div>

        {/* ── NO DATA STATE ── */}
        {!hasGenome && !targetPosisi && (
          <div style={{ textAlign: 'center', padding: '30px 16px', ...fade(0.1) }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🧬</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Career DNA belum terbentuk</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 20 }}>
              Selesaikan Career Discovery dulu agar Diah Anna bisa memetakan DNA karier kamu.
            </div>
            <button
              onClick={() => navigate('/discovery')}
              style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
            >
              🚀 Mulai Career Discovery
            </button>
          </div>
        )}

      </div>

      <BottomNav />
      <UpgradeModal trigger={modal} onClose={() => setModal(null)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
      `}</style>
    </div>
  )
}
