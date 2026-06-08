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

// Career Values berdasarkan top genome
const VALUES_MAP = {
  analytical:    [{ emoji: '🔍', label: 'Akurasi' }, { emoji: '📊', label: 'Data-driven' }, { emoji: '💡', label: 'Insight' }, { emoji: '🧩', label: 'Problem Solving' }],
  leadership:    [{ emoji: '🎯', label: 'Dampak' }, { emoji: '👥', label: 'Team Growth' }, { emoji: '🏆', label: 'Pencapaian' }, { emoji: '📣', label: 'Influence' }],
  builder:       [{ emoji: '⚡', label: 'Eksekusi' }, { emoji: '🔧', label: 'Kualitas' }, { emoji: '📈', label: 'Growth' }, { emoji: '🛠️', label: 'Craft' }],
  creator:       [{ emoji: '✨', label: 'Inovasi' }, { emoji: '🎨', label: 'Estetika' }, { emoji: '💫', label: 'Originalitas' }, { emoji: '🌱', label: 'Learning' }],
  communication: [{ emoji: '🤝', label: 'Kolaborasi' }, { emoji: '💬', label: 'Pengaruh' }, { emoji: '🌟', label: 'Inspirasi' }, { emoji: '🌐', label: 'Networking' }],
  risk_taking:   [{ emoji: '🚀', label: 'Ambisi' }, { emoji: '🔥', label: 'Tantangan' }, { emoji: '💎', label: 'Potensi' }, { emoji: '🎲', label: 'Otonomi' }],
}

// Work Style berdasarkan genome scores
function getWorkStyle(scores) {
  if (!scores) return [{ label: 'Flexible', emoji: '🔄', desc: 'Adaptif di berbagai kondisi kerja' }]
  const rules = [
    { key: 'analytical',    threshold: 55, label: 'Deep Focus',    emoji: '🎯', desc: 'Paling produktif saat ada waktu tenang tanpa distraksi' },
    { key: 'communication', threshold: 55, label: 'Collaborative', emoji: '🤝', desc: 'Tumbuh lewat diskusi, brainstorming, dan kerja bareng tim' },
    { key: 'builder',       threshold: 55, label: 'Hands-On',      emoji: '⚙️', desc: 'Senang langsung eksekusi dan lihat hasilnya nyata' },
    { key: 'leadership',    threshold: 55, label: 'Team Leader',   emoji: '👑', desc: 'Punya drive alami untuk mengarahkan dan mengorganisir' },
    { key: 'creator',       threshold: 55, label: 'Creative Mode', emoji: '🎨', desc: 'Butuh ruang untuk eksplorasi ide dan berpikir out-of-the-box' },
    { key: 'risk_taking',   threshold: 55, label: 'Independent',   emoji: '🦅', desc: 'Bekerja paling baik dengan otonomi tinggi, minim micromanagement' },
  ]
  const result = rules.filter(r => (scores[r.key] || 0) >= r.threshold).slice(0, 3)
  return result.length ? result : [{ label: 'Flexible', emoji: '🔄', desc: 'Adaptif di berbagai kondisi kerja' }]
}

// Strengths — 3 trait teratas
function getStrengths(scores) {
  return [...GENOME_MAP]
    .filter(g => (scores?.[g.key] || 0) > 0)
    .sort((a, b) => (scores[b.key] || 0) - (scores[a.key] || 0))
    .slice(0, 3)
}

// Weaknesses — 2 trait terendah yang masih ada nilainya
function getWeaknesses(scores) {
  return [...GENOME_MAP]
    .filter(g => (scores?.[g.key] || 0) > 0)
    .sort((a, b) => (scores[a.key] || 0) - (scores[b.key] || 0))
    .slice(0, 2)
}

// Motivations berdasarkan top genome
const MOTIVATIONS_MAP = {
  analytical:    ['Memecahkan masalah kompleks', 'Menemukan pola tersembunyi', 'Membuat keputusan berbasis data'],
  leadership:    ['Melihat tim berkembang', 'Menciptakan dampak nyata', 'Memimpin perubahan'],
  builder:       ['Membangun sesuatu dari nol', 'Melihat produk jadi nyata', 'Mengoptimalkan sistem'],
  creator:       ['Menciptakan hal baru', 'Bereksperimen dengan ide', 'Mengekspresikan visi'],
  communication: ['Menginspirasi orang lain', 'Membangun relasi bermakna', 'Berbagi pengetahuan'],
  risk_taking:   ['Menembus batas baru', 'Mengambil tantangan besar', 'Menciptakan peluang dari ketidakpastian'],
}

// Preferred Environment
function getEnvironment(scores) {
  if (!scores) return 'Fleksibel'
  if ((scores.communication || 0) > 65) return 'Collaborative Office'
  if ((scores.analytical || 0) > 65)    return 'Remote / Deep Work'
  if ((scores.builder || 0) > 65)       return 'Hybrid — Fleksibel'
  return 'Remote Friendly'
}

// Preferred Industry berdasarkan top genome
const INDUSTRY_MAP = {
  analytical:    ['🏦 Finance & Banking', '📊 Data & Analytics', '🔬 Research'],
  leadership:    ['🏢 Consulting', '🚀 Startup', '🌐 Corporate'],
  builder:       ['💻 Tech & Software', '🏗️ Engineering', '🛒 E-Commerce'],
  creator:       ['🎨 Creative Agency', '📱 Product & Design', '🎬 Media & Content'],
  communication: ['📣 Marketing', '🤝 HR & People', '💼 Sales & BD'],
  risk_taking:   ['🚀 Startup', '💰 Venture Capital', '🌍 Business Dev'],
}

// Card wrapper
function Card({ children, delay = 0, visible, accentColor }) {
  return (
    <div style={{
      background: accentColor ? `${accentColor}08` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accentColor ? `${accentColor}20` : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 18, padding: '18px', marginBottom: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(14px)',
      transition: `opacity 0.45s ease ${delay}s, transform 0.45s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ emoji, children, color }) {
  return (
    <div style={{ color: color || '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 14 }}>
      {emoji && <span style={{ marginRight: 6 }}>{emoji}</span>}{children}
    </div>
  )
}

function Tag({ label, emoji, color, bg, border }) {
  return (
    <div style={{
      background: bg || 'rgba(255,255,255,0.05)',
      border: `1px solid ${border || 'rgba(255,255,255,0.1)'}`,
      borderRadius: 10, padding: '7px 13px',
      fontSize: '0.8rem', color: color || 'rgba(255,255,255,0.7)',
      fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
    }}>
      {emoji && <span>{emoji}</span>}{label}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
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
        .select('target_posisi, industri, skill_gaps, mentor_message, posisi_saat_ini')
        .eq('user_id', user.id).maybeSingle(),
    ]).then(async ([{ data: s }, { data: p }]) => {
      const genomeKosong = !s || !GENOME_MAP.some(g => (s[g.key] || 0) > 0)
      const adaProfil    = p && p.target_posisi

      // Auto-compute genome dari profil yang ada — tanpa user perlu apa-apa
      if (genomeKosong && adaProfil) {
        try {
          const coachKey = user.id ? `lc_coach_${user.id}` : null
          const saved    = coachKey ? localStorage.getItem(coachKey) : null
          const messages = saved ? JSON.parse(saved) : []

          const res    = await fetch('/api/compute-genome', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ messages, profile: p }),
          })
          const result = await res.json()

          if (result.genome_scores) {
            const gs = result.genome_scores
            await supabase.from('user_genome_scores').upsert({
              user_id:       user.id,
              analytical:    gs.analytical    || 0,
              leadership:    gs.leadership    || 0,
              builder:       gs.builder       || 0,
              creator:       gs.creator       || 0,
              communication: gs.communication || 0,
              risk_taking:   gs.risk_taking   || 0,
              top_strength:  result.top_strength || null,
              updated_at:    new Date().toISOString(),
            }, { onConflict: 'user_id' })

            // Fetch ulang genome yang baru disimpan
            const { data: newScores } = await supabase
              .from('user_genome_scores').select('*')
              .eq('user_id', user.id).maybeSingle()
            setScores(newScores)
          }
        } catch(e) { console.warn('[dna-autocompute]', e) }
      } else {
        setScores(s)
      }

      setProfile(p)
      setLoading(false)
      setTimeout(() => setVisible(true), 80)
    })
  }, [user?.id])

  const hasData    = scores && GENOME_MAP.some(g => (scores[g.key] || 0) > 0)
  const strengths  = hasData ? getStrengths(scores) : []
  const weaknesses = hasData ? getWeaknesses(scores) : []
  const topKey     = strengths[0]?.key
  const topGene    = GENOME_MAP.find(g => g.key === topKey)
  const workStyle  = getWorkStyle(hasData ? scores : null)
  const values     = topKey ? VALUES_MAP[topKey] : []
  const motivations = topKey ? MOTIVATIONS_MAP[topKey] : []
  const industries = topKey ? INDUSTRY_MAP[topKey] : []
  const environment = getEnvironment(hasData ? scores : null)
  const gaps       = profile?.skill_gaps || profile?.gap_skills || []
  const industri   = profile?.industri || null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>🧠</div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Memuat Career DNA...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', paddingBottom: 90, fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '14px 18px',
      }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>🧠 Career DNA</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: 2 }}>Profil genetik karier kamu</div>
      </div>

      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>

        {/* ══ NO DATA ══ */}
        {!hasData && (
          <div style={{ textAlign: 'center', padding: '52px 20px', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🧠</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', marginBottom: 10 }}>DNA-mu belum terbentuk</div>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem', lineHeight: 1.7, marginBottom: 28 }}>
              Ceritakan karier kamu ke Diah Anna agar DNA karier kamu bisa terbentuk.
            </div>
            <button onClick={() => navigate('/chat')} style={{
              padding: '13px 30px',
              background: 'linear-gradient(135deg,#25D366,#128C7E)',
              color: '#fff', fontWeight: 700, borderRadius: 13,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(37,211,102,0.3)', fontSize: '0.9rem',
            }}>
              💬 Chat dengan Diah Anna
            </button>
          </div>
        )}

        {/* ══ HAS DATA ══ */}
        {hasData && (<>

          {/* 1. INSIGHT DIAH ANNA */}
          {topKey && (
            <Card delay={0.04} visible={visible} accentColor="#25D366">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <img src="/diah-anna.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.4)', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.8rem' }}>Insight Diah Anna</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.63rem' }}>Berdasarkan Career DNA kamu</div>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.85rem', lineHeight: 1.75 }}>
                {INSIGHT_MAP[topKey]}
              </div>
            </Card>
          )}

          {/* 2. CAREER GENOME */}
          <Card delay={0.09} visible={visible}>
            <SectionTitle emoji="🧬">Career Genome</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {GENOME_MAP.map(g => {
                const val = scores[g.key] || 0
                if (val === 0) return null
                const isTop = topKey === g.key
                return (
                  <div key={g.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: '0.9rem' }}>{g.emoji}</span>
                        <span style={{ color: isTop ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: isTop ? 700 : 500, fontSize: '0.82rem' }}>{g.label}</span>
                        {isTop && (
                          <span style={{ background: `${g.color}25`, color: g.color, fontSize: '0.57rem', padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>TOP</span>
                        )}
                      </span>
                      <span style={{ color: g.color, fontWeight: 800, fontSize: '0.9rem' }}>{val}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 3 }}>
                      <div style={{ background: `linear-gradient(90deg,${g.color},${g.color}90)`, width: `${val}%`, height: '100%', borderRadius: 99, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.63rem' }}>{g.desc}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 3. CAREER VALUES */}
          {values.length > 0 && (
            <Card delay={0.14} visible={visible} accentColor="#FFB74D">
              <SectionTitle emoji="🌟" color="#FFB74D">Career Values</SectionTitle>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.73rem', marginBottom: 12 }}>
                Hal yang paling kamu jaga dalam karier
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {values.map((v, i) => (
                  <Tag key={i} emoji={v.emoji} label={v.label} color="#FFB74D" bg="rgba(255,183,77,0.08)" border="rgba(255,183,77,0.2)" />
                ))}
              </div>
            </Card>
          )}

          {/* 4. WORK STYLE */}
          <Card delay={0.19} visible={visible} accentColor="#34B7F1">
            <SectionTitle emoji="🔧" color="#34B7F1">Work Style</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workStyle.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 13px',
                  background: 'rgba(52,183,241,0.06)', border: '1px solid rgba(52,183,241,0.15)',
                  borderRadius: 12,
                }}>
                  <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{w.emoji}</span>
                  <div>
                    <div style={{ color: '#34B7F1', fontWeight: 600, fontSize: '0.83rem', marginBottom: 2 }}>{w.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.33)', fontSize: '0.69rem' }}>{w.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 5. STRENGTHS */}
          {strengths.length > 0 && (
            <Card delay={0.24} visible={visible} accentColor="#25D366">
              <SectionTitle emoji="💪" color="#25D366">Strengths</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {strengths.map((g, i) => (
                  <div key={g.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 13px',
                    background: i === 0 ? 'rgba(37,211,102,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${i === 0 ? 'rgba(37,211,102,0.22)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 13,
                  }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{g.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: i === 0 ? '#25D366' : 'rgba(255,255,255,0.8)', fontWeight: i === 0 ? 700 : 500, fontSize: '0.83rem', marginBottom: 2 }}>{g.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.67rem' }}>{g.desc}</div>
                    </div>
                    <span style={{ color: g.color, fontWeight: 800, fontSize: '0.88rem' }}>{scores[g.key]}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 6. WEAKNESSES (Area Pengembangan) */}
          {weaknesses.length > 0 && (
            <Card delay={0.29} visible={visible} accentColor="#EF5350">
              <SectionTitle emoji="📈" color="#EF9A9A">Weaknesses</SectionTitle>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.72rem', marginBottom: 12 }}>
                Bukan kekurangan — ini peluang terbesar untuk tumbuh.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {weaknesses.map((g, i) => (
                  <div key={g.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 13px',
                    background: 'rgba(239,83,80,0.05)', border: '1px solid rgba(239,83,80,0.15)',
                    borderRadius: 12,
                  }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{g.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '0.82rem', marginBottom: 2 }}>{g.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.67rem' }}>{g.desc}</div>
                    </div>
                    <span style={{ color: '#EF9A9A', fontWeight: 700, fontSize: '0.85rem' }}>{scores[g.key]}</span>
                  </div>
                ))}
              </div>
              {/* Tambahkan skill gap sebagai area pengembangan konkret */}
              {gaps.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.67rem', letterSpacing: '0.8px', marginBottom: 8 }}>SKILL GAPS:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {gaps.slice(0, 5).map((g, i) => (
                      <Tag key={i} label={g} emoji="📍" color="rgba(255,183,77,0.8)" bg="rgba(255,183,77,0.07)" border="rgba(255,183,77,0.18)" />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 7. MOTIVATIONS */}
          {motivations.length > 0 && (
            <Card delay={0.34} visible={visible} accentColor="#CE93D8">
              <SectionTitle emoji="🔥" color="#CE93D8">Motivations</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {motivations.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CE93D8', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem' }}>{m}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 8. PREFERRED INDUSTRY */}
          <Card delay={0.39} visible={visible} accentColor="#FFB74D">
            <SectionTitle emoji="🏢" color="#FFB74D">Preferred Industry</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(industri
                ? [{ emoji: '🎯', label: industri }, ...industries.slice(0, 2)]
                : industries
              ).map((ind, i) => (
                <Tag key={i}
                  emoji={typeof ind === 'string' ? '🏢' : ind.emoji}
                  label={typeof ind === 'string' ? ind : ind.label}
                  color="#FFB74D" bg="rgba(255,183,77,0.07)" border="rgba(255,183,77,0.18)"
                />
              ))}
            </div>
          </Card>

          {/* 9. PREFERRED ENVIRONMENT */}
          <Card delay={0.44} visible={visible}>
            <SectionTitle emoji="🌍">Preferred Environment</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
              }}>
                {environment.includes('Remote') ? '🏠' : environment.includes('Office') ? '🏢' : '🔄'}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: 3 }}>{environment}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
                  {environment.includes('Remote') ? 'Kerja paling produktif di lingkungan tenang dan fleksibel' :
                   environment.includes('Office') ? 'Berkembang pesat dalam lingkungan tim yang kolaboratif' :
                   'Fleksibel dan adaptif di berbagai kondisi kerja'}
                </div>
              </div>
            </div>

            {scores?.updated_at && (
              <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.63rem', marginTop: 14, textAlign: 'center' }}>
                Dianalisis {new Date(scores.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </Card>

          {/* CTA */}
          <button
            onClick={() => navigate('/chat')}
            style={{
              width: '100%', marginBottom: 12, padding: '14px',
              background: 'linear-gradient(135deg,#25D366,#128C7E)',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              borderRadius: 14, border: 'none', cursor: 'pointer',
              boxShadow: '0 3px 16px rgba(37,211,102,0.3)',
              opacity: visible ? 1 : 0, transition: 'opacity 0.45s ease 0.5s',
            }}
          >
            💬 Diskusikan DNA ini dengan Diah Anna
          </button>

        </>)}
      </div>

      <BottomNav isPremium={plan === 'premium'} />
    </div>
  )
}
