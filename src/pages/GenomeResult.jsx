import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A' },
]

const STRENGTH_INSIGHT = {
  analytical:    'Otak analitikmu tajam. Data Analyst, Business Intelligence, atau Product Analytics adalah arena alaminya.',
  leadership:    'Jiwa pemimpin kamu kuat. Team Lead, Product Manager, atau bahkan Founder sangat sesuai.',
  builder:       'Kamu eksekutor handal. Software Engineer, DevOps, atau Operations Manager natural fit.',
  creator:       'Jiwa kreator kamu menonjol. UI/UX Designer, Content Strategist, atau Brand Manager cocok banget.',
  communication: 'Kemampuan komunikasimu luar biasa. Sales, Marketing, atau HR Business Partner bisa jadi jalurmu.',
  risk_taking:   'Nyali kamu besar. Entrepreneur, Venture Capital, atau Business Development sangat cocok.',
}

export default function GenomeResult() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('lc_discovery_result')
    if (!saved) { navigate('/discovery'); return }
    try {
      setResult(JSON.parse(saved))
      setTimeout(() => setRevealed(true), 100)
    } catch { navigate('/discovery') }
  }, [])

  if (!result) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0f0d' }}>
      <div style={{ fontSize: '2rem' }}>⏳</div>
    </div>
  )

  const gs = result.genome_scores || {}
  const top = GENOME_MAP.reduce((best, g) => (gs[g.key] || 0) > (gs[best.key] || 0) ? g : best, GENOME_MAP[0])
  const readiness = result.career_readiness || 0
  const p = result.profile_preview || {}
  const growth = result.growth_state || {}
  const gapSkills = result.gap_skills || []
  const gpsSteps = result.gps_steps || []

  const fade = (delay = 0) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'none' : 'translateY(14px)',
    transition: `all 0.55s ease ${delay}s`,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/discovery')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.83rem' }}>
          ← Ulangi
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Hasil Career DNA</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '20px 18px 120px', maxWidth: 480, margin: '0 auto' }}>

        {/* Hero — Top Strength */}
        <div style={{ textAlign: 'center', marginBottom: 22, ...fade(0) }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{top.emoji}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 3 }}>Kekuatan Utama</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem', marginBottom: 4 }}>{top.label}</div>
          {p.target_posisi && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              Target: <span style={{ color: '#25D366', fontWeight: 600 }}>{p.target_posisi}</span>
            </div>
          )}
        </div>

        {/* Diah Anna Insight */}
        <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 14, padding: '14px', marginBottom: 18, display: 'flex', gap: 10, ...fade(0.05) }}>
          <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.72rem', marginBottom: 4 }}>Diah Anna</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.83rem', lineHeight: 1.55 }}>
              {STRENGTH_INSIGHT[top.key]}
            </div>
          </div>
        </div>

        {/* ── Career Readiness ── */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px', marginBottom: 14, ...fade(0.1) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>📊 Career Readiness</div>
            <div style={{ color: '#25D366', fontWeight: 800, fontSize: '1.3rem' }}>{readiness}%</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 7, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', width: revealed ? `${readiness}%` : '0%', height: '100%', borderRadius: 99, transition: 'width 1.2s ease 0.3s' }} />
          </div>
          {growth.career_stage && (
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
              Stage: <span style={{ color: '#34B7F1' }}>{growth.career_stage}</span>
              {p.target_posisi && <> · Target: <span style={{ color: '#FFB74D' }}>{p.target_posisi}</span></>}
            </div>
          )}
        </div>

        {/* ── Career Genome ── */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px', marginBottom: 14, ...fade(0.15) }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 14 }}>🧬 Career Genome</div>
          {GENOME_MAP.map((g, i) => {
            const val = gs[g.key] || 0
            return (
              <div key={g.key} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>{g.emoji} {g.label}</span>
                  <span style={{ color: g.color, fontWeight: 700 }}>{val}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                  <div style={{ background: g.color, width: revealed ? `${val}%` : '0%', height: '100%', borderRadius: 99, transition: `width 0.9s ease ${0.3 + i * 0.07}s` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Career Gap Analysis ── */}
        {gapSkills.length > 0 && (
          <div style={{ background: 'rgba(255,183,77,0.07)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 14, padding: '16px', marginBottom: 14, ...fade(0.2) }}>
            <div style={{ color: '#FFB74D', fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>📍 Career Gap Analysis</div>
            {result.gap_summary && (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12 }}>
                {result.gap_summary}
              </div>
            )}
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: 6, letterSpacing: '0.5px' }}>GAP UTAMA:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {gapSkills.map((skill, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ color: '#EF5350', fontWeight: 700 }}>✕</span> {skill}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Career GPS Preview ── */}
        {gpsSteps.length > 0 && (
          <div style={{ background: 'rgba(52,183,241,0.06)', border: '1px solid rgba(52,183,241,0.18)', borderRadius: 14, padding: '16px', marginBottom: 22, ...fade(0.25) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: '#34B7F1', fontWeight: 700, fontSize: '0.88rem' }}>🚀 Career GPS Kamu</div>
              <div style={{ background: 'rgba(52,183,241,0.15)', color: '#34B7F1', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>PREVIEW</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gpsSteps.map((step, i) => {
                const isFree = i < 3   // Step 1-3 free (0,1,2)
                const isDone = step.done
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9,
                    background: isDone ? 'rgba(37,211,102,0.1)' : isFree ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    border: isDone ? '1px solid rgba(37,211,102,0.2)' : isFree ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)',
                    filter: !isFree ? 'blur(0px)' : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? '#25D366' : isFree ? 'rgba(52,183,241,0.2)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700,
                      color: isDone ? '#fff' : isFree ? '#34B7F1' : 'rgba(255,255,255,0.2)',
                    }}>
                      {isDone ? '✓' : isFree ? i + 1 : '🔒'}
                    </div>
                    <div style={{
                      fontSize: '0.83rem', fontWeight: 600,
                      color: isDone ? '#25D366' : isFree ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                      filter: !isFree ? 'blur(3.5px)' : 'none',
                      userSelect: !isFree ? 'none' : 'auto',
                    }}>
                      {isFree ? step.title : step.title}
                    </div>
                    {!isFree && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(10,15,13,0.45)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>🔒 Premium</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
              +{gpsSteps.filter((_, i) => i >= 3).length} langkah lagi tersedia di Premium
            </div>
          </div>
        )}

      </div>

      {/* ── Fixed Bottom CTA → Paywall ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, padding: '14px 18px 28px',
        background: 'linear-gradient(to top, #0a0f0d 75%, transparent)',
      }}>
        <button
          onClick={() => navigate('/paywall')}
          style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(37,211,102,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          🎯 Buka Roadmap Lengkap
        </button>
        <div style={{ textAlign: 'center', marginTop: 7, color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>
          Career GPS · Unlimited Mentor · Progress Tracking
        </div>
      </div>
    </div>
  )
}
