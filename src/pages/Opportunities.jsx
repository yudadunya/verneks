import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function Opportunities({ user }) {
  const navigate = useNavigate()
  const [isPremium, setIsPremium] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    supabase.from('subscriptions')
      .select('plan').eq('user_id', user.id).eq('status', 'active')
      .gte('expires_at', new Date().toISOString()).limit(1).maybeSingle()
      .then(({ data }) => {
        const premium = !!data?.plan && data.plan !== 'free'
        setIsPremium(premium)
        if (premium) fetchJobs()
      })
  }, [user?.id])

  const fetchJobs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJobs(data.jobs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  // Non-premium gate
  if (isPremium === false) return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center', paddingBottom: 90 }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>💼</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginBottom: 10 }}>Opportunity Matching</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
        Lihat lowongan yang benar-benar cocok<br />dengan DNA karier kamu.<br /><br />Fitur ini tersedia untuk pengguna Premium.
      </div>
      <button onClick={() => window.location.href = '/pricing'} style={{ padding: '13px 32px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
        🚀 Upgrade Premium
      </button>
      <BottomNav isPremium={false} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header">
        <div className="wa-header-title">💼 Opportunity Matching</div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            Diah Anna sedang mencarikan lowongan terbaik untukmu...
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 12, padding: '14px', marginBottom: 16, color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'center' }}>
            {error === 'Profil belum lengkap'
              ? '⚠️ Lengkapi profilmu dulu lewat Discovery ya, biar rekomendasinya akurat!'
              : `Gagal memuat: ${error}`}
            <br />
            <button onClick={fetchJobs} style={{ marginTop: 10, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}>
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: 12 }}>
              {jobs.length} lowongan cocok dengan profil kamu
            </div>
            {jobs.map((job, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '12px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{job.role}</div>
                  <div style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                    {job.match}% Match
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                  {job.company} • {job.salary}
                </div>
                {job.reason && (
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: 10, lineHeight: 1.5 }}>
                    {job.reason}
                  </div>
                )}
                <button onClick={() => navigate('/chat')} style={{ background: 'none', border: 'none', color: '#25D366', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Tanya Diah Anna → 
                </button>
              </div>
            ))}
            <button onClick={fetchJobs} style={{ width: '100%', marginTop: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem' }}>
              🔄 Refresh rekomendasi
            </button>
          </>
        )}
      </div>

      <BottomNav isPremium={isPremium} />
    </div>
  )
}
