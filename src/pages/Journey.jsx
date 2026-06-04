import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function Journey({ user }) {
  const navigate = useNavigate()
  if (!user) { navigate('/'); return null }

  const journeyItems = [
    { id: 1, title: 'Career Assessment', status: 'completed', icon: '✓', date: '2 Jan 2025' },
    { id: 2, title: 'SQL Basic', status: 'completed', icon: '✓', date: '15 Jan 2025' },
    { id: 3, title: 'SQL Intermediate', status: 'completed', icon: '✓', date: '28 Jan 2025' },
    { id: 4, title: 'Power BI', status: 'pending', icon: '○', date: 'Minggu depan' },
    { id: 5, title: 'Portfolio Project', status: 'pending', icon: '○', date: 'Bulan depan' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header"><div className="wa-header-title">Career Journey</div></div>
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--wa-gray)', fontSize: '0.9rem', marginBottom: '12px' }}>Progress Karirmu (50%)</p>
          <div style={{ background: 'var(--wa-gray-light)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--wa-green)', height: '100%', width: '50%' }} />
          </div>
        </div>
        {journeyItems.map((item, index) => (
          <div key={item.id} style={{ display: 'flex', gap: '12px', marginBottom: '20px', position: 'relative' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: item.status === 'completed' ? 'var(--wa-green)' : '#fff',
              border: `2px solid ${item.status === 'completed' ? 'var(--wa-green)' : 'var(--wa-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.status === 'completed' ? '#fff' : 'var(--wa-gray)', fontWeight: 'bold'
            }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight: '600', color: item.status === 'completed' ? 'var(--wa-dark)' : 'var(--wa-gray)' }}>{item.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--wa-gray)' }}>{item.date}</div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
