import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function Opportunities({ user }) {
  const navigate = useNavigate()
  if (!user) { navigate('/'); return null }

  const jobs = [
    { company: 'Tokopedia', role: 'Junior Data Analyst', match: 95, salary: 'Rp 6-8jt' },
    { company: 'Gojek', role: 'Data Analyst', match: 88, salary: 'Rp 7-9jt' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header"><div className="wa-header-title">Opportunities</div></div>
      <div style={{ padding: '16px' }}>
        {jobs.map((job, i) => (
          <div key={i} style={{ background: '#fff', padding: '14px', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--wa-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: '700' }}>{job.role}</div>
              <div style={{ background: 'var(--wa-green)', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{job.match}% Match</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--wa-gray)' }}>{job.company} • {job.salary}</div>
            <button onClick={() => navigate('/chat')} style={{ marginTop: '10px', color: 'var(--wa-green)', fontSize: '0.8rem', fontWeight: '600' }}>Tanya Diah Anna →</button>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
