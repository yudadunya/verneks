import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function Opportunities({ user }) {
  const navigate = useNavigate()
  const [isPremium, setIsPremium] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').gte('expires_at', new Date().toISOString()).limit(1).maybeSingle()
      .then(({ data }) => setIsPremium(!!data?.plan && data.plan !== 'free'))
  }, [user?.id])

  if (!user) return null

  if (isPremium === false) return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center', paddingBottom: 90 }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>💼</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginBottom: 10 }}>Opportunity Matching</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
        Lihat lowongan yang benar-benar cocok<br />dengan DNA karier kamu.<br /><br />Fitur ini tersedia untuk pengguna Premium.
      </div>
      <button onClick={() => window.location.href = '/pricing'} style={{ padding: '13px 32px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
        🚀 Upgrade Premium
      </button>
      <button onClick={() => window.history.back()} style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer' }}>← Kembali</button>
      <BottomNav isPremium={false} />
    </div>
  )

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
      <BottomNav isPremium={isPremium} />
    </div>
  )
}
