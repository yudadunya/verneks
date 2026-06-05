import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#fff" fillOpacity="0.9" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#fff" fillOpacity="0.7" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#fff" fillOpacity="0.8" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#fff" fillOpacity="0.9" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="lgLogo" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25D366"/><stop offset="100%" stopColor="#128C7E"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#lgLogo)"/>
    <circle cx="50" cy="38" r="14" fill="none" stroke="#fff" strokeWidth="5"/>
    <path d="M30 70 Q50 55 70 70" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>
    <path d="M60 28 L62 22 L64 28 L70 30 L64 32 L62 38 L60 32 L54 30 Z" fill="rgba(255,255,255,0.9)"/>
  </svg>
)

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DIAH_CHAT = [
  { role: 'user', text: 'Diah, aku udah 3 tahun kerja tapi ngerasa karier aku nggak kemana-mana...' },
  { role: 'diah', text: 'Aku paham banget perasaan itu. Boleh aku tanya — kalau kamu bayangin karier impianmu 5 tahun dari sekarang, kira-kira seperti apa?' },
  { role: 'user', text: 'Aku nggak tau... itulah masalahnya 😔' },
  { role: 'diah', text: 'Justru itu yang kita temukan bareng. Aku bantu kamu explore Career DNA kamu — strength tersembunyi, passion, dan arah karier yang paling cocok buat kamu. Mulai yuk? 🧬' },
]

const PROBLEMS = [
  { emoji: '🔍', text: '"Karier saya cocoknya ke mana?"' },
  { emoji: '📚', text: '"Skill apa yang harus saya pelajari?"' },
  { emoji: '🚪', text: '"Saya harus mulai dari mana?"' },
  { emoji: '🎯', text: '"Bagaimana cara mencapai target saya?"' },
]

const GENOME_TRAITS = [
  { label: 'Analytical', pct: 87, color: '#25D366' },
  { label: 'Leadership', pct: 72, color: '#34B7F1' },
  { label: 'Creative', pct: 65, color: '#FFB74D' },
  { label: 'Empathy', pct: 91, color: '#F48FB1' },
  { label: 'Strategic', pct: 78, color: '#CE93D8' },
]

const GAP_ITEMS = [
  { skill: 'Data Analysis', status: 'gap', pct: 30, needed: 80 },
  { skill: 'Leadership', status: 'ok', pct: 72, needed: 70 },
  { skill: 'Product Strategy', status: 'gap', pct: 40, needed: 85 },
  { skill: 'Stakeholder Mgmt', status: 'partial', pct: 55, needed: 75 },
]

const GPS_STEPS = [
  { month: 'Bulan 1–2', title: 'Fondasi', desc: 'Google Data Analytics Certificate + 2 proyek portfolio', icon: '📐' },
  { month: 'Bulan 3–4', title: 'Eksekusi', desc: 'Kontribusi di 1 perusahaan startup, bangun network LinkedIn', icon: '⚡' },
  { month: 'Bulan 5–6', title: 'Akselerasi', desc: 'Apply ke 10 posisi Product Analyst yang dikurasi Diah Anna', icon: '🚀' },
  { month: 'Bulan 7+', title: 'Growth', desc: 'Weekly coaching & progress tracking menuju promosi pertama', icon: '📈' },
]

const FAQS = [
  { q: 'Apa itu Career DNA?', a: 'Career DNA adalah peta unik yang menggambarkan kekuatan, kepribadian, dan passion karier kamu — diekstrak dari percakapan mendalam dengan Diah Anna AI. Hasilnya adalah Career Genome, visual representation tentang siapa kamu secara profesional.' },
  { q: 'Apakah gratis sepenuhnya?', a: 'Ya! Career Discovery, Career Genome, Career Gap Analysis, dan GPS Preview tersedia gratis. Untuk Full Career GPS dengan roadmap detail, weekly coaching, dan akses unlimited ke Diah Anna, tersedia di paket Premium.' },
  { q: 'Bedanya LamarCerdas Career GPS dengan platform karier lain?', a: 'Platform lain menjual tools (ATS checker, CV builder). Kami menjual arah dan roadmap. Kami tidak mulai dari CV — kami mulai dari siapa kamu, ke mana kamu mau pergi, dan apa yang perlu kamu lakukan untuk sampai ke sana.' },
  { q: 'Berapa lama proses Career Discovery?', a: 'Sekitar 10–15 menit percakapan dengan Diah Anna. Tidak ada form panjang — cukup ngobrol natural tentang dirimu, pengalaman, dan aspirasi karier.' },
  { q: 'Apakah cocok untuk fresh graduate?', a: 'Sangat cocok. Justru fresh graduate sangat diuntungkan karena bisa menentukan arah karier yang tepat sejak awal, bukan trial-error bertahun-tahun.' },
]

// ─── SCROLL ANIMATION HOOK ────────────────────────────────────────────────────
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

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ children, style = {}, delay = 0 }) {
  const [ref, visible] = useInView()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      ...style
    }}>
      {children}
    </div>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ text, color = '#25D366' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ color, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{text}</span>
    </div>
  )
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
function SectionTitle({ badge, badgeColor, title, sub, light = false, center = true }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: 28 }}>
      {badge && <Badge text={badge} color={badgeColor || '#25D366'} />}
      <h2 style={{ color: light ? '#fff' : '#0a1a0f', fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.4px', margin: '0 0 8px' }}>{title}</h2>
      {sub && <p style={{ color: light ? 'rgba(255,255,255,0.55)' : '#667781', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>{sub}</p>}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home({ user }) {
  const navigate = useNavigate()
  const [authLoading, setAuthLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [chatIdx, setChatIdx] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)
  const [barAnim, setBarAnim] = useState(false)

  useEffect(() => {
    if (user) { window.location.href = '/chat'; return }
    setTimeout(() => setVisible(true), 100)
    setTimeout(() => setBarAnim(true), 800)
  }, [user])

  useEffect(() => {
    if (chatIdx >= DIAH_CHAT.length) return
    const t = setTimeout(() => setChatIdx(i => i + 1), chatIdx === 0 ? 600 : 1300)
    return () => clearTimeout(t)
  }, [chatIdx])

  if (user) return null

  const handleGoogle = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/chat` } })
    setAuthLoading(false)
  }

  const CTAButton = ({ label = 'Temukan Career DNA Kamu — Gratis', style = {} }) => (
    <button onClick={handleGoogle} disabled={authLoading} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      background: authLoading ? '#1a3a20' : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
      color: '#fff', fontWeight: 800, fontSize: '0.95rem',
      padding: '15px 22px', borderRadius: 14, border: 'none',
      cursor: authLoading ? 'not-allowed' : 'pointer',
      boxShadow: authLoading ? 'none' : '0 4px 24px rgba(37,211,102,0.35)',
      width: '100%', maxWidth: 420,
      transition: 'all 0.2s', ...style
    }}>
      {!authLoading && <GoogleIcon />}
      {authLoading ? 'Mengarahkan...' : label}
    </button>
  )

  return (
    <div style={{ background: '#07120a', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* ── AMBIENT BG ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,183,241,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '30%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <nav style={{ position: 'relative', zIndex: 100, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logo />
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.1 }}>LamarCerdas</div>
            <div style={{ color: '#25D366', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Career GPS</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '48px 20px 32px' }}>

        {/* Journey bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 0, marginBottom: 36, overflowX: 'auto',
          opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.2s',
        }}>
          {['Bingung','Paham Diri','Temukan Potensi','Tahu Gap','Dapat GPS','Karier Berkembang'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              <div style={{
                background: i < 2 ? '#25D366' : i < 4 ? '#128C7E' : 'rgba(37,211,102,0.2)',
                border: `1px solid ${i < 4 ? 'transparent' : 'rgba(37,211,102,0.3)'}`,
                color: i < 4 ? '#fff' : 'rgba(255,255,255,0.4)',
                borderRadius: 20, padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>{s}</div>
              {i < 5 && <div style={{ width: 14, height: 1, background: i < 3 ? '#25D366' : 'rgba(37,211,102,0.2)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Main headline */}
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          textAlign: 'center',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
            <span style={{ color: '#25D366', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px' }}>AI CAREER GPS UNTUK PROFESIONAL INDONESIA</span>
          </div>

          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.6px', marginBottom: 10 }}>
            Temukan <span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DNA Karier</span> Kamu.<br />
            Dapatkan <span style={{ background: 'linear-gradient(90deg, #34B7F1, #25D366)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GPS</span> untuk Mencapainya.
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            Bukan CV Builder. Bukan ATS Checker.<br />
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>LamarCerdas adalah peta arah karier personal kamu</strong> — dari siapa kamu sekarang, ke mana kamu mau pergi.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <CTAButton />
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', margin: 0 }}>
              Gratis · Tidak perlu kartu kredit · Mulai dalam 2 menit
            </p>
          </div>
        </div>

        {/* Diah Anna Chat Preview */}
        <div style={{
          marginTop: 36,
          opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.4s',
        }}>
          <div style={{ background: '#0d1f12', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(37,211,102,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* Chat header */}
            <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Diah Anna</div>
                <div style={{ color: '#25D366', fontSize: '0.68rem', fontWeight: 600 }}>● AI Career Mentor • online</div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 12, padding: '3px 10px' }}>
                <span style={{ color: '#25D366', fontSize: '0.65rem', fontWeight: 700 }}>Career GPS</span>
              </div>
            </div>
            {/* Messages */}
            <div style={{ padding: '14px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 160 }}>
              {DIAH_CHAT.slice(0, chatIdx).map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%', borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                    background: msg.role === 'user' ? '#005c4b' : '#1a2e1a',
                    padding: '9px 12px', color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.82rem', lineHeight: 1.55, wordBreak: 'break-word',
                  }}>{msg.text}</div>
                </div>
              ))}
              {chatIdx < DIAH_CHAT.length && DIAH_CHAT[chatIdx].role === 'diah' && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#1a2e1a', borderRadius: '3px 14px 14px 14px', padding: '10px 14px', display: 'flex', gap: 4 }}>
                    {[0,1,2].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', animation: `dotBounce 1.2s ${d*0.2}s ease infinite` }} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. PROBLEM SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px' }}>
        <Section>
          <SectionTitle
            badge="Kamu tidak sendirian"
            title="Jutaan Profesional Indonesia Punya Pertanyaan yang Sama"
            sub="Bukan karena malas atau tidak berbakat — tapi karena tidak ada yang kasih peta jalan yang jelas."
            light
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PROBLEMS.map((p, i) => (
              <Section key={p.text} delay={i * 0.08}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px' }}>
                  <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{p.emoji}</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem', fontWeight: 600, fontStyle: 'italic' }}>{p.text}</span>
                </div>
              </Section>
            ))}
          </div>
          <div style={{ marginTop: 20, background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#25D366' }}>LamarCerdas Career GPS</strong> hadir untuk menjawab semua pertanyaan itu — bukan dengan template generik, tapi dengan roadmap personal yang dibuat khusus untuk kamu.
            </p>
          </div>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. WHY TRADITIONAL PLATFORMS FAIL
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px' }}>
        <Section>
          <SectionTitle
            badge="Masalah dengan platform lain"
            badgeColor="#FF5252"
            title="Kenapa Platform Karier Biasa Tidak Cukup?"
            sub="Mereka menjual tools. Kami menjual arah."
            light
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🧾', label: 'ATS Checker', problem: 'Tahu skor, tapi tidak tahu harus ke mana' },
              { icon: '📄', label: 'CV Builder', problem: 'CV cantik, tapi arah karier masih kabur' },
              { icon: '💼', label: 'Job Portal', problem: 'Ratusan lowongan, tapi mana yang cocok?' },
              { icon: '📚', label: 'Kursus Online', problem: 'Belajar banyak, tapi tidak tahu apa yang relevan' },
            ].map((item, i) => (
              <Section key={item.label} delay={i * 0.07}>
                <div style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.15)', borderRadius: 14, padding: '14px 12px', height: '100%' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: 'rgba(255,82,82,0.8)', fontSize: '0.74rem', lineHeight: 1.5 }}>❌ {item.problem}</div>
                </div>
              </Section>
            ))}
          </div>
          <Section delay={0.3}>
            <div style={{ marginTop: 14, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#25D366', fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>✅ LamarCerdas Career GPS</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>Mulai dari siapa kamu → tahu ke mana → dapat roadmap → execute bareng AI mentor</p>
            </div>
          </Section>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. CAREER DNA
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px', background: 'rgba(37,211,102,0.03)', borderTop: '1px solid rgba(37,211,102,0.08)', borderBottom: '1px solid rgba(37,211,102,0.08)' }}>
        <Section>
          <SectionTitle badge="Step 1" title="Temukan Career DNA Kamu 🧬" sub="Semua orang punya DNA karier yang unik — kombinasi kekuatan, nilai, dan passion yang membedakan kamu dari yang lain. Tugas Diah Anna adalah membantu kamu menemukannya." light />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '💬', title: 'Career Discovery Chat', desc: 'Ngobrol natural 10–15 menit dengan Diah Anna. Tidak ada form. Tidak ada tes psikologi panjang. Cukup ceritakan perjalananmu.' },
              { icon: '🔬', title: 'AI Deep Analysis', desc: 'Diah Anna menganalisa pola bicara, nilai-nilai, dan aspirasi kamu menggunakan AI yang dilatih khusus untuk konteks karier Indonesia.' },
              { icon: '🧬', title: 'Career DNA Report', desc: 'Kamu mendapat laporan lengkap: strength tersembunyi, working style, nilai karier, dan 3 arah karier yang paling matching dengan DNA kamu.' },
            ].map((item, i) => (
              <Section key={item.title} delay={i * 0.1}>
                <div style={{ display: 'flex', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(37,211,102,0.12)', borderRadius: 14, padding: '16px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. CAREER GENOME
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px' }}>
        <Section>
          <SectionTitle badge="Step 2" badgeColor="#34B7F1" title="Career Genome Kamu 📊" sub="Visual representation dari profil karier unikmu — seperti peta genetik, tapi untuk dunia profesional." light />

          {/* Mock Genome Card */}
          <div style={{ background: 'linear-gradient(135deg, #0d1f12 0%, #0a1a1f 100%)', border: '1px solid rgba(52,183,241,0.2)', borderRadius: 18, padding: '20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(52,183,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>Career Genome — Andhika R.</div>
                <div style={{ color: 'rgba(52,183,241,0.7)', fontSize: '0.7rem' }}>Product & Data Track • Match 94%</div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(37,211,102,0.15)', borderRadius: 10, padding: '4px 10px' }}>
                <span style={{ color: '#25D366', fontWeight: 800, fontSize: '0.85rem' }}>94%</span>
              </div>
            </div>
            {GENOME_TRAITS.map((t, i) => (
              <div key={t.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600 }}>{t.label}</span>
                  <span style={{ color: t.color, fontSize: '0.75rem', fontWeight: 700 }}>{t.pct}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: barAnim ? `${t.pct}%` : '0%', background: `linear-gradient(90deg, ${t.color}, ${t.color}88)`, borderRadius: 4, transition: `width 1s ease ${i * 0.12}s` }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '12px', background: 'rgba(52,183,241,0.06)', borderRadius: 10, border: '1px solid rgba(52,183,241,0.15)' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: 4, fontWeight: 600 }}>🎯 TOP CAREER MATCH</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Product Manager', 'Data Analyst', 'Business Analyst'].map(c => (
                  <span key={c} style={{ background: 'rgba(52,183,241,0.12)', border: '1px solid rgba(52,183,241,0.25)', color: '#34B7F1', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', textAlign: 'center', margin: '0 0 8px' }}>*Contoh hasil Career Genome</p>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. CAREER GAP ANALYSIS
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px', background: 'rgba(255,183,77,0.02)', borderTop: '1px solid rgba(255,183,77,0.08)', borderBottom: '1px solid rgba(255,183,77,0.08)' }}>
        <Section>
          <SectionTitle badge="Step 3" badgeColor="#FFB74D" title="Career Gap Analysis ⚡" sub="Tahu posisi impianmu? Diah Anna akan mapping apa yang sudah kamu punya vs apa yang masih perlu dikembangkan." light />

          <div style={{ background: '#0d1a0d', border: '1px solid rgba(255,183,77,0.15)', borderRadius: 18, padding: '18px', marginBottom: 16 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 14 }}>TARGET: PRODUCT MANAGER @ TECH STARTUP</div>
            {GAP_ITEMS.map((item, i) => {
              const statusColor = item.status === 'ok' ? '#25D366' : item.status === 'partial' ? '#FFB74D' : '#FF5252'
              const statusLabel = item.status === 'ok' ? '✅ Siap' : item.status === 'partial' ? '⚠️ Perlu diperkuat' : '❌ Gap utama'
              return (
                <Section key={item.skill} delay={i * 0.08}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', fontWeight: 600 }}>{item.skill}</span>
                      <span style={{ color: statusColor, fontSize: '0.7rem', fontWeight: 700 }}>{statusLabel}</span>
                    </div>
                    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: barAnim ? `${item.pct}%` : '0%', background: `linear-gradient(90deg, ${statusColor}, ${statusColor}99)`, borderRadius: 5, transition: `width 1s ease ${i * 0.15}s` }} />
                      <div style={{ position: 'absolute', top: 0, left: `${item.needed}%`, width: 2, height: '100%', background: 'rgba(255,255,255,0.3)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>Kamu: {item.pct}%</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>Target: {item.needed}%</span>
                    </div>
                  </div>
                </Section>
              )
            })}
          </div>
          <div style={{ background: 'rgba(255,183,77,0.07)', border: '1px solid rgba(255,183,77,0.2)', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
              🎯 <strong style={{ color: '#FFB74D' }}>Gap Analysis</strong> kamu tersedia <strong style={{ color: '#FFB74D' }}>gratis</strong> setelah Career Discovery dengan Diah Anna
            </p>
          </div>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. DIAH ANNA SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px' }}>
        <Section>
          <SectionTitle badge="AI Career Mentor" title="Kenali Diah Anna" sub="Bukan chatbot biasa. Diah Anna dilatih khusus untuk memahami lanskap karier Indonesia." light />

          <div style={{ background: 'linear-gradient(135deg, #0d1f12, #0a1a20)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 18, padding: '20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
              <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Diah Anna</div>
                <div style={{ color: '#25D366', fontSize: '0.75rem', fontWeight: 600 }}>AI Career Mentor • LamarCerdas</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: 2 }}>Dilatih dari 10.000+ data karier profesional Indonesia</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '🇮🇩', title: 'Konteks Indonesia', desc: 'Paham kultur kerja & pasar lokal' },
                { icon: '🎯', title: 'Goal-Oriented', desc: 'Setiap saran arah ke hasil konkret' },
                { icon: '🔄', title: 'Makin Cerdas', desc: 'Semakin sering ngobrol, makin personal' },
                { icon: '💙', title: 'Empathetic', desc: 'Tanpa judgment, selalu supportif' },
              ].map(f => (
                <div key={f.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: 5 }}>{f.icon}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.78rem', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial style */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px' }}>
            <div style={{ color: '#25D366', fontSize: '1.2rem', marginBottom: 8 }}>"</div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', lineHeight: 1.65, margin: '0 0 10px', fontStyle: 'italic' }}>
              Setelah ngobrol 15 menit sama Diah Anna, aku akhirnya tau kenapa aku selalu ngerasa stuck. Ternyata aku lebih cocok di jalur product daripada marketing yang selama ini aku kejar.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>R</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.78rem' }}>Rizky A.</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Fresh Graduate • Universitas Indonesia</div>
              </div>
            </div>
          </div>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. CAREER GPS SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px', background: 'rgba(37,211,102,0.03)', borderTop: '1px solid rgba(37,211,102,0.08)', borderBottom: '1px solid rgba(37,211,102,0.08)' }}>
        <Section>
          <SectionTitle badge="Step 4" title="Career GPS Kamu 🗺️" sub="Roadmap detail bulan per bulan — bukan saran generik, tapi langkah konkret yang disesuaikan dengan gap dan kecepatan belajar kamu." light />

          <div style={{ position: 'relative', paddingLeft: 28 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 10, top: 10, bottom: 10, width: 2, background: 'linear-gradient(180deg, #25D366, #128C7E88)' }} />

            {GPS_STEPS.map((step, i) => (
              <Section key={step.month} delay={i * 0.1}>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  {/* Dot */}
                  <div style={{ position: 'absolute', left: -28 + 5, top: 14, width: 12, height: 12, borderRadius: '50%', background: i === 0 ? '#25D366' : i === 1 ? '#34B7F1' : i === 2 ? '#FFB74D' : '#CE93D8', boxShadow: `0 0 8px ${i === 0 ? '#25D366' : i === 1 ? '#34B7F1' : '#FFB74D'}` }} />
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '1.1rem' }}>{step.icon}</span>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px' }}>{step.month}</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>{step.title}</div>
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              </Section>
            ))}
          </div>

          <div style={{ background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
              🔒 GPS Preview <strong style={{ color: '#25D366' }}>gratis</strong> · Full GPS dengan weekly coaching di <strong style={{ color: '#25D366' }}>Premium</strong>
            </p>
          </div>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          10. FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Section>
          <SectionTitle badge="FAQ" title="Pertanyaan yang Sering Ditanya" light />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${openFaq === i ? 'rgba(37,211,102,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', gap: 12 }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', textAlign: 'left', lineHeight: 1.45 }}>{faq.q}</span>
                  <span style={{ color: '#25D366', fontSize: '1rem', flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          11. FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 20px 64px' }}>
        <Section>
          <div style={{ background: 'linear-gradient(135deg, rgba(37,211,102,0.1) 0%, rgba(52,183,241,0.08) 100%)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
            {/* Journey mini visual */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {['😕 Bingung','→','😊 Paham','→','💡 Potensi','→','🗺️ GPS','→','🚀 Karier'].map((s, i) => (
                <span key={i} style={{ color: s === '→' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: s === '→' ? '0.7rem' : '0.78rem', fontWeight: s === '→' ? 400 : 700 }}>{s}</span>
              ))}
            </div>

            <h2 style={{ color: '#fff', fontSize: '1.7rem', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.4px', marginBottom: 10 }}>
              Perjalanan Kariermu<br />
              <span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dimulai Hari Ini</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 24 }}>
              10 menit ngobrol sama Diah Anna.<br />
              Dapatkan Career DNA, Career Gap Analysis, dan GPS Preview kamu — <strong style={{ color: '#25D366' }}>gratis selamanya</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <CTAButton label="Mulai Career Discovery — Gratis" />
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', margin: 0 }}>
                Bergabung dengan 12.000+ profesional Indonesia 🇮🇩
              </p>
            </div>
          </div>
        </Section>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 5, padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <Logo />
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.1 }}>LamarCerdas</div>
            <div style={{ color: '#25D366', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '1px' }}>CAREER GPS</div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', margin: '0 0 8px' }}>
          © 2025 LamarCerdas. Made with 💙 for Indonesian professionals.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {['Privacy', 'Kontak'].map(l => (
            <button key={l} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.2)} }
        @keyframes dotBounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07120a; }
        ::-webkit-scrollbar { display: none; }
        button { font-family: inherit; }
      `}</style>
    </div>
  )
}
