import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── BRAND TOKENS ─────────────────────────────────────────────────────────────
const C = {
  primary:   '#4F46E5',
  secondary: '#06B6D4',
  purple:    '#7C3AED',
  grad:      'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
  gradRev:   'linear-gradient(135deg, #06B6D4 0%, #4F46E5 100%)',
  bg:        '#06060F',
  surface:   'rgba(79,70,229,0.07)',
  border:    'rgba(79,70,229,0.2)',
  borderHi:  'rgba(6,182,212,0.3)',
  text:      '#fff',
  muted:     'rgba(255,255,255,0.45)',
  faint:     'rgba(255,255,255,0.08)',
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#fff" fillOpacity="0.9" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#fff" fillOpacity="0.7" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#fff" fillOpacity="0.8" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#fff" fillOpacity="0.9" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const VerneksLogo = ({ size = 32 }) => (
  <img
    src="/verneks_icon_1.png"
    alt="Verneks"
    width={size}
    height={size}
    style={{ objectFit: 'contain', display: 'block' }}
  />
)

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DIAH_CHAT = [
  { role: 'user', text: 'Diah, aku udah 3 tahun kerja tapi karier aku nggak kemana-mana...' },
  { role: 'diah', text: 'Aku paham banget perasaan itu. Boleh aku tanya — kalau kamu bayangin karier impianmu 5 tahun dari sekarang, seperti apa?' },
  { role: 'user', text: 'Aku nggak tau... itulah masalahnya 😔' },
  { role: 'diah', text: 'Justru itu yang kita temukan bareng. Aku bantu kamu explore Career DNA kamu — strength tersembunyi, passion, dan arah yang paling cocok. Mulai yuk? 🧬' },
]

const PROBLEMS = [
  { emoji: '🔍', text: '"Karier saya cocoknya ke mana?"' },
  { emoji: '📚', text: '"Skill apa yang harus saya pelajari?"' },
  { emoji: '🚪', text: '"Saya harus mulai dari mana?"' },
  { emoji: '🎯', text: '"Bagaimana cara mencapai target saya?"' },
]

const GENOME_TRAITS = [
  { label: 'Analytical',  pct: 87, color: '#06B6D4' },
  { label: 'Leadership',  pct: 72, color: '#4F46E5' },
  { label: 'Creative',    pct: 65, color: '#F59E0B' },
  { label: 'Empathy',     pct: 91, color: '#EC4899' },
  { label: 'Strategic',   pct: 78, color: '#7C3AED' },
]

const GAP_ITEMS = [
  { skill: 'Data Analysis',     status: 'gap',     pct: 30, needed: 80 },
  { skill: 'Leadership',        status: 'ok',      pct: 72, needed: 70 },
  { skill: 'Product Strategy',  status: 'gap',     pct: 40, needed: 85 },
  { skill: 'Stakeholder Mgmt',  status: 'partial', pct: 55, needed: 75 },
]

const GPS_STEPS = [
  { month: 'Bulan 1–2', title: 'Fondasi',    desc: 'Google Data Analytics Certificate + 2 proyek portfolio', icon: '📐' },
  { month: 'Bulan 3–4', title: 'Eksekusi',   desc: 'Kontribusi di startup, bangun network LinkedIn aktif',   icon: '⚡' },
  { month: 'Bulan 5–6', title: 'Akselerasi', desc: 'Apply ke 10 posisi yang dikurasi Diah Anna untukmu',     icon: '🚀' },
  { month: 'Bulan 7+',  title: 'Growth',     desc: 'Weekly coaching & progress tracking menuju promosi',     icon: '📈' },
]

const FAQS = [
  { q: 'Apa itu Career DNA di Verneks?', a: 'Career DNA adalah peta unik yang menggambarkan kekuatan, kepribadian, dan passion karier kamu — diekstrak dari percakapan mendalam dengan Diah Anna AI. Hasilnya adalah Career Genome, visual representation tentang siapa kamu secara profesional.' },
  { q: 'Apakah Verneks gratis?', a: 'Ya! Career Discovery, Career Genome, Career Gap Analysis, dan GPS Preview tersedia gratis. Untuk Full Career GPS dengan roadmap detail dan weekly coaching, tersedia di paket Premium.' },
  { q: 'Bedanya Verneks dengan platform karier lain?', a: 'Platform lain menjual tools (ATS checker, CV builder). Verneks menjual arah dan roadmap. Kami tidak mulai dari CV — kami mulai dari siapa kamu, ke mana kamu mau pergi, dan apa yang perlu kamu lakukan untuk sampai ke sana.' },
  { q: 'Berapa lama proses Career Discovery?', a: 'Sekitar 10–15 menit percakapan dengan Diah Anna. Tidak ada form panjang — cukup ngobrol natural tentang dirimu, pengalaman, dan aspirasi karier.' },
  { q: 'Apakah cocok untuk fresh graduate?', a: 'Sangat cocok. Justru fresh graduate sangat diuntungkan karena bisa menentukan arah karier yang tepat sejak awal, bukan trial-error bertahun-tahun.' },
]

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Section({ children, style = {}, delay = 0 }) {
  const [ref, visible] = useInView()
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(28px)', transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`, ...style }}>
      {children}
    </div>
  )
}

function Badge({ text, color = C.primary }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ color, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{text}</span>
    </div>
  )
}

function SectionTitle({ badge, badgeColor, title, sub, center = true }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: 28 }}>
      {badge && <Badge text={badge} color={badgeColor || C.primary} />}
      <h2 style={{ color: C.text, fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.4px', margin: '0 0 8px' }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>{sub}</p>}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Home({ user }) {
  const navigate  = useNavigate()
  const [authLoading, setAuthLoading] = useState(false)
  const [visible, setVisible]         = useState(false)
  const [chatIdx, setChatIdx]         = useState(0)
  const [openFaq, setOpenFaq]         = useState(null)
  const [barAnim, setBarAnim]         = useState(false)

  useEffect(() => {
    if (user) {
      // Cek apakah user sudah pernah Discovery — kalau sudah ke /chat, kalau belum ke /discovery
      supabase.from('user_career_profiles')
        .select('career_readiness')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.career_readiness != null) {
            window.location.href = '/chat'
          } else {
            window.location.href = '/discovery'
          }
        })
      return
    }
    setTimeout(() => setVisible(true), 100)
    setTimeout(() => setBarAnim(true), 800)
  }, [user])

  useEffect(() => {
    if (chatIdx >= DIAH_CHAT.length) return
    const t = setTimeout(() => setChatIdx(i => i + 1), chatIdx === 0 ? 600 : 1300)
    return () => clearTimeout(t)
  }, [chatIdx])

  if (user) return null

  // ── CTA (struktur login tidak diubah) ─────────────────────────────────────
  // Tombol Masuk (returning user) → /chat
  const handleGoogle = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/chat` } })
    setAuthLoading(false)
  }

  // CTA utama (user baru) → /discovery setelah login
  const handleCTA = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/discovery` } })
    setAuthLoading(false)
  }

  const CTAButton = ({ label = 'Temukan Career DNA Kamu — Gratis', style = {} }) => (
    <button onClick={handleCTA} disabled={authLoading} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      background: authLoading ? '#1a1a2e' : C.grad,
      color: '#fff', fontWeight: 800, fontSize: '0.95rem',
      padding: '15px 22px', borderRadius: 14, border: 'none',
      cursor: authLoading ? 'not-allowed' : 'pointer',
      boxShadow: authLoading ? 'none' : '0 4px 24px rgba(79,70,229,0.4)',
      width: '100%', maxWidth: 420,
      transition: 'all 0.2s', ...style
    }}>
      {!authLoading && <GoogleIcon />}
      {authLoading ? 'Mengarahkan...' : label}
    </button>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'relative', zIndex: 100, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <VerneksLogo size={32} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.3px' }}>Verneks</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <button onClick={handleGoogle} disabled={authLoading} style={{ background: C.surface, border: `1px solid ${C.border}`, color: '#fff', borderRadius: 20, padding: '7px 18px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            Masuk
          </button>
          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>Sudah punya akun? Masuk di sini</span>
        </div>
      </nav>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* ══════════════════════════════════
            SECTION 1 — HERO (PROBLEM AGITATION)
        ══════════════════════════════════ */}
        <div style={{
          padding: '52px 0 40px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s ease',
          textAlign: 'center',
        }}>
          {/* Overline */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 99, padding: '5px 14px', marginBottom: 28 }}>
            <span style={{ fontSize: '0.7rem', color: C.secondary, fontWeight: 700, letterSpacing: '1px' }}>AI CAREER COMPANION</span>
          </div>

          {/* Headline */}
          <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.2, margin: '0 0 20px', letterSpacing: '-0.5px' }}>
            Jangan Habiskan Hidupmu<br />
            <span style={{ background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Berjalan ke Arah yang Salah.
            </span>
          </h1>

          {/* Body copy */}
          <div style={{ color: C.muted, fontSize: '0.93rem', lineHeight: 1.9, marginBottom: 28 }}>
            <p style={{ margin: '0 0 16px' }}>Kamu sudah bekerja keras.</p>
            <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.65)' }}>Pertanyaannya:</p>
            <p style={{ margin: '0 0 20px', color: '#fff', fontWeight: 700, fontSize: '1rem', fontStyle: 'italic' }}>
              Apakah kamu sedang menuju tujuan yang benar?
            </p>
            <p style={{ margin: '0 0 4px' }}>Karena yang paling melelahkan bukanlah bekerja keras.</p>
            <p style={{ margin: 0, color: '#fff', fontWeight: 700 }}>Melainkan menghabiskan bertahun-tahun mengejar jalan yang ternyata bukan milikmu.</p>
          </div>

          {/* Sub-headline */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', margin: '0 0 16px' }}>
              Kenali Dirimu. Temukan Arahmu. Bangun Masa Depanmu.
            </p>
            <p style={{ color: C.muted, fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
              Bersama <strong style={{ color: C.secondary }}>Diah Anna</strong>, AI Career Companion yang membantumu memahami diri, menemukan arah yang tepat, dan mendampingimu hingga tujuanmu tercapai.
            </p>
          </div>

          {/* CTA Primary */}
          <CTAButton label="Mulai Gratis" />

          {/* Login hint */}
          <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
            Sudah punya akun?{' '}
            <span onClick={handleGoogle} style={{ color: C.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              Masuk di sini
            </span>
          </p>
        </div>

        {/* ══════════════════════════════════
            SECTION 2 — PAIN POINTS
        ══════════════════════════════════ */}
        <div style={{
          padding: '40px 0',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.7s ease 0.2s',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', textAlign: 'center', marginBottom: 8, lineHeight: 1.3 }}>
            Kamu Tidak Membutuhkan<br />Motivasi Lebih.
          </h2>
          <p style={{ color: C.secondary, fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', marginBottom: 28 }}>
            Kamu Membutuhkan Kejelasan.
          </p>

          <p style={{ color: C.muted, fontSize: '0.85rem', textAlign: 'center', marginBottom: 20 }}>Banyak orang merasa:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              'Bingung harus melangkah ke mana',
              'Tidak yakin dengan potensi dirinya',
              'Takut mengambil keputusan yang salah',
              'Merasa tertinggal dari orang lain',
              'Tidak tahu bagaimana mencapai kehidupan yang diinginkan',
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(239,83,80,0.06)', border: '1px solid rgba(239,83,80,0.15)',
              }}>
                <span style={{ color: '#EF5350', fontSize: '1rem', flexShrink: 0 }}>❌</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 14, textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0 0 6px' }}>Masalahnya bukan karena mereka tidak mampu.</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>Mereka hanya belum memiliki peta.</p>
          </div>
        </div>

        {/* ══════════════════════════════════
            SECTION 3 — SOLUTION (DIAH ANNA)
        ══════════════════════════════════ */}
        <div style={{
          padding: '40px 0',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.7s ease 0.3s',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.secondary}60`, flexShrink: 0 }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Diah Anna</div>
              <div style={{ color: C.muted, fontSize: '0.78rem' }}>AI Career Companion · Verneks</div>
            </div>
          </div>

          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: 20 }}>
            Diah Anna Akan Membantumu:
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {[
              { emoji: '🧬', text: 'Memahami siapa dirimu sebenarnya' },
              { emoji: '🧭', text: 'Menemukan jalur karier yang paling sesuai' },
              { emoji: '📍', text: 'Mengetahui posisi dan peluangmu saat ini' },
              { emoji: '🚀', text: 'Menentukan langkah berikutnya dengan jelas' },
              { emoji: '🎯', text: 'Tetap bergerak menuju tujuanmu' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.emoji}</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════
            SECTION 4 — BUKAN SEKADAR AI
        ══════════════════════════════════ */}
        <div style={{
          padding: '40px 0',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.7s ease 0.4s',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', marginBottom: 8, textAlign: 'center' }}>
            Bukan Sekadar AI.
          </h2>
          <p style={{ color: C.muted, fontSize: '0.88rem', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
            Bayangkan memiliki seseorang yang:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              'Mengenal kekuatanmu',
              'Mengingat tujuanmu',
              'Membantu saat kamu bingung',
              'Menunjukkan langkah berikutnya',
              'Mengingatkanmu ketika mulai kehilangan arah',
              'Menemanimu hingga tujuan tercapai',
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.12)',
              }}>
                <span style={{ color: '#25D366', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(79,70,229,0.08)', border: `1px solid ${C.border}`, borderRadius: 16 }}>
            <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0 0 6px' }}>Itulah</p>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: '1.4rem', margin: 0, background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Diah Anna.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════
            SECTION 5 — FINAL CTA
        ══════════════════════════════════ */}
        <div style={{
          padding: '40px 0 60px',
          textAlign: 'center',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.7s ease 0.5s',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.3rem', marginBottom: 8, lineHeight: 1.3 }}>
            Satu Keputusan Kecil Hari Ini
          </h2>
          <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: 32, lineHeight: 1.7 }}>
            Bisa menghemat bertahun-tahun kebingungan di masa depan.
          </p>

          <CTAButton label="Mulai Bersama Diah Anna" />

          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.7rem', marginTop: 16 }}>
            Gratis · Tidak perlu kartu kredit · Mulai dalam 2 menit
          </p>
        </div>

      </div>
    </div>
  )
}
