import { Link, useLocation } from 'react-router-dom'

const tabs = [
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/journey', icon: '🗺️', label: 'Journey' },
  { href: '/dna', icon: '🧬', label: 'DNA' },
  { href: '/opportunities', icon: '💼', label: 'Jobs' },
  { href: '/profile', icon: '👤', label: 'Profile' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="wa-bottom-nav">
      {tabs.map(tab => {
        const active = location.pathname === tab.href || 
                       (tab.href === '/chat' && location.pathname === '/dashboard')
        return (
          <Link key={tab.href} to={tab.href} className={`wa-tab ${active ? 'active' : ''}`}>
            <span className="wa-tab-icon">{tab.icon}</span>
            <span className="wa-tab-label">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
