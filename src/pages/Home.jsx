import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function Home({ user }) {
  // Auto-redirect if logged in
  useEffect(() => {
    if (user) window.location.href = '/dashboard'
  }, [user])

  if (user) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-header)', display: 'flex', flexDirection: 'column' }}>
      {/* WA-style header bar */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>LamarCerdas</span>
        <Link to="/login" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>Masuk</Link>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: '16px' }}>💼</div>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>
          Karir kamu lebih<br />cerdas bareng AI
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.6 }}>
          Review CV, cek ATS score, latihan interview,<br />dan chat dengan AI Career Coach — gratis!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
          <Link to="/register">
            <button style={{ width: '100%', background: '#fff', color: 'var(--wa-header)', fontWeight: 700, fontSize: '1rem', padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Mulai Gratis
            </button>
          </Link>
          <Link to="/login">
            <button style={{ width: '100%', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '0.95rem', padding: '13px', borderRadius: '8px', border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              Sudah punya akun? Masuk
            </button>
          </Link>
        </div>
      </div>

      {/* Features in WA chat-list style */}
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 0 80px' }}>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--wa-gray)', fontWeight: 600, padding: '0 16px 16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fitur Unggulan</p>

        {[
          { icon: '📄', color: '#E8F5E9', title: 'CV Review AI', desc: 'Feedback spesifik dari AI dalam hitungan detik' },
          { icon: '🎯', color: '#E3F2FD', title: 'ATS Score Checker', desc: 'Cek ATS-friendly CV sebelum dikirim', badge: 'Baru' },
          { icon: '🎤', color: '#FFF3E0', title: 'Mock Interview', desc: 'Latihan interview dengan pertanyaan HRD nyata' },
          { icon: '🧠', color: '#F3E5F5', title: 'Diah Anna Career Coach', desc: 'Tanya apapun soal karir — 24/7' },
          { icon: '✨', color: '#FCE4EC', title: 'CV Maker', desc: 'Bikin CV profesional format ATS, JobStreet, LinkedIn' },
        ].map(item => (
          <div key={item.title} className="wa-list-item">
            <div className="wa-list-avatar" style={{ background: item.color }}>{item.icon}</div>
            <div className="wa-list-content">
              <div className="wa-list-title">{item.title}</div>
              <div className="wa-list-subtitle">{item.desc}</div>
            </div>
            {item.badge && <span className="wa-badge yellow">{item.badge}</span>}
          </div>
        ))}

        <div style={{ padding: '20px 16px 0' }}>
          <Link to="/register">
            <button style={{ width: '100%', background: 'var(--wa-green)', color: '#fff', fontWeight: 700, fontSize: '1rem', padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Daftar Gratis Sekarang
            </button>
          </Link>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--wa-gray)', marginTop: '12px' }}>
            Tidak perlu kartu kredit · Langsung pakai
          </p>
        </div>
      </div>
    </div>
  )
}
