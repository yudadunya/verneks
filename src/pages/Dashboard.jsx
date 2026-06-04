import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A' },
]

const STAGE_COLOR = {
  'Career Explorer': '#34B7F1', 'Career Builder': '#25D366',
  'Career Professional': '#FFB74D', 'Career Expert': '#F48FB1', 'Career Leader': '#CE93D8',
}

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [genome, setGenome]     = useState(null)
  const [growth, setGrowth]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: g }, { data: gw }]) => {
      setProfile(p); setGenome(g); setGrowth(gw); setLoading(false)
    })
  }, [user?.id])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
               || user?.user_metadata?.name?.split(' ')[0] || 'Kamu'
  const stageColor = STAGE_COLOR[growth?.career_stage] || '#25D366'
  const hasGenome  = genome && GENOME_MAP.some(g => (genome[g.key] || 0) > 0)
  const topGenome  = hasGenome
    ? GENOME_MAP.reduce((b, g) => (genome[g.key] || 0) > (genome[b.key] || 0) ? g : b, GENOME_MAP[0])
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header">
        <div className="wa-header-title">Dashboard</div>
        <div className="wa-header-subtitle">LamarCerdas Career GPS</div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>

        {/* Greeting Card */}
        <div style={{
          background: 'linear-gradient(135deg, #075E54, #128C7E)',
          borderRadius: 16, padding: '18px', marginBottom: 14,
          boxShadow: '0 4px 16px rgba(7,94,84,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)' }}>
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '👤'}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Halo, {firstName}! 👋</div>
              {growth?.career_stage && (
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, marginTop: 3 }}>
                  {growth.career_stage}
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          {growth && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', marginBottom: 5 }}>
                <span>Career Readiness</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{growth.progress_percent || 0}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ background: '#fff', width: `${growth.progress_percent || 0}%`, height: '100%', borderRadius: 99, transition: 'width 1s ease' }} />
              </div>
              {growth.next_milestone && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', marginTop: 5 }}>
                  Next: {growth.next_milestone}
                </div>
              )}
            </div>
          )}

          {!loading && !growth && (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
              Ngobrol dengan Diah Anna untuk mulai tracking progress karir! 🚀
            </div>
          )}
        </div>

        {/* Top Strength + Target */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px' }}>
              <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 4 }}>Kekuatan Utama</div>
              {topGenome
                ? <div style={{ fontSize: '1.1rem' }}>{topGenome.emoji} <span style={{ fontWeight: 700, color: topGenome.color }}>{topGenome.label}</span></div>
                : <div style={{ color: '#ccc', fontSize: '0.82rem' }}>Belum terdeteksi</div>}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px' }}>
              <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 4 }}>Target Posisi</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', lineHeight: 1.3 }}>
                {profile?.target_posisi || <span style={{ color: '#ccc' }}>Belum diset</span>}
              </div>
            </div>
          </div>
        )}

        {/* Genome Scores */}
        {!loading && hasGenome && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>🧬 Career Genome</div>
            {GENOME_MAP.map(g => {
              const val = genome[g.key] || 0
              if (val === 0) return null
              return (
                <div key={g.key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                    <span>{g.emoji} {g.label}</span>
                    <span style={{ color: g.color, fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                    <div style={{ background: g.color, width: `${val}%`, height: '100%', borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Current Focus */}
        {!loading && growth?.current_focus && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
            <div style={{ color: '#999', fontSize: '0.72rem', marginBottom: 4 }}>🎯 Fokus Saat Ini</div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111' }}>{growth.current_focus}</div>
          </div>
        )}

        {/* No data CTA */}
        {!loading && !hasGenome && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '18px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🧬</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Career Genome belum terbentuk</div>
            <div style={{ color: '#888', fontSize: '0.82rem', marginBottom: 14, lineHeight: 1.5 }}>
              Ngobrol minimal 3 pesan dengan Diah Anna agar AI bisa memetakan DNA karir kamu.
            </div>
            <button onClick={() => navigate('/chat')}
              style={{ background: 'var(--wa-green)', color: '#fff', padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              💬 Chat dengan Diah Anna
            </button>
          </div>
        )}

        {/* Chat CTA */}
        <button onClick={() => navigate('/chat')}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff', fontWeight: 700, fontSize: '0.95rem',
            borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
            marginBottom: 10,
          }}>
          <img src="/diah-anna.png" alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
          Chat dengan Diah Anna
        </button>

      </div>
      <BottomNav />
    </div>
  )
}
