import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import BottomNav from '../components/BottomNav'

// ─── DATA MAPS ────────────────────────────────────────────────────────────────
const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1', desc: 'Analisis data & problem solving' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1', desc: 'Memimpin & mengarahkan tim' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366', desc: 'Membangun & mengeksekusi' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D', desc: 'Kreativitas & inovasi' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8', desc: 'Komunikasi & presentasi' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A', desc: 'Keberanian mengambil keputusan' },
]

const INSIGHT_MAP = {
  analytical:    'Otak analitikmu tajam. Kamu paling cocok di role yang butuh data, logika, dan problem solving mendalam — seperti Data Analyst, Product Analytics, atau Business Intelligence.',
  leadership:    'Leadership-mu menonjol. Kamu punya potensi besar sebagai Team Lead, Product Manager, atau bahkan Founder yang bisa memimpin dan menginspirasi tim.',
  builder:       'Kamu tipe eksekutor andal. Software Engineer, DevOps, atau Ops Manager adalah arena terbaik di mana kamu bisa membangun sesuatu nyata dari nol.',
  creator:       'Jiwa kreatormu tinggi. UI/UX Designer, Content Strategist, atau Brand Manager sangat sesuai dengan cara pikiranmu yang suka menciptakan sesuatu bermakna.',
  communication: 'Kemampuan komunikasimu luar biasa. Sales, Marketing, atau HR Business Partner cocok karena kamu bisa mempengaruhi dan membangun hubungan dengan siapapun.',
  risk_taking:   'Nyalimu besar dan kamu suka tantangan. Entrepreneur, Business Development, atau Venture Capital sangat cocok karena kamu tidak takut ambil keputusan di bawah ketidakpastian.',
}

const VALUES_MAP = {
  analytical:    ['🔍 Akurasi', '📊 Data-driven', '💡 Insight'],
  leadership:    ['🎯 Dampak', '👥 Tim', '🏆 Pencapaian'],
  builder:       ['⚡ Eksekusi', '🔧 Kualitas', '📈 Growth'],
  creator:       ['✨ Inovasi', '🎨 Estetika', '💫 Originalitas'],
  communication: ['🤝 Kolaborasi', '💬 Pengaruh', '🌟 Inspirasi'],
  risk_taking:   ['🚀 Ambisi', '🔥 Tantangan', '💎 Potensi'],
}

const WORKSTYLE_RULES = [
  { key: 'analytical',    threshold: 55, label: 'Deep Focus',     emoji: '🎯', desc: 'Kerja paling produktif saat ada waktu tenang tanpa distraksi' },
  { key: 'communication', threshold: 55, label: 'Collaborative',  emoji: '🤝', desc: 'Tumbuh lewat diskusi, brainstorming, dan kerja bareng tim' },
  { key: 'builder',       threshold: 55, label: 'Hands-On',       emoji: '⚙️', desc: 'Senang langsung eksekusi dan lihat hasilnya nyata' },
  { key: 'leadership',    threshold: 55, label: 'Team Leader',    emoji: '👑', desc: 'Punya drive alami untuk mengarahkan dan mengorganisir' },
  { key: 'creator',       threshold: 55, label: 'Creative Mode',  emoji: '🎨', desc: 'Butuh ruang untuk eksplorasi ide dan berpikir out-of-the-box' },
  { key: 'risk_taking',   threshold: 55, label: 'Independent',    emoji: '🦅', desc: 'Bekerja paling baik dengan otonomi tinggi dan sedikit micromanagement' },
]

function getTopTraits(scores, n = 3) {
  return [...GENOME_MAP]
    .filter(g => (scores?.[g.key] || 0) > 0)
    .sort((a, b) => (scores[b.key] || 0) - (scores[a.key] || 0))
    .slice(0, n)
}

function getWorkStyle(scores) {
  if (!scores) return [{ label: 'Flexible', emoji: '🔄', desc: 'Adaptif di berbagai kondisi kerja' }]
  const result = WORKSTYLE_RULES
    .filter(r => (scores[r.key] || 0) >= r.threshold)
    .slice(0, 3)
  return result.length ? result : [{ label: 'Flexible', emoji: '🔄', desc: 'Adaptif di berbagai kondisi kerja' }]
}

function getEnvironment(scores) {
  if (!scores) return 'Fleksibel'
  if ((scores.communication || 0) > 65) return 'Collaborative Office'
  if ((scores.analytical || 0) > 65)    return 'Remote / Deep Work'
  if ((scores.builder || 0) > 65)       return 'Hybrid — Fleksibel'
  return 'Remote Friendly'
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
function Card({ children, delay = 0, visible, accent }) {
  return (
    <div style={{
      background: accent
        ? `rgba(${accent},0.04)`
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent ? `rgba(${accent},0.15)` : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 18, padding: '18px', marginBottom: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(14px)',
      transition: `opacity 0.45s ease ${delay}s, transform 0.45s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 14 }}>
      {children}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DNA({ user }) {
  const { plan } = useSubscription(user?.id)
  const navigate  = useNavigate()
  const [scores, setScores]   = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_career_profiles')
        .select('target_posisi,industri,skill_gaps,gap_skills,mentor_message,posisi_saat_ini')
        .eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: s }, { data: p }]) => {
      setScores(s)
      setProfile(p)
      setLoading(false)
      setTimeout(() => setVisible(true), 80)
    })
  }, [user?.id])

  const hasData    = scores && GENOME_MAP.some(g => (scores[g.key] || 0) > 0)
  const topTraits  = hasData ? getTopTraits(scores) : []
  const topKey     = topTraits[0]?.key
  const insight    = topKey ? INSIGHT_MAP[topKey] : null
  const values     = topKey ? VALUES_MAP[topKey] : []
  const workStyle  = getWorkStyle(hasData ? scores : null)
  const gaps       = profile?.skill_gaps || profile?.gap_skills || []
  const industri   = profile?.industri || null
  const environment = getEnvironment(hasData ? scores : null)

  // Loading
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🧬</div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Memuat Career DNA...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', paddingBottom: 90, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '14px 18px',
      }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>🧬 Career DNA</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: 2 }}>Profil genetik karier kamu</div>
      </div>

      <div style={{ padding: '16px 16px 0', maxWidth: 480, margin: '0 auto' }}>

        {/* ══ NO DATA ══════════════════════════════════════════════════════════ */}
        {!hasData && (
          <div style={{
            textAlign: 'center', padding: '52px 20px',
            opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🧬</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', marginBottom: 10 }}>
              DNA-mu belum terbentuk
            </div>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem', lineHeight: 1.7, marginBottom: 28 }}>
              Selesaikan Career Discovery agar Diah Anna bisa memetakan DNA karier kamu secara personal.
            </div>
            <button
              onClick={() => navigate('/discovery')}
              style={{
                padding: '13px 30px',
                background: 'linear-gradient(135deg,#25D366,#128C7E)',
                color: '#fff', fontWeight: 700, borderRadius: 13,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(37,211,102,0.3)',
                fontSize: '0.9rem',
              }}
            >
              🚀 Mulai Career Discovery
            </button>
          </div>
        )}

        {/* ══ HAS DATA ═════════════════════════════════════════════════════════ */}
        {hasData && (
          <>

            {/* ── 1. INSIGHT DIAH ANNA ──────────────────────────────────────── */}
            {insight && (
              <Card delay={0.05} visible={visible} accent="37,211,102">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <img
                    src="/diah-anna.png" alt="Diah Anna"
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.4)', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.82rem' }}>Insight Diah Anna</div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.63rem' }}>Berdasarkan Career DNA kamu</div>
                  </div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.86rem', lineHeight: 1.75 }}>
                  {insight}
                </div>
              </Card>
            )}

            {/* ── 2. CAREER GENOME ──────────────────────────────────────────── */}
            <Card delay={0.1} visible={visible}>
              <SectionTitle>🧬 Career Genome</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {GENOME_MAP.map(g => {
                  const val = scores[g.key] || 0
                  if (val === 0) return null
                  const isTop = topKey === g.key
                  return (
                    <div key={g.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: '0.95rem' }}>{g.emoji}</span>
                          <span style={{ color: isTop ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: isTop ? 700 : 500, fontSize: '0.83rem' }}>
                            {g.label}
                          </span>
                          {isTop && (
                            <span style={{
                              background: `${g.color}25`, color: g.color,
                              fontSize: '0.58rem', padding: '2px 8px',
                              borderRadius: 99, fontWeight: 700, letterSpacing: '0.3px',
                            }}>
                              TOP
                            </span>
                          )}
                        </span>
                        <span style={{ color: g.color, fontWeight: 800, fontSize: '0.95rem' }}>{val}</span>
                      </div>
                      {/* Bar */}
                      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 7, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{
                          background: `linear-gradient(90deg,${g.color},${g.color}80)`,
                          width: `${val}%`, height: '100%', borderRadius: 99,
                          transition: 'width 1s ease',
                        }} />
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.65rem' }}>{g.desc}</div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* ── 3. KEKUATAN UTAMA (Strengths) ─────────────────────────────── */}
            {topTraits.length > 0 && (
              <Card delay={0.15} visible={visible}>
                <SectionTitle>💪 Kekuatan Utama</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {topTraits.map((g, i) => (
                    <div
                      key={g.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 13px',
                        background: i === 0 ? 'rgba(37,211,102,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${i === 0 ? 'rgba(37,211,102,0.22)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 13,
                      }}
                    >
                      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{g.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: i === 0 ? '#25D366' : 'rgba(255,255,255,0.82)',
                          fontWeight: i === 0 ? 700 : 500,
                          fontSize: '0.84rem', marginBottom: 2,
                        }}>
                          {g.label}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>{g.desc}</div>
                      </div>
                      <div style={{ color: g.color, fontWeight: 800, fontSize: '0.9rem' }}>
                        {scores[g.key]}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── 4. AREA PENGEMBANGAN (Weaknesses → Gaps) ──────────────────── */}
            {gaps.length > 0 && (
              <Card delay={0.2} visible={visible}>
                <SectionTitle>📈 Area Pengembangan</SectionTitle>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: 12, lineHeight: 1.6 }}>
                  Bukan kelemahan — ini peluang terbesar untuk tumbuh.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {gaps.slice(0, 6).map((g, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(239,83,80,0.07)',
                        border: '1px solid rgba(239,83,80,0.2)',
                        borderRadius: 9, padding: '6px 13px',
                        fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      📍 {g}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── 5. CAREER VALUES ──────────────────────────────────────────── */}
            {values.length > 0 && (
              <Card delay={0.25} visible={visible} accent="255,183,77">
                <SectionTitle>🌟 Career Values</SectionTitle>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: 12 }}>
                  Hal yang paling kamu jaga dalam karier
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {values.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(255,183,77,0.1)',
                        border: '1px solid rgba(255,183,77,0.25)',
                        borderRadius: 10, padding: '8px 14px',
                        fontSize: '0.82rem', color: '#FFB74D', fontWeight: 600,
                      }}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── 6. WORK STYLE ─────────────────────────────────────────────── */}
            <Card delay={0.3} visible={visible} accent="52,183,241">
              <SectionTitle>🔧 Work Style</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {workStyle.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 13px',
                      background: 'rgba(52,183,241,0.06)',
                      border: '1px solid rgba(52,183,241,0.15)',
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{w.emoji}</span>
                    <div>
                      <div style={{ color: '#34B7F1', fontWeight: 600, fontSize: '0.84rem', marginBottom: 2 }}>
                        {w.label}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{w.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.65rem', marginTop: 10 }}>
                Dianalisis dari kombinasi genome score kamu
              </div>
            </Card>

            {/* ── 7. PREFERENSI KARIER (Industry + Environment) ─────────────── */}
            <Card delay={0.35} visible={visible}>
              <SectionTitle>🏢 Preferensi Karier</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{
                  background: 'rgba(255,183,77,0.07)',
                  border: '1px solid rgba(255,183,77,0.18)',
                  borderRadius: 13, padding: '14px 13px',
                }}>
                  <div style={{ color: 'rgba(255,183,77,0.7)', fontSize: '0.63rem', letterSpacing: '0.8px', marginBottom: 6 }}>
                    INDUSTRI
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>
                    {industri || 'Fleksibel'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(206,147,216,0.07)',
                  border: '1px solid rgba(206,147,216,0.18)',
                  borderRadius: 13, padding: '14px 13px',
                }}>
                  <div style={{ color: 'rgba(206,147,216,0.7)', fontSize: '0.63rem', letterSpacing: '0.8px', marginBottom: 6 }}>
                    ENVIRONMENT
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>
                    {environment}
                  </div>
                </div>
              </div>

              {scores?.updated_at && (
                <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.65rem', marginTop: 12, textAlign: 'center' }}>
                  Diperbarui {new Date(scores.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </Card>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <button
              onClick={() => navigate('/chat')}
              style={{
                width: '100%', marginBottom: 12,
                padding: '14px',
                background: 'linear-gradient(135deg,#25D366,#128C7E)',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                borderRadius: 14, border: 'none', cursor: 'pointer',
                boxShadow: '0 3px 16px rgba(37,211,102,0.32)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.45s ease 0.4s',
              }}
            >
              💬 Diskusikan DNA ini dengan Diah Anna
            </button>

          </>
        )}
      </div>

      <BottomNav isPremium={plan === 'premium'} />
    </div>
  )
}
