import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function DNA({ user }) {
  const navigate = useNavigate()
  if (!user) { navigate('/'); return null }

  const scores = [
    { name: 'Analyst', emoji: '🧠', score: 91, color: '#34B7F1' },
    { name: 'Builder', emoji: '⚙️', score: 82, color: '#25D366' },
    { name: 'Creator', emoji: '🎨', score: 65, color: '#FFB74D' },
    { name: 'Leader', emoji: '👑', score: 42, color: '#F48FB1' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header"><div className="wa-header-title">Career DNA</div></div>
      <div style={{ padding: '16px' }}>
        {scores.map(item => (
          <div key={item.name} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{item.emoji} {item.name}</span>
              <span style={{ fontWeight: '700', color: item.color }}>{item.score}</span>
            </div>
            <div style={{ background: 'var(--wa-gray-light)', borderRadius: '8px', height: '8px' }}>
              <div style={{ background: item.color, height: '100%', width: `${item.score}%`, borderRadius: '8px' }} />
            </div>
          </div>
        ))}
        <div style={{ background: 'rgba(37, 211, 102, 0.1)', padding: '12px', borderRadius: '8px', marginTop: '20px' }}>
          <p style={{ fontSize: '0.85rem' }}>💡 <strong>Diah Anna:</strong> Kekuatanmu ada di Analytical Thinking. Kamu cocok jadi Data Analyst atau Product Analyst!</p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
