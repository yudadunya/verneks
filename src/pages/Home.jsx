import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home({ user }) {
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (user) window.location.href = '/chat'
    setTimeout(() => setVisible(true), 80)
  }, [user])

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
    <div style={{ minHeight: '100vh', background: '#0a0f0d', fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif", overflowX: 'hidden' }}>

      {/* Ambient background blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-60px', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-80px', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,183,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.1) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      </div>

      {/* Navbar */}
      <div style={{ position: 'relative', zIndex: 10, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px' }}>
            Lamar<span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Cerdas</span>
          </span>
        </div>
        <button onClick={handleGoogle} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '6px 16px', cursor: 'pointer' }}>
          Masuk
        </button>
      </div>

      {/* Hero */}
      <div style={{
        position: 'relative', zIndex: 5,
        padding: '48px 22px 36px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 20, padding: '4px 12px', marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', display: 'inline-block', boxShadow: '0 0 6px #25D366' }} />
          <span style={{ color: '#25D366', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.3px' }}>AI Career Coach #1 Indonesia</span>
        </div>

        {/* Headline */}
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.5px' }}>
          CV kamu ditolak<br />
          <span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>bukan karena nggak layak.</span>
        </h1>

        {/* Sub hook */}
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: 28 }}>
          80% CV langsung dibuang sistem ATS sebelum HRD baca.<br />
          LamarCerdas bantu kamu lewatin filter itu — dalam hitungan menit.
        </p>

        {/* Social proof mini */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ display: 'flex' }}>
            {['🧑', '👩', '👨', '🧑', '👩'].map((e, i) => (
              <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: `hsl(${i * 40 + 120}, 50%, 40%)`, border: '2px solid #0a0f0d', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{e}</div>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
            <span style={{ color: '#fff', fontWeight: 700 }}>2.400+</span> job seeker sudah pakai
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', maxWidth: 360,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: loading ? '#1a2a1f' : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            padding: '15px 20px', borderRadius: 14, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 24px rgba(37,211,102,0.35)',
            transition: 'all 0.2s',
          }}
        >
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#fff" fillOpacity="0.9" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#fff" fillOpacity="0.7" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#fff" fillOpacity="0.8" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#fff" fillOpacity="0.9" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {loading ? 'Mengarahkan...' : 'Coba Gratis dengan Google'}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', marginTop: 10, textAlign: 'center', maxWidth: 360 }}>
          Tidak perlu kartu kredit · Langsung aktif
        </p>
      </div>

      {/* Divider label */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '8px 0 4px' }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>Semua yang kamu butuh</span>
      </div>

      {/* Feature cards */}
      <div style={{ position: 'relative', zIndex: 5, padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {[
          {
            icon: '🎯',
            color: '#25D366',
            bg: 'rgba(37,211,102,0.07)',
            border: 'rgba(37,211,102,0.15)',
            title: 'ATS Score Checker',
            hook: 'Kenapa CV kamu nggak pernah dibalas',
            desc: 'Sistem ATS menyaring 80% pelamar otomatis. Cek skor CV kamu & tahu persis apa yang harus dibenahi.',
          },
          {
            icon: '📄',
            color: '#34B7F1',
            bg: 'rgba(52,183,241,0.07)',
            border: 'rgba(52,183,241,0.15)',
            title: 'CV Review Instan',
            hook: 'Feedback jujur dalam 30 detik',
            desc: 'Bukan pujian kosong. AI kasih review spesifik — bagian mana lemah, bagian mana kuat, apa yang harus diganti sekarang.',
          },
          {
            icon: '🎤',
            color: '#FFB74D',
            bg: 'rgba(255,183,77,0.07)',
            border: 'rgba(255,183,77,0.15)',
            title: 'Mock Interview',
            hook: 'Latihan tanpa malu, siap pas yang asli',
            desc: 'Pertanyaan HRD nyata, feedback langsung. Latihan sampai percaya diri — bukan grogi.',
          },
          {
            icon: '🧠',
            color: '#CE93D8',
            bg: 'rgba(206,147,216,0.07)',
            border: 'rgba(206,147,216,0.15)',
            title: 'Diah Anna Career Coach',
            hook: 'Curhat karir 24/7, gratis',
            desc: 'Mau pindah kerja? Nggak tahu harus negosiasi gaji berapa? Diah Anna siap bantu — kapan saja.',
          },
          {
            icon: '✨',
            color: '#F48FB1',
            bg: 'rgba(244,143,177,0.07)',
            border: 'rgba(244,143,177,0.15)',
            title: 'CV Maker AI',
            hook: 'CV profesional dari nol dalam 2 menit',
            desc: 'Format ATS, JobStreet, LinkedIn — tinggal isi info, AI yang nulis. Hasil siap kirim.',
          },
        ].map((f, i) => (
          <div
            key={f.title}
            style={{
              background: f.bg,
              border: `1px solid ${f.border}`,
              borderRadius: 16,
              padding: '16px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(12px)',
              transition: `opacity 0.5s ease ${0.1 + i * 0.07}s, transform 0.5s ease ${0.1 + i * 0.07}s`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>{f.title}</span>
                </div>
                <div style={{ color: f.color, fontWeight: 600, fontSize: '0.78rem', marginBottom: 5 }}>{f.hook}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', lineHeight: 1.55 }}>{f.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom testimonial strip */}
      <div style={{ position: 'relative', zIndex: 5, margin: '0 16px 12px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 16, padding: '16px' }}>
        <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
          {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFB74D', fontSize: '0.85rem' }}>★</span>)}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>
          "ATS score CV aku 48. Setelah pakai LamarCerdas naik jadi 87. Seminggu kemudian dapet panggilan dari 3 perusahaan."
        </p>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>— Rizky A., diterima di marketplace besar</span>
      </div>

      {/* Final CTA */}
      <div style={{ position: 'relative', zIndex: 5, padding: '4px 16px 48px' }}>
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            background: '#fff',
            color: '#0a0f0d',
            fontWeight: 800,
            fontSize: '1rem',
            padding: '15px',
            borderRadius: 14,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.2px',
          }}
        >
          {loading ? 'Mengarahkan...' : 'Mulai Gratis Sekarang →'}
        </button>
      </div>

    </div>
  )
}
