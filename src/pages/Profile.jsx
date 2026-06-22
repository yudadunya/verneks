import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
// Subscription/plan sekarang datang dari prop (di-lift ke App.jsx) — lihat komentar di App.jsx.
import BottomNav from '../components/BottomNav'

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

export default function Profile({ user, loading = false, subscription = DEFAULT_SUBSCRIPTION }) {
  const { plan } = subscription
  const navigate = useNavigate()
  const [profile, setProfile]       = useState(null)
  const [growth, setGrowth]         = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [visible, setVisible]       = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: g }]) => {
      setProfile(p)
      setGrowth(g)
      setDataLoading(false)
      setTimeout(() => setVisible(true), 80)
    })
  }, [user?.id])

  const handleLogout = async () => {
    setLogoutLoading(true)
    // Bersihkan semua localStorage milik user ini
    if (user?.id) {
      localStorage.removeItem(`lc_chat_${user.id}`)
      localStorage.removeItem(`lc_coach_${user.id}`)
      localStorage.removeItem(`lc_discovery_greeted_${user.id}`)
      localStorage.removeItem(`onboarded_${user.id}`)
      // Clear sessionStorage greeting flags
      sessionStorage.removeItem(`lc_greeted_${user.id}`)
      sessionStorage.removeItem(`vk_greeted_${user.id}`)
    }
    localStorage.removeItem('lc_discovery_messages')
    localStorage.removeItem('lc_discovery_result')
    await supabase.auth.signOut()

    // Clear SW cache supaya tidak stuck loading setelah logout
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }

    window.location.replace('/')
  }

  const displayName = profile?.nama
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || 'Kamu'

  const firstName   = displayName.split(' ')[0]
  const avatarUrl   = user?.user_metadata?.avatar_url
  const email       = user?.email || '—'
  const readiness   = profile?.career_readiness || growth?.progress_percent || 0
  const target      = profile?.target_posisi || null
  const posisi      = profile?.posisi_saat_ini || null
  const isPremium   = plan === 'premium'

  // Tanggal discovery: ambil dari last_updated profil
  const discoveryDate = profile?.last_updated
    ? new Date(profile.last_updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const fade = (delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', paddingBottom: 90, fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '14px 18px',
      }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>👤 Profil</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: 2 }}>Informasi akun kamu</div>
      </div>

      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>

        {/* ── Avatar + Nama ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,211,102,0.08), rgba(52,183,241,0.05))',
          border: '1px solid rgba(37,211,102,0.15)',
          borderRadius: 20, padding: '24px 20px', marginBottom: 14,
          textAlign: 'center',
          ...fade(0.04),
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px',
            background: 'rgba(37,211,102,0.15)', border: '2px solid rgba(37,211,102,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
              : <span style={{ fontSize: '2rem' }}>👤</span>
            }
          </div>

          {/* Nama */}
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', marginBottom: 4 }}>
            {loading ? '—' : displayName}
          </div>

          {/* Plan badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 14px', borderRadius: 99, marginBottom: 4,
            background: isPremium ? 'rgba(255,183,77,0.12)' : 'rgba(255,255,255,0.06)',
            border: isPremium ? '1px solid rgba(255,183,77,0.3)' : '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '0.75rem' }}>{isPremium ? '⭐' : '🆓'}</span>
            <span style={{ color: isPremium ? '#FFB74D' : 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700 }}>
              {isPremium ? 'Premium' : 'Free'}
            </span>
          </div>
        </div>

        {/* ── Info Akun ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, marginBottom: 12, overflow: 'hidden',
          ...fade(0.10),
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '1px', marginBottom: 2 }}>AKUN</div>
          </div>
          <InfoRow label="Nama" value={loading ? '—' : displayName} icon="👤" />
          <InfoRow label="Email" value={email} icon="📧" last />
        </div>

        {/* ── Info Karier ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, marginBottom: 12, overflow: 'hidden',
          ...fade(0.16),
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '1px', marginBottom: 2 }}>KARIER</div>
          </div>

          <InfoRow label="Target Karier" value={loading ? '—' : (target || 'Belum diisi')} icon="🎯" />
          <InfoRow label="Posisi Saat Ini" value={loading ? '—' : (posisi || 'Belum diisi')} icon="💼" />

          {/* Readiness */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.9rem' }}>📊</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Career Readiness</span>
              </div>
              <span style={{ color: '#25D366', fontWeight: 800, fontSize: '0.95rem' }}>{loading ? '—' : `${readiness}%`}</span>
            </div>
            {!loading && (
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(90deg,#25D366,#34B7F1)',
                  width: `${readiness}%`, height: '100%', borderRadius: 99,
                  transition: 'width 1s ease 0.3s',
                }} />
              </div>
            )}
          </div>

          <InfoRow
            label="Tanggal Discovery"
            value={loading ? '—' : (discoveryDate || 'Belum Discovery')}
            icon="📅"
            last
          />
        </div>

        {/* ── Upgrade CTA (free only) ── */}
        {!isPremium && !loading && (
          <div style={{
            background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.15)',
            borderRadius: 16, padding: '16px', marginBottom: 14,
            ...fade(0.22),
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <img src="/diah-anna.png" alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                <span style={{ color: '#25D366', fontWeight: 700 }}>Diah Anna: </span>
                Upgrade ke Premium untuk roadmap 6 bulan, chat unlimited, dan progress tracking harian.
              </div>
            </div>
            <a
              href="http://lynk.id/yudadunya/r3o5ldq5qkex/checkout"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'linear-gradient(135deg,#25D366,#128C7E)',
                color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                borderRadius: 12, textDecoration: 'none', textAlign: 'center',
                boxShadow: '0 3px 14px rgba(37,211,102,0.35)',
              }}
            >
              🚀 Upgrade Premium — Rp 199rb periode akses 1 bulan (sekali bayar)
            </a>
          </div>
        )}

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          style={{
            width: '100%', padding: '14px',
            background: 'transparent',
            border: '1px solid rgba(239,83,80,0.3)',
            color: 'rgba(239,83,80,0.8)',
            borderRadius: 14, fontWeight: 600, fontSize: '0.9rem',
            cursor: logoutLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            opacity: logoutLoading ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
            ...fade(0.28),
          }}
        >
          {logoutLoading ? 'Keluar...' : '🚪 Logout'}
        </button>

      </div>
      <BottomNav isPremium={isPremium} />
    </div>
  )
}

function InfoRow({ label, icon, value, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
