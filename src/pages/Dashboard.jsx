import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', platinum: 'Platinum 👑' }

const menuItems = [
  { icon: '📄', title: 'CV Review', desc: 'Feedback spesifik dari AI', href: '/cv-review', color: '#E8F5E9' },
  { icon: '🎯', title: 'ATS Checker', desc: 'Cek ATS score CV kamu', href: '/ats-checker', color: '#E3F2FD', badge: 'Baru' },
  { icon: '🎤', title: 'Mock Interview', desc: 'Latihan interview kerja', href: '/mock-interview', color: '#FFF3E0' },
  { icon: '🧠', title: 'Diah Anna', desc: 'AI Career Coach kamu', href: '/career-coach', color: '#F3E5F5' },
  { icon: '✨', title: 'CV Maker', desc: 'Bikin CV profesional', href: '/cv-maker', color: '#FCE4EC' },
]

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [userPlan, setUserPlan] = useState('free')

  useEffect(() => {
    if (!user) { setChecking(false); return }
    async function loadDashboard() {
      const { data: sub } = await supabase
        .from('subscriptions').select('plan')
        .eq('user_id', user.id).eq('status', 'active')
        .gte('expires_at', new Date().toISOString()).single()
      setUserPlan(sub?.plan || 'free')
      setChecking(false)
    }
    loadDashboard()
  }, [user])

  if (!user) return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar">💼</div>
        <div><div className="wa-header-title">LamarCerdas</div></div>
      </div>
      <div className="wa-empty" style={{ flex: 1 }}>
        <span className="wa-empty-icon">🔒</span>
        <p className="wa-empty-title">Login dulu ya</p>
        <p className="wa-empty-text">Kamu harus masuk dulu untuk akses fitur ini</p>
        <Link to="/login" style={{ display: 'inline-block', padding: '12px 32px', marginTop: '16px', background: 'var(--wa-green)', color: '#fff', borderRadius: '8px', fontWeight: 600 }}>
          Masuk Sekarang
        </Link>
      </div>
    </div>
  )

  if (checking) return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar">💼</div>
        <div><div className="wa-header-title">LamarCerdas</div><div className="wa-header-subtitle">Memuat...</div></div>
      </div>
      <div className="wa-empty" style={{ flex: 1 }}>
        <span className="wa-empty-icon">⏳</span>
        <p className="wa-empty-text">Sedang memuat dashboard kamu...</p>
      </div>
    </div>
  )

  const name = user.user_metadata?.full_name?.split(' ')[0] ||
               user.user_metadata?.name?.split(' ')[0] || 'kamu'

  return (
    <div className="wa-screen">
      {/* Header */}
      <div className="wa-header">
        <div className="wa-header-avatar">
          {user.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : '💼'}
        </div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Hei, {name}! 👋</div>
          <div className="wa-header-subtitle">Mau ngapain hari ini?</div>
        </div>
        <span className="wa-plan-chip" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
          {PLAN_LABEL[userPlan]}
        </span>
      </div>

      {userPlan === 'free' && (
        <div className="wa-alert green" style={{ margin: '8px 12px 0' }}>
          💬 Chat langsung WA dengan AI Coach —{' '}
          <Link to="/pricing" style={{ color: 'var(--wa-green-dark)', fontWeight: 700 }}>Upgrade Sekarang →</Link>
        </div>
      )}

      <div className="wa-section-header">Fitur Tersedia</div>

      {menuItems.map((item) => (
        <Link to={item.href} key={item.title} className="wa-list-item">
          <div className="wa-list-avatar" style={{ background: item.color }}>{item.icon}</div>
          <div className="wa-list-content">
            <div className="wa-list-title">{item.title}</div>
            <div className="wa-list-subtitle">{item.desc}</div>
          </div>
          <div className="wa-list-meta">
            {item.badge && <span className="wa-badge yellow">{item.badge}</span>}
            <span style={{ color: 'var(--wa-gray)', fontSize: '1rem' }}>›</span>
          </div>
        </Link>
      ))}

      <div className="wa-section-header">Akun</div>
      <Link to="/pricing" className="wa-list-item">
        <div className="wa-list-avatar" style={{ background: '#FFF8E1' }}>⭐</div>
        <div className="wa-list-content">
          <div className="wa-list-title">Lihat Paket & Harga</div>
          <div className="wa-list-subtitle">Paket saat ini: {PLAN_LABEL[userPlan]}</div>
        </div>
        <span style={{ color: 'var(--wa-gray)', fontSize: '1rem' }}>›</span>
      </Link>

      <div className="wa-list-item" onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{ cursor: 'pointer' }}>
        <div className="wa-list-avatar" style={{ background: '#FFEBEE' }}>🚪</div>
        <div className="wa-list-content">
          <div className="wa-list-title" style={{ color: 'var(--wa-red)' }}>Keluar</div>
          <div className="wa-list-subtitle">Logout dari akun kamu</div>
        </div>
      </div>

      <div style={{ height: '80px' }} />
    </div>
  )
}
