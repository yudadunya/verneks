import { Link, useLocation } from 'react-router-dom'

// isPremium di-pass sebagai prop dari App.jsx
export default function BottomNav({ isPremium = false }) {
  const location = useLocation()

  const tabs = [
    { href: '/dashboard', icon: '🏠', label: 'Home' },
    { href: '/dna',       icon: '🧬', label: 'DNA'  },
    { href: '/chat',      icon: '💬', label: 'Chat' },
    { href: '/journey',   icon: '🗺️', label: 'Journey',  locked: !isPremium },
    { href: '/opportunities', icon: '💼', label: 'Jobs', locked: !isPremium },
    { href: '/profile',   icon: '👤', label: 'Profil' },
  ]

  const handleLockedClick = (e) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('show-upgrade'))
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: '#0e1a12', borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.href
        return (
          <Link
            key={tab.href}
            to={tab.href}
            onClick={tab.locked ? handleLockedClick : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '8px 0', textDecoration: 'none', position: 'relative',
              opacity: tab.locked ? 0.45 : 1,
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: '0.6rem', marginTop: 3, fontWeight: active ? 700 : 400,
              color: active ? '#25D366' : 'rgba(255,255,255,0.45)',
            }}>
              {tab.label}
            </span>
            {tab.locked && (
              <span style={{
                position: 'absolute', top: 5, right: '18%',
                fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)',
              }}>🔒</span>
            )}
            {active && (
              <span style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: 20, height: 2, background: '#25D366', borderRadius: 99,
              }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
