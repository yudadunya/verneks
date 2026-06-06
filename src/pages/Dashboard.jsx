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

function UpgradeModal({ trigger, gapLabel, onClose }) {
  if (!trigger) return null
  const messages = {
    gps:  { title: 'Buka Roadmap Lengkap', desc: 'Lihat setiap langkah spesifik yang perlu kamu ambil — step by step, khusus untuk profil kamu.' },
    gap:  { title: `Tutup Gap: ${gapLabel || 'Skill'}`, desc: 'Dapatkan rencana belajar spesifik untuk menutup gap ini dan mempercepat pencapaian target kamu.' },
    chat: { title: 'Mentor Tanpa Batas', desc: 'Tanya apapun ke Diah Anna kapanpun, tanpa batas pesan harian.' },
    journey: { title: 'Career Journey', desc: 'Lacak progress karier kamu hari demi hari dengan milestone yang jelas.' },
    jobs: { title: 'Opportunity Matching', desc: 'Lihat lowongan yang benar-benar cocok dengan DNA karier kamu.' },
  }
  const m = messages[trigger] || messages.gps
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111a14', borderRadius: '20px 20px 0 0', padding: '28px 20px 44px', width: '100%', maxWidth: 480, border: '1px solid rgba(37,211,102,0.2)' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 22px' }} />
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔒</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', marginBottom: 8 }}>{m.title}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.65 }}>{m.desc}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
          {['🗺️ Career GPS — roadmap personal step by step', '💬 Diah Anna unlimited — tanya kapanpun', '📈 Progress tracking harian', '💼 Opportunity matching sesuai DNA'].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
              <span style={{ color: '#25D366', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
        <button onClick={() => dispatchUpgrade()} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.35)' }}>
          🚀 Upgrade Premium — Rp199.000/bln
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem' }}>
          Nanti saja
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({ user }) {
  const navigate   = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [genome, setGenome]     = useState(null)
  const [growth, setGrowth]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [modal, setModal]       = useState(null)
  const [modalGapLabel, setModalGapLabel] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)

  const dispatchUpgrade = () => {
    window.dispatchEvent(new CustomEvent('show-upgrade', {
      detail: { profile, genome, growth }
    }))
  }

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').gte('expires_at', new Date().toISOString()).limit(1).maybeSingle(),
    ]).then(([{ data: p }, { data: g }, { data: gw }, { data: sub }]) => {
      setProfile(p); setGenome(g); setGrowth(gw)
      const premium = !!sub?.plan && sub.plan !== 'free'
      setIsPremium(premium)
      setLoading(false)
      setTimeout(() => setRevealed(true), 80)

      // Greeting Diah Anna setiap login — cek apakah sudah ditampilkan hari ini
      if (!premium && p) {
        const greetKey = `lc_greeting_${user.id}_${new Date().toISOString().slice(0, 10)}`
        if (!localStorage.getItem(greetKey)) {
          setShowGreeting(true)
          localStorage.setItem(greetKey, '1')
        }
      }
    })
  }, [user?.id])

  const firstName    = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'Kamu'
  const hasGenome    = genome && GENOME_MAP.some(g => (genome[g.key] || 0) > 0)
  const genomeList   = hasGenome ? GENOME_MAP.filter(g => (genome[g.key] || 0) > 0).sort((a, b) => (genome[b.key] || 0) - (genome[a.key] || 0)) : []
  const readiness    = growth?.progress_percent || profile?.career_readiness || 0
  const targetPosisi = profile?.target_posisi || null
  const gpsSteps     = growth?.gps_steps || profile?.gps_steps || []
  const gaps         = profile?.skill_gaps || profile?.gap_skills || []
  const mentorMsg    = profile?.mentor_message || growth?.mentor_message || null

  const dailyKey    = `lc_coach_daily_${user?.id}_${new Date().toISOString().slice(0, 10)}`
  const dailyUsed   = parseInt(localStorage.getItem(dailyKey) || '0', 10)
  const dailyLeft   = Math.max(0, 3 - dailyUsed)

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
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
            {isPremium
              ? <span style={{ color: '#25D366' }}>⭐ Premium</span>
              : <>Free Plan · <span style={{ color: '#25D366', cursor: 'pointer' }} onClick={() => dispatchUpgrade()}>Upgrade Premium</span></>}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', maxWidth: 480, margin: '0 auto' }}>

        {/* ── GREETING DIAH ANNA (setiap login, free user) ── */}
        {showGreeting && (
          <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 16, padding: '16px', marginBottom: 14, position: 'relative', ...fade(0) }}>
            <button onClick={() => setShowGreeting(false)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <img src="/diah-anna.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.4)' }} />
              <span style={{ color: '#25D366', fontWeight: 700, fontSize: '0.82rem' }}>Diah Anna</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              Halo {firstName} 👋 Saya sudah menyimpan hasil Career Discovery kamu.<br /><br />
              {targetPosisi && <><strong style={{ color: '#fff' }}>Target:</strong> {targetPosisi}<br /></>}
              {readiness > 0 && <><strong style={{ color: '#fff' }}>Career Readiness:</strong> {readiness}%<br /></>}
              {gaps.length > 0 && <><strong style={{ color: '#FFB74D' }}>Gap terbesar:</strong> {gaps[0]}<br /></>}
              <br />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                Saya sudah menyiapkan langkah berikutnya — tetapi roadmap lengkap masih terkunci.
              </span>
            </div>
          </div>
        )}

        {/* ── CARD 1: HERO ── */}
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
            <button onClick={() => navigate('/dna')} style={{ marginTop: 8, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
              Lihat Detail →
            </button>
          </div>
        )}

        {/* ── CARD 3: GAP TERBESAR — semua terlihat, masalah harus terus terlihat ── */}
        {gaps.length > 0 && (
          <div style={{ background: 'rgba(239,83,80,0.06)', border: '1px solid rgba(239,83,80,0.18)', borderRadius: 16, padding: '16px', marginBottom: 12, ...fade(0.15) }}>
            <div style={{ color: '#EF5350', fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>⚠️ Gap Terbesar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {gaps.map((g, i) => (
                <div
                  key={i}
                  onClick={() => { if (!isPremium) { setModalGapLabel(g); dispatchUpgrade() } }}
                  style={{
                    background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.2)',
                    borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.8)', cursor: isPremium ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {g}
                  {!isPremium && <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>🔒</span>}
                </div>
              ))}
            </div>
            {!isPremium && (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: 10, lineHeight: 1.5 }}>
                Tap skill di atas untuk lihat rencana spesifik menutup gap ini.
              </div>
            )}
          </div>
        )}

        {/* ── CARD 4: CAREER GPS PREVIEW ── */}
        {gpsSteps.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', marginBottom: 12, position: 'relative', overflow: 'hidden', ...fade(0.2) }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>🚀 Career GPS Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {gpsSteps.map((step, i) => {
                const unlocked = isPremium || i < 2
                return (
                  <div
                    key={i}
                    onClick={() => { if (!unlocked) dispatchUpgrade() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: unlocked ? 'default' : 'pointer' }}
                  >
                    <span style={{ fontSize: '0.8rem', flexShrink: 0, color: step.done ? '#25D366' : unlocked ? '#34B7F1' : 'rgba(255,255,255,0.2)' }}>
                      {step.done ? '✓' : unlocked ? '📍' : '🔒'}
                    </span>
                    <span style={{
                      fontSize: '0.84rem', flex: 1,
                      color: step.done ? '#25D366' : unlocked ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                      filter: !unlocked ? 'blur(4px)' : 'none',
                      userSelect: !unlocked ? 'none' : 'auto',
                    }}>
                      {step.title}
                    </span>
                  </div>
                )
              })}
            </div>
            {!isPremium && (
              <>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #0d1a10, transparent)', pointerEvents: 'none' }} />
                <button onClick={() => dispatchUpgrade()} style={{ marginTop: 14, width: '100%', padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25D366', fontWeight: 700, fontSize: '0.82rem', borderRadius: 10, cursor: 'pointer' }}>
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
          <button
            onClick={() => navigate('/chat')}
            style={{ marginTop: 14, width: '100%', padding: '11px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 3px 14px rgba(37,211,102,0.3)' }}
          >
            💬 Tanya Diah Anna
            {!isPremium && (
              <span style={{ background: dailyLeft === 0 ? 'rgba(239,83,80,0.5)' : 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '1px 8px', fontSize: '0.68rem' }}>
                {dailyLeft === 0 ? 'Habis hari ini' : `${dailyLeft}/3 hari ini`}
              </span>
            )}
          </button>
        </div>

        {/* ── NO DATA STATE ── */}
        {!hasGenome && !targetPosisi && (
          <div style={{ textAlign: 'center', padding: '30px 16px', ...fade(0.1) }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🧬</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Career DNA belum terbentuk</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 20 }}>
              Selesaikan Career Discovery agar Diah Anna bisa memetakan DNA karier kamu.
            </div>
            <button onClick={() => navigate('/discovery')} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
              🚀 Mulai Career Discovery
            </button>
          </div>
        )}

      </div>

      <BottomNav isPremium={isPremium} />
      <UpgradeModal trigger={modal} gapLabel={modalGapLabel} onClose={() => { setModal(null); setModalGapLabel('') }} />

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');`}</style>
    </div>
  )
}
