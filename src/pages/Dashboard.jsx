import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A' },
]

// Peta arah karier → related roles berdasarkan kata kunci
const CAREER_RELATIVES = {
  'data analyst':       [['Data Analyst', 88], ['Business Analyst', 82], ['Product Analyst', 76]],
  'product manager':    [['Product Manager', 90], ['Product Analyst', 84], ['Growth Manager', 78]],
  'software engineer':  [['Software Engineer', 91], ['Backend Engineer', 85], ['DevOps Engineer', 77]],
  'ui ux':              [['UI/UX Designer', 89], ['Product Designer', 83], ['Researcher UX', 75]],
  'marketing':          [['Digital Marketer', 87], ['Growth Hacker', 81], ['Brand Manager', 74]],
  'finance':            [['Financial Analyst', 86], ['Business Analyst', 80], ['Risk Analyst', 72]],
  'hr':                 [['HR Business Partner', 88], ['Talent Acquisition', 82], ['People Ops', 76]],
  'default':            [['Posisi Target', 87], ['Posisi Terkait', 81], ['Posisi Alternatif', 74]],
}

function getOpportunities(targetPosisi, readiness) {
  if (!targetPosisi) return []
  const key = targetPosisi.toLowerCase()
  let found = CAREER_RELATIVES.default
  for (const [k, v] of Object.entries(CAREER_RELATIVES)) {
    if (k === 'default') continue
    if (key.includes(k) || k.split(' ').some(w => key.includes(w))) {
      found = v
      break
    }
  }
  // Sesuaikan match % dengan readiness
  const delta = Math.round((readiness - 50) / 10)
  return found.map(([title, base]) => [
    title === 'Posisi Target' ? targetPosisi : title,
    Math.min(97, Math.max(55, base + delta))
  ])
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fade(delay = 0, visible = true) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  }
}

const S = {
  card: (extra = {}) => ({
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18, padding: '18px 18px',
    marginBottom: 12, ...extra,
  }),
  label: { color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '1px', marginBottom: 4 },
  sectionTitle: { color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 },
  greenBar: (pct) => ({
    background: 'linear-gradient(90deg,#25D366,#34B7F1)', height: '100%',
    width: `${pct}%`, borderRadius: 99, transition: 'width 1.2s ease',
  }),
}

// ─── FREE DASHBOARD ───────────────────────────────────────────────────────────
function FreeDashboard({ user, profile, genome, growth, onUpgrade, weeklyReview }) {
  const navigate  = useNavigate()
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  const firstName    = user?.user_metadata?.full_name?.split(' ')[0]
                    || user?.user_metadata?.name?.split(' ')[0] || 'Kamu'
  const targetPosisi = profile?.target_posisi || null
  const readiness    = growth?.progress_percent || profile?.career_readiness || 0
  const gaps         = profile?.skill_gaps || profile?.gap_skills || []
  const gpsSteps     = profile?.gps_steps || growth?.gps_steps || []
  const mentorMsg    = profile?.mentor_message || growth?.mentor_message || null
  const currentFocus = growth?.current_focus || gaps[0] || null
  const opportunities = getOpportunities(targetPosisi, readiness)

  const dispatchUpgrade = () =>
    window.dispatchEvent(new CustomEvent('show-upgrade', { detail: { profile, genome, growth } }))

  return (
    <div style={{ padding: '16px 16px 0', maxWidth: 480, margin: '0 auto' }}>

      {/* ═══ SECTION 1 — HERO CARD ═══════════════════════════════════════════ */}
      <div style={{
        ...S.card({ background: 'linear-gradient(135deg,#0d2b1a,#0f3324)', border: '1px solid rgba(37,211,102,0.25)' }),
        ...fade(0.05, visible),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={S.label}>👋 HALO, {firstName.toUpperCase()}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '1px', marginBottom: 8 }}>🎯 TARGET KARIER</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>{targetPosisi || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#25D366', fontWeight: 900, fontSize: '1.65rem', lineHeight: 1 }}>{readiness}%</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem' }}>Career Readiness</div>
          </div>
        </div>

        {currentFocus && (
          <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem' }}>🎯</span>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.5px' }}>FOKUS SAAT INI</div>
              <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>{currentFocus}</div>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/chat')}
          style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 11, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 3px 14px rgba(37,211,102,0.3)' }}
        >
          💬 Chat Diah Anna
        </button>
      </div>

      {/* ═══ CATATAN DIAH ANNA MINGGU INI ═══════════════════════════════════ */}
      {weeklyReview?.summary && (
        <div style={{
          ...S.card({ background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(79,70,229,0.2)' }),
          ...fade(0.05, visible),
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <img src="/diah-anna.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '1.5px solid rgba(79,70,229,0.4)' }} />
            <div>
              <div style={{ color: '#A5A0FF', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px', marginBottom: 4 }}>
                📝 CATATAN DIAH ANNA MINGGU INI
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.83rem', lineHeight: 1.6 }}>
                {weeklyReview.summary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECTION 2 — CAREER SNAPSHOT ════════════════════════════════════ */}
      {(targetPosisi || gaps.length > 0) && (
        <div style={{ ...S.card(), ...fade(0.1, visible) }}>
          <div style={S.sectionTitle}>📊 Snapshot Karier</div>

          {targetPosisi && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>Target</span>
              <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>{targetPosisi}</span>
            </div>
          )}

          {readiness > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 5 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Readiness</span>
                <span style={{ color: '#25D366', fontWeight: 700 }}>{readiness}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                <div style={S.greenBar(readiness)} />
              </div>
            </div>
          )}

          {gaps.length > 0 && (
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', marginBottom: 7 }}>Gap Utama</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gaps.slice(0, 4).map((g, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#EF5350', fontSize: '0.75rem', flexShrink: 0 }}>❌</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION 3 — INSIGHT DIAH ANNA ══════════════════════════════════ */}
      <div style={{ ...S.card({ background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.13)' }), ...fade(0.15, visible) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.35)', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.83rem' }}>Diah Anna</div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem' }}>AI Career Mentor</div>
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: 1.75 }}>
          {mentorMsg || (targetPosisi
            ? `${firstName}, saya melihat potensi yang cukup kuat dalam diri kamu. Target ${targetPosisi} sangat realistis — kamu sudah ${readiness}% siap. ${gaps.length > 0 ? `Fokus utama sekarang adalah menutup gap di ${gaps.slice(0, 2).join(' dan ')}.` : ''}`
            : `Halo ${firstName}! Saya siap membantu memetakan perjalanan karier kamu. Mulai ngobrol dengan saya untuk menemukan DNA karier terbaikmu.`
          )}
        </div>
      </div>

      {/* ═══ SECTION 4 — CAREER GPS PREVIEW ═════════════════════════════════ */}
      {gpsSteps.length > 0 && (
        <div style={{ ...S.card({ position: 'relative', overflow: 'hidden' }), ...fade(0.2, visible) }}>
          <div style={S.sectionTitle}>🚀 Career GPS Preview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gpsSteps.map((step, i) => {
              const unlocked = i < 2
              const done = step.done
              return (
                <div
                  key={i}
                  onClick={() => { if (!unlocked) dispatchUpgrade() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: unlocked ? 'default' : 'pointer' }}
                >
                  <span style={{ fontSize: '0.85rem', flexShrink: 0, color: done ? '#25D366' : unlocked ? '#34B7F1' : 'rgba(255,255,255,0.18)' }}>
                    {done ? '✓' : unlocked ? '📍' : '🔒'}
                  </span>
                  <span style={{
                    fontSize: '0.84rem', flex: 1,
                    color: done ? '#25D366' : unlocked ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)',
                    filter: !unlocked ? 'blur(4px)' : 'none',
                    userSelect: !unlocked ? 'none' : 'auto',
                  }}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, background: 'linear-gradient(to top,#0a0f0d,transparent)', pointerEvents: 'none' }} />
          <button
            onClick={dispatchUpgrade}
            style={{ marginTop: 14, width: '100%', padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25D366', fontWeight: 700, fontSize: '0.82rem', borderRadius: 10, cursor: 'pointer' }}
          >
            🔓 Buka Roadmap Lengkap
          </button>
        </div>
      )}

      {/* ═══ SECTION 5 — OPPORTUNITY PREVIEW ════════════════════════════════ */}
      {opportunities.length > 0 && (
        <div style={{ ...S.card(), ...fade(0.25, visible) }}>
          <div style={S.sectionTitle}>💼 Cocok Untuk DNA Kamu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {opportunities.map(([title, match], i) => (
              <div
                key={i}
                onClick={() => i > 0 && dispatchUpgrade()}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: i === 0 ? 'rgba(37,211,102,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, cursor: i > 0 ? 'pointer' : 'default' }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: '0.84rem', fontWeight: 600, marginBottom: 2 }}>{title}</div>
                  {i === 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Paling cocok dengan DNA kamu</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ color: i === 0 ? '#25D366' : 'rgba(255,255,255,0.35)', fontWeight: 800, fontSize: '0.95rem' }}>
                    {i === 0 ? `${match}%` : '🔒'}
                  </div>
                  {i === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>Match</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ NO DATA STATE ═══════════════════════════════════════════════════ */}
      {!targetPosisi && gaps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '36px 16px', ...fade(0.1, visible) }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 14 }}>🧬</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Career DNA belum terbentuk</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem', lineHeight: 1.65, marginBottom: 22 }}>
            Selesaikan Career Discovery agar Diah Anna bisa memetakan DNA karier kamu secara personal.
          </div>
          <button
            onClick={() => window.location.href = '/discovery'}
            style={{ padding: '13px 32px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, borderRadius: 13, border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(37,211,102,0.35)' }}
          >
            🚀 Mulai Career Discovery
          </button>
        </div>
      )}

      {/* ═══ SECTION 6 — PREMIUM CTA ═════════════════════════════════════════ */}
      {targetPosisi && (
        <div style={{
          ...fade(0.3, visible),
          background: 'linear-gradient(135deg,rgba(37,211,102,0.08),rgba(52,183,241,0.06))',
          border: '1px solid rgba(37,211,102,0.2)',
          borderRadius: 18, padding: '22px 18px', marginBottom: 12,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔓</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: 6 }}>Career GPS Premium</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              Roadmap lengkapmu sudah siap.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {['✓ Career GPS Personal — roadmap step by step', '✓ Diah Anna Unlimited — tanya kapanpun', '✓ Progress Tracking harian', '✓ Weekly Coaching personal', '✓ Opportunity Matching sesuai DNA'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: '#25D366', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{f.replace('✓ ', '')}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.73rem', textDecoration: 'line-through', marginBottom: 2 }}>Harga Normal Rp599.000</div>
            <div style={{ color: '#25D366', fontWeight: 900, fontSize: '1.3rem' }}>Rp199.000 <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/bulan</span></div>
          </div>

          <button
            onClick={dispatchUpgrade}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', borderRadius: 13, border: 'none', cursor: 'pointer', boxShadow: '0 5px 22px rgba(37,211,102,0.4)' }}
          >
            🚀 Buka Career GPS Saya
          </button>
        </div>
      )}

    </div>
  )
}

// ─── PREMIUM DASHBOARD ────────────────────────────────────────────────────────
function PremiumDashboard({ user, profile, genome, growth, actions, events, weeklyReview }) {
  const navigate  = useNavigate()
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  const firstName    = user?.user_metadata?.full_name?.split(' ')[0]
                    || user?.user_metadata?.name?.split(' ')[0] || 'Kamu'
  const targetPosisi = profile?.target_posisi || null
  const readiness    = growth?.progress_percent || profile?.career_readiness || 0
  const gaps         = profile?.skill_gaps || profile?.gap_skills || []
  const gpsSteps     = profile?.gps_steps || growth?.gps_steps || []
  const mentorMsg    = profile?.mentor_message || null
  const currentFocus = growth?.current_focus || gaps[0] || null
  const opportunities = getOpportunities(targetPosisi, readiness)

  // Hitung +progress minggu ini dari career_events (jika ada)
  const weekProgress = events?.length > 0
    ? Math.min(12, Math.max(1, events.filter(e => {
        const d = new Date(e.created_at)
        return (Date.now() - d.getTime()) < 7 * 24 * 3600 * 1000
      }).length * 2))
    : 4

  // Today's Mission: dari next_actions atau derive dari current focus
  const todayMission = actions?.length > 0
    ? actions[0]
    : currentFocus
      ? { title: `Pelajari ${currentFocus}`, duration_estimate: '60–90 menit', impact: 'Tinggi', reward_points: 2 }
      : null

  // Activity history
  const recentEvents = events?.slice(0, 5) || []

  return (
    <div style={{ padding: '16px 16px 0', maxWidth: 480, margin: '0 auto' }}>

      {/* ═══ SECTION 1 — PREMIUM HERO ════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg,#0a2218,#0f3324,#0d1f2a)',
        border: '1px solid rgba(37,211,102,0.3)',
        borderRadius: 18, padding: '20px 18px', marginBottom: 12,
        ...fade(0.05, visible),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#25D366', fontSize: '0.65rem', letterSpacing: '1px', marginBottom: 4 }}>⭐ PREMIUM</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '1px', marginBottom: 6 }}>🎯 TARGET KARIER</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>{targetPosisi || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#25D366', fontWeight: 900, fontSize: '1.65rem', lineHeight: 1 }}>{readiness}%</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', marginBottom: 4 }}>Career Readiness</div>
            <div style={{ color: '#34B7F1', fontSize: '0.72rem', fontWeight: 600 }}>🔥 +{weekProgress}% minggu ini</div>
          </div>
        </div>

        {currentFocus && (
          <div style={{ background: 'rgba(52,183,241,0.1)', border: '1px solid rgba(52,183,241,0.2)', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.5px', marginBottom: 2 }}>🎯 FOKUS HARI INI</div>
            <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>{currentFocus}</div>
          </div>
        )}
      </div>

      {/* ═══ CATATAN DIAH ANNA MINGGU INI ═══════════════════════════════════ */}
      {weeklyReview?.summary && (
        <div style={{
          ...S.card({ background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(79,70,229,0.2)' }),
          ...fade(0.05, visible),
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <img src="/diah-anna.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '1.5px solid rgba(79,70,229,0.4)' }} />
            <div>
              <div style={{ color: '#A5A0FF', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px', marginBottom: 4 }}>
                📝 CATATAN DIAH ANNA MINGGU INI
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.83rem', lineHeight: 1.6 }}>
                {weeklyReview.summary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECTION 2 — TODAY'S MISSION ═════════════════════════════════════ */}
      {todayMission && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(255,183,77,0.08),rgba(255,183,77,0.04))',
          border: '1px solid rgba(255,183,77,0.2)',
          borderRadius: 18, padding: '18px', marginBottom: 12,
          ...fade(0.1, visible),
        }}>
          <div style={{ color: '#FFB74D', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>🎯 Misi Hari Ini</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>
            {todayMission.title}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 10px', flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>Estimasi</div>
              <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{todayMission.duration_estimate || '60 menit'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 10px', flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>Dampak</div>
              <div style={{ color: '#FFB74D', fontSize: '0.75rem', fontWeight: 600 }}>{todayMission.impact || 'Tinggi'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 10px', flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>Reward</div>
              <div style={{ color: '#25D366', fontSize: '0.75rem', fontWeight: 600 }}>+{todayMission.reward_points || 2} poin</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/chat')}
            style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#FFB74D,#f57c00)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 11, border: 'none', cursor: 'pointer', boxShadow: '0 3px 14px rgba(255,183,77,0.35)' }}
          >
            Mulai Bersama Diah Anna →
          </button>
        </div>
      )}

      {/* ═══ SECTION 3 — PROGRESS OVERVIEW ══════════════════════════════════ */}
      <div style={{ ...S.card(), ...fade(0.15, visible) }}>
        <div style={S.sectionTitle}>📊 Progress Karier</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#25D366', fontWeight: 900, fontSize: '2rem', lineHeight: 1 }}>{readiness}%</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem' }}>Target</div>
            <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>80%</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 8 }}>
          <div style={S.greenBar(readiness)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Progress Minggu Ini</span>
          <span style={{ color: '#25D366', fontWeight: 700 }}>+{weekProgress}%</span>
        </div>
      </div>

      {/* ═══ SECTION 4 — JOURNEY PROGRESS ═══════════════════════════════════ */}
      {gpsSteps.length > 0 && (
        <div style={{ ...S.card(), ...fade(0.2, visible) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={S.sectionTitle}>🗺️ Career Journey</div>
            <button onClick={() => navigate('/journey')} style={{ background: 'none', border: 'none', color: '#25D366', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Lihat Semua →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gpsSteps.slice(0, 5).map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => navigate('/journey')}>
                <span style={{ fontSize: '0.85rem', flexShrink: 0, color: step.done ? '#25D366' : i === gpsSteps.findIndex(s => !s.done) ? '#34B7F1' : 'rgba(255,255,255,0.2)' }}>
                  {step.done ? '✅' : i === gpsSteps.findIndex(s => !s.done) ? '📍' : '🔒'}
                </span>
                <span style={{
                  fontSize: '0.83rem', color: step.done ? '#25D366' : i === gpsSteps.findIndex(s => !s.done) ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontWeight: i === gpsSteps.findIndex(s => !s.done) ? 600 : 400,
                  cursor: 'pointer',
                }}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 5 — INSIGHT MINGGU INI ═════════════════════════════════ */}
      <div style={{
        ...S.card({ background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.13)' }),
        ...fade(0.25, visible),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.35)', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.83rem' }}>Insight Minggu Ini</div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem' }}>Diah Anna</div>
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: 1.75 }}>
          {firstName}, {mentorMsg
            ? mentorMsg
            : `saya melihat progres kamu meningkat ${weekProgress}% dalam 7 hari terakhir. ${targetPosisi ? `Jika ritme ini dipertahankan, target ${targetPosisi} bisa dicapai lebih cepat dari estimasi.` : 'Tetap konsisten ya!'}`
          }
        </div>
        <button
          onClick={() => navigate('/chat')}
          style={{ marginTop: 14, width: '100%', padding: '11px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 11, border: 'none', cursor: 'pointer', boxShadow: '0 3px 14px rgba(37,211,102,0.3)' }}
        >
          💬 Tanya Diah Anna
        </button>
      </div>

      {/* ═══ SECTION 6 — OPPORTUNITIES ═══════════════════════════════════════ */}
      {opportunities.length > 0 && (
        <div style={{ ...S.card(), ...fade(0.3, visible) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={S.sectionTitle}>💼 Peluang Terbaik Untukmu</div>
            <button onClick={() => navigate('/opportunities')} style={{ background: 'none', border: 'none', color: '#25D366', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Lihat Semua →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {opportunities.map(([title, match], i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px',
                background: i === 0 ? 'rgba(37,211,102,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i === 0 ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12,
              }}>
                <div style={{ color: '#fff', fontSize: '0.84rem', fontWeight: i === 0 ? 600 : 400 }}>{title}</div>
                <div style={{ color: i === 0 ? '#25D366' : 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.88rem' }}>{match}% <span style={{ fontSize: '0.6rem', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>Match</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 7 — ACTIVITY HISTORY ════════════════════════════════════ */}
      {recentEvents.length > 0 && (
        <div style={{ ...S.card(), ...fade(0.35, visible) }}>
          <div style={S.sectionTitle}>📅 Aktivitas Terakhir</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#25D366', fontSize: '0.75rem' }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>{ev.title || ev.description || 'Aktivitas karier'}</span>
                {ev.points && <span style={{ marginLeft: 'auto', color: '#25D366', fontSize: '0.7rem', fontWeight: 600 }}>+{ev.points}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// Default aman kalau prop subscription literal undefined (mismatch deploy,
// race Suspense, atau sebab lain) — JANGAN biarkan ini crash hard.
// loading:true sengaja, supaya UI tahu status sebenarnya belum jelas,
// bukan asumsi pasti 'free' yang bisa salah kalau user aslinya premium.
const DEFAULT_SUBSCRIPTION = {
  plan: 'free',
  loading: true,
  checkUsage: async () => false,
  logUsage: () => {},
  fetchPlan: () => {},
  getRemainingChat: async () => 0,
  isExpired: false,
}

export default function Dashboard({ user, loading = false, subscription = DEFAULT_SUBSCRIPTION }) {
  const navigate  = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [genome, setGenome]     = useState(null)
  const [growth, setGrowth]     = useState(null)
  const [actions, setActions]   = useState([])
  const [events, setEvents]     = useState([])
  const [weeklyReview, setWeeklyReview] = useState(null)
  // isPremium sekarang DIDERIVE dari subscription yang di-lift ke App.jsx —
  // bukan query terpisah di Promise.all bawah ini lagi.
  const isPremium = !subscription.loading && subscription.plan === 'premium'
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (loading) return // tunggu App.jsx selesai getSession
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_next_actions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('career_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_weekly_reviews').select('summary, week_start').eq('user_id', user.id).order('week_start', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([{ data: p }, { data: g }, { data: gw }, { data: acts }, { data: evs }, { data: wr }]) => {
      setProfile(p)
      setGenome(g)
      setGrowth(gw)
      setActions(acts || [])
      setEvents(evs || [])
      setWeeklyReview(wr || null)
      setDataLoading(false)

      // Backfill user lama: kalau summary kosong tapi ada career data → refresh otomatis
      if (p?.target_posisi && !p?.summary) {
        fetch('/api/refresh-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        }).then(r => r.json()).then(res => {
          if (res.success) {
            setProfile(prev => ({
              ...prev,
              summary:        res.updated.summary        || prev?.summary,
              mentor_message: res.updated.mentor_message || prev?.mentor_message,
              motivasi:       res.updated.motivasi       || prev?.motivasi,
              greeted_at:     null,
            }))
          }
        }).catch(() => {})
      }
    })
  }, [user?.id])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
                 || user?.user_metadata?.name?.split(' ')[0] || 'Kamu'

  if (dataLoading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Memuat...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', paddingBottom: 90, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${isPremium ? 'rgba(255,183,77,0.5)' : 'rgba(37,211,102,0.3)'}`, flexShrink: 0 }}>
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: '#1a3a20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Halo, {firstName} 👋</div>
          <div style={{ fontSize: '0.68rem' }}>
            {isPremium
              ? <span style={{ color: '#FFB74D' }}>⭐ Premium Member</span>
              : <span style={{ color: 'rgba(255,255,255,0.3)' }}>Free Plan · <span style={{ color: '#25D366', cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('show-upgrade', { detail: { profile, genome, growth } }))}>Upgrade Premium</span></span>
            }
          </div>
        </div>
        {isPremium && (
          <div style={{ background: 'rgba(255,183,77,0.1)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: '0.65rem', color: '#FFB74D', fontWeight: 600 }}>
            PREMIUM ⭐
          </div>
        )}
      </div>

      {/* Content berdasarkan status plan */}
      {isPremium ? (
        <PremiumDashboard
          user={user} profile={profile} genome={genome} growth={growth}
          actions={actions} events={events} weeklyReview={weeklyReview}
        />
      ) : (
        <FreeDashboard
          user={user} profile={profile} genome={genome} growth={growth}
          weeklyReview={weeklyReview}
          onUpgrade={() => window.dispatchEvent(new CustomEvent('show-upgrade', { detail: { profile, genome, growth } }))}
        />
      )}

      <BottomNav isPremium={isPremium} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');`}</style>
    </div>
  )
}
