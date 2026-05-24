import { Link, useLocation } from 'react-router-dom'

const tabs = [
  { href: '/dashboard', icon: '🏠', label: 'Home' },
  { href: '/cv-review', icon: '📄', label: 'CV Review' },
  { href: '/career-coach', icon: '🧠', label: 'Coach' },
  { href: '/mock-interview', icon: '🎤', label: 'Interview' },
  { href: '/pricing', icon: '⭐', label: 'Paket' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="wa-bottom-nav">
      {tabs.map(tab => {
        const active = location.pathname === tab.href
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
