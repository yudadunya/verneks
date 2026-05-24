import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const WA_LIMITS = { free: 0, starter: 5, pro: 20, platinum: 999 }
const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', platinum: 'Platinum 👑' }

const menuItems = [
  { icon: '📄', title: 'CV Review', desc: 'Feedback spesifik dari AI', href: '/cv-review', color: '#E8F5E9', iconBg: '#4CAF50' },
  { icon: '🎯', title: 'ATS Checker', desc: 'Cek ATS score CV kamu', href: '/ats-checker', color: '#E3F2FD', iconBg: '#2196F3', badge: 'Baru' },
  { icon: '🎤', title: 'Mock Interview', desc: 'Latihan interview kerja', href: '/mock-interview', color: '#FFF3E0', iconBg: '#FF9800' },
  { icon: '🧠', title: 'Diah Anna', desc: 'AI Career Coach kamu', href: '/career-coach', color: '#F3E5F5', iconBg: '#9C27B0' },
  { icon: '✨', title: 'CV Maker', desc: 'Bikin CV profesional', href: '/cv-maker', color: '#FCE4EC', iconBg: '#E91E63' },
]

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [userPlan, setUserPlan] = useState('free')
  const [waUsed, setWaUsed] = useState(0)

  useEffect(() => {
    if (!user) { setChecking(false); return }
    async function loadDashboard() {
      const { data: profile } = await supabase
        .from('user_profiles').select('phone_verified, phone_wa')
        .eq('id', user.id).single()
      if (!profile || !profile.phone_verified) { navigate('/verify-phone'); return }
      const { data: sub } = await supabase
        .from('subscriptions').select('plan')
        .eq('user_id', user.id).eq('status', 'active')
        .gte('expires_at', new Date().toISOString()).single()
      const plan = sub?.plan || 'free'
      setUserPlan(plan)
      if (plan !== 'free' && plan !== 'platinum') {
        const monthYear = new Date().toISOString().slice(0, 7)
        const { data: usage } = await supabase
          .from('wa_usage').select('id')
          .eq('user_id', user.id).eq('month_year', monthYear)
        setWaUsed(usage?.length || 0)
      }
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
        <Link to="/login" style={{ marginTop: '16px' }} className="wa-btn-primary" style={{ display: 'inline-block', padding: '12px 32px', marginTop: '16px', background: 'var(--wa-green)', color: '#fff', borderRadius: '8px', fontWeight: 600 }}>Masuk Sekarang</Link>
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

  const name = user.user_metadata?.full_name?.split(' ')[0] || 'kamu'
  const waLimit = WA_LIMITS[userPlan] || 0
  const waRemaining = Math.max(0, waLimit - waUsed)
  const waPercent = waLimit > 0 ? Math.round((waUsed / waLimit) * 100) : 100

  return (
    <div className="wa-screen">
      {/* WA-style header */}
      <div className="wa-header">
        <div className="wa-header-avatar">💼</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Hei, {name}! 👋</div>
          <div className="wa-header-subtitle">Mau ngapain hari ini?</div>
        </div>
        <span className="wa-plan-chip" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
          {PLAN_LABEL[userPlan]}
        </span>
      </div>

      {/* WA usage section */}
      {userPlan !== 'free' && userPlan !== 'platinum' && (
        <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid var(--wa-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--wa-dark)' }}>💬 Sesi WA Diah Anna</span>
            <span style={{ fontSize: '0.75rem', color: waRemaining <= 2 ? '#ea0038' : 'var(--wa-gray)' }}>
              {waUsed}/{waLimit} terpakai
            </span>
          </div>
          <div className="wa-progress-track">
            <div className="wa-progress-fill" style={{
              width: `${waPercent}%`,
              background: waPercent >= 80 ? '#ea0038' : waPercent >= 50 ? '#f59e0b' : 'var(--wa-green)'
            }} />
          </div>
          {waRemaining <= 2 && waRemaining > 0 && (
            <div className="wa-alert" style={{ margin: '8px 0 0', padding: '6px 10px' }}>
              ⚠️ Sisa {waRemaining} sesi. <Link to="/pricing" style={{ color: 'var(--wa-green-dark)', fontWeight: 700 }}>Upgrade →</Link>
            </div>
          )}
          {waRemaining === 0 && (
            <div className="wa-alert red" style={{ margin: '8px 0 0', padding: '6px 10px' }}>
              🚫 Sesi habis bulan ini. <Link to="/pricing" style={{ color: 'inherit', fontWeight: 700 }}>Upgrade →</Link>
            </div>
          )}
        </div>
      )}

      {userPlan === 'free' && (
        <div className="wa-alert green" style={{ margin: '8px 12px 0' }}>
          💬 Chat langsung WA dengan AI Coach — <Link to="/pricing" style={{ color: 'var(--wa-green-dark)', fontWeight: 700 }}>Upgrade Sekarang →</Link>
        </div>
      )}

      {/* Section label */}
      <div className="wa-section-header">Fitur Tersedia</div>

      {/* Menu list WA style */}
      {menuItems.map((item) => (
        <Link to={item.href} key={item.title} className="wa-list-item">
          <div className="wa-list-avatar" style={{ background: item.color }}>
            {item.icon}
          </div>
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

      <div style={{ height: '80px' }} />
    </div>
  )
}
