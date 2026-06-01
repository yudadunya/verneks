import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="lgNav" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25D366"/><stop offset="100%" stopColor="#128C7E"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#lgNav)"/>
    <rect x="27" y="18" width="36" height="50" rx="4" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="3"/>
    <line x1="34" y1="32" x2="56" y2="32" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="34" y1="41" x2="56" y2="41" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="34" y1="50" x2="50" y2="50" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="68" cy="72" r="12" fill="#25D366"/>
    <path d="M62 72 L66 76 L75 65" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M72,22 L73.4,25.6 L77,27 L73.4,28.4 L72,32 L70.6,28.4 L67,27 L70.6,25.6 Z" fill="rgba(255,255,255,0.85)"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#fff" fillOpacity="0.9" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#fff" fillOpacity="0.7" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#fff" fillOpacity="0.8" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#fff" fillOpacity="0.9" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

// Simulasi percakapan Diah Anna
const CHAT_PREVIEW = [
  { role: 'user',  text: 'Diah, CV aku udah 50 lamaran tapi gak ada yang balas 😔' },
  { role: 'diah',  text: 'Waah, pasti frustrasi banget ya. Boleh aku cek CV-nya? Biasanya ada 1-2 hal kecil yang bikin ATS langsung buang sebelum HRD baca.' },
  { role: 'user',  text: 'Beneran bisa ketahuan dari CV doang?' },
  { role: 'diah',  text: 'Iya! ATS score CV kamu sekarang berapa? Coba upload di sini, aku analisa langsung. Gratis kok 💙' },
]

export default function Home({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [chatIdx, setChatIdx] = useState(0)

  useEffect(() => {
    if (user) window.location.href = '/chat'
    setTimeout(() => setVisible(true), 80)
  }, [user])

  // Animasi chat preview muncul satu per satu
  useEffect(() => {
    if (chatIdx >= CHAT_PREVIEW.length) return
    const t = setTimeout(() => setChatIdx(i => i + 1), chatIdx === 0 ? 800 : 1200)
    return () => clearTimeout(t)
  }, [chatIdx])

  if (user) return null

  const handleGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/chat` }
    })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-60px', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-80px', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,183,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.1) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      </div>

      {/* Navbar */}
      <div style={{ position: 'relative', zIndex: 10, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px' }}>
            Lamar<span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Cerdas</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/blog')} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px' }}>
            Blog
          </button>
          <button onClick={handleGoogle} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '6px 16px', cursor: 'pointer' }}>
            Masuk
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative', zIndex: 5,
        padding: '40px 22px 28px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 20, padding: '4px 12px', marginBottom: 18 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', display: 'inline-block', boxShadow: '0 0 6px #25D366' }} />
          <span style={{ color: '#25D366', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.3px' }}>AI Career Coach #1 Indonesia</span>
        </div>

        {/* Headline */}
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.5px' }}>
          Curhat Karir?<br />
          <span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diah Anna Siap!</span>
        </h1>

        {/* Sub hook */}
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: 24 }}>
          AI Career Coach yang jawab kayak teman — bukan robot.<br />
          Review CV, latihan interview, negosiasi gaji. Semua gratis.
        </p>

        {/* ── CHAT PREVIEW ── */}
        <div style={{ background: '#111b13', borderRadius: 16, overflow: 'hidden', marginBottom: 24, border: '1px solid rgba(37,211,102,0.15)' }}>
          {/* Chat header */}
          <div style={{ background: '#1a2e1e', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(37,211,102,0.4)' }}/>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>Diah Anna</div>
              <div style={{ color: '#25D366', fontSize: '0.68rem', fontWeight: 500 }}>● Online sekarang</div>
            </div>
          </div>
          {/* Chat messages */}
          <div style={{ padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140 }}>
            {CHAT_PREVIEW.slice(0, chatIdx).map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  background: msg.role === 'user' ? '#005c4b' : '#1f2f22',
                  borderRadius: msg.role === 'user' ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                  padding: '8px 11px',
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {/* Typing indicator */}
            {chatIdx < CHAT_PREVIEW.length && CHAT_PREVIEW[chatIdx].role === 'diah' && (
              <div style={{ display: 'flex', gap: 4, padding: '6px 10px', background: '#1f2f22', borderRadius: '3px 12px 12px 12px', width: 'fit-content' }}>
                {[0,1,2].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', opacity: 0.7, animation: `bounce 1s ease ${d * 0.15}s infinite` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex' }}>
            {['🧑','👩','👨','🧑','👩'].map((e, i) => (
              <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: `hsl(${i*40+120},50%,38%)`, border: '2px solid #0a0f0d', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{e}</div>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
            <span style={{ color: '#fff', fontWeight: 700 }}>2.400+</span> job seeker sudah pakai
          </span>
        </div>

        {/* CTA */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: '100%', maxWidth: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: loading ? '#1a2a1f' : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          color: '#fff', fontWeight: 700, fontSize: '1rem',
          padding: '15px 20px', borderRadius: 14, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 24px rgba(37,211,102,0.35)',
          transition: 'all 0.2s',
        }}>
          {!loading && <GoogleIcon />}
          {loading ? 'Mengarahkan...' : 'Ngobrol Gratis dengan Diah Anna'}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', marginTop: 8, textAlign: 'center', maxWidth: 400 }}>
          Tidak perlu kartu kredit · Langsung aktif · Gratis selamanya
        </p>
      </div>

      {/* ── FITUR ── */}
      <div style={{ position: 'relative', zIndex: 5, padding: '0 16px 8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>Semua yang kamu butuh</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '📄', color: '#34B7F1', bg: 'rgba(52,183,241,0.07)', border: 'rgba(52,183,241,0.15)',
              title: 'CV Review Instan', hook: 'Feedback jujur dalam 30 detik',
              desc: 'Bukan pujian kosong. AI kasih tahu bagian mana lemah, apa yang harus diganti sekarang juga.' },
            { icon: '🎤', color: '#FFB74D', bg: 'rgba(255,183,77,0.07)', border: 'rgba(255,183,77,0.15)',
              title: 'Mock Interview', hook: 'Latihan tanpa malu, pede pas yang asli',
              desc: 'Pertanyaan HRD nyata + feedback langsung. Latihan sampai tidak grogi lagi.' },
            { icon: '🧠', color: '#25D366', bg: 'rgba(37,211,102,0.07)', border: 'rgba(37,211,102,0.15)',
              title: 'Diah Anna Career Coach', hook: 'Teman karir 24/7 — kapan saja, gratis',
              desc: 'Mau pindah kerja? Bingung negosiasi gaji? Diah Anna siap dengerin dan bantu carikan jalan.' },
            { icon: '✨', color: '#F48FB1', bg: 'rgba(244,143,177,0.07)', border: 'rgba(244,143,177,0.15)',
              title: 'CV Maker AI', hook: 'CV profesional dari nol dalam 2 menit',
              desc: 'Format ATS, JobStreet, LinkedIn — tinggal ceritakan pengalamanmu, AI yang nulis.' },
          ].map((f, i) => (
            <div key={f.title} style={{
              background: f.bg, border: `1px solid ${f.border}`, borderRadius: 16, padding: '15px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(12px)',
              transition: `opacity 0.5s ease ${0.1 + i * 0.07}s, transform 0.5s ease ${0.1 + i * 0.07}s`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.87rem', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ color: f.color, fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}>{f.hook}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.76rem', lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONI ── */}
      <div style={{ position: 'relative', zIndex: 5, padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>Kata mereka</p>

        {[
          { stars: 5, text: 'ATS score CV aku cuma 48. Diah Anna tunjukin persis bagian mana yang salah. Seminggu kemudian dapet 3 panggilan interview.', name: 'Rizky A.', detail: 'Diterima sebagai Data Analyst · marketplace terkemuka Indonesia' },
          { stars: 5, text: 'Awalnya skeptis, tapi mock interview sama Diah Anna beneran bikin aku lebih siap. Pertanyaan-nya mirip banget sama yang ditanya HRD asli.', name: 'Sinta W.', detail: 'Fresh grad, diterima di perusahaan FMCG multinasional' },
          { stars: 5, text: 'Bingung mau switch karir dari marketing ke product. Diah Anna bantu aku bikin roadmap yang masuk akal dan realistis.', name: 'Bagas P.', detail: 'Career switch · Kini Product Manager di startup Series B' },
        ].map((t, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
              {Array(t.stars).fill(0).map((_, s) => <span key={s} style={{ color: '#FFB74D', fontSize: '0.8rem' }}>★</span>)}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.81rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10 }}>"{t.text}"</p>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.76rem' }}>{t.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>{t.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ position: 'relative', zIndex: 5, padding: '12px 16px 52px' }}>
        <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>💙</div>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.3px', marginBottom: 6 }}>
            Diah Anna udah nunggu kamu
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', marginBottom: 20, lineHeight: 1.5 }}>
            Ribuan job seeker sudah curhat karir sama Diah Anna.<br/>Sekarang giliran kamu.
          </p>
          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#fff', color: '#0a0f0d',
            fontWeight: 800, fontSize: '1rem',
            padding: '15px', borderRadius: 14, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.2px',
          }}>
            {!loading && <GoogleIcon />}
            {loading ? 'Mengarahkan...' : 'Mulai Ngobrol Gratis →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
