import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const STAGE_ORDER = [
  'Career Explorer',
  'Career Builder',
  'Career Professional',
  'Career Expert',
  'Career Leader',
]

const STAGE_COLOR = {
  'Career Explorer':     '#34B7F1',
  'Career Builder':      '#25D366',
  'Career Professional': '#FFB74D',
  'Career Expert':       '#F48FB1',
  'Career Leader':       '#CE93D8',
}

const STAGE_DESC = {
  'Career Explorer':     'Masih menjelajahi arah karir yang tepat',
  'Career Builder':      'Sedang membangun skill & pengalaman',
  'Career Professional': 'Sudah establish, scale up karir',
  'Career Expert':       'Spesialis yang diakui di bidangnya',
  'Career Leader':       'Memimpin & punya pengaruh besar',
}

export default function Journey({ user }) {
  const navigate  = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [growth, setGrowth]     = useState(null)
  const [actions, setActions]   = useState([])
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('nama,target_posisi,posisi_saat_ini,sesi_count,topik_dibahas').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_next_actions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('career_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]).then(([{ data: p }, { data: g }, { data: a }, { data: e }]) => {
      setProfile(p)
      setGrowth(g)
      setActions(a || [])
      setEvents(e || [])
      setLoading(false)
    })
  }, [user?.id])

  const hasData = growth?.career_stage

  const currentStageIdx = STAGE_ORDER.indexOf(growth?.career_stage || '')
  const stageColor = STAGE_COLOR[growth?.career_stage] || 'var(--wa-green)'

  const toggleAction = async (id, isDone) => {
    await supabase.from('user_next_actions').update({ is_done: !isDone }).eq('id', id)
    setActions(prev => prev.map(a => a.id === id ? { ...a, is_done: !isDone } : a))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header">
        <div className="wa-header-title">Career Journey 🗺️</div>
        <div className="wa-header-subtitle">Peta perjalanan karirmu</div>
      </div>

      <div style={{ padding: '16px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--wa-gray)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
            <div>Memuat journey...</div>
          </div>
        )}

        {!loading && !hasData && (
          <div style={{ textAlign: 'center', padding: '40px 16px', background: '#fff', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🗺️</div>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--wa-dark)' }}>Journey belum terbentuk</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--wa-gray)', marginBottom: '20px', lineHeight: 1.5 }}>
              Ngobrol minimal 3 pesan dengan Diah Anna agar AI bisa memetakan perjalanan karirmu.
            </div>
            <button
              onClick={() => navigate('/chat')}
              style={{ background: 'var(--wa-green)', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
            >
              💬 Mulai ngobrol
            </button>
          </div>
        )}

        {!loading && hasData && (
          <>
            {/* Progress bar */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
                  🎯 Progress ke Target
                </div>
                <div style={{ fontWeight: '700', color: stageColor, fontSize: '1rem' }}>
                  {growth.progress_percent || 0}%
                </div>
              </div>
              <div style={{ background: 'var(--wa-gray-light)', borderRadius: '99px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  background: `linear-gradient(90deg, ${stageColor}, ${stageColor}aa)`,
                  height: '100%', borderRadius: '99px',
                  width: `${growth.progress_percent || 0}%`,
                  transition: 'width 1s ease'
                }} />
              </div>
              {profile?.target_posisi && (
                <div style={{ fontSize: '0.78rem', color: 'var(--wa-gray)' }}>
                  Menuju: <strong>{profile.target_posisi}</strong>
                </div>
              )}
            </div>

            {/* Career Stage Roadmap */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '16px', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
                🏔️ Career Stage
              </div>
              {STAGE_ORDER.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx
                const isCurrent   = idx === currentStageIdx
                const isNext      = idx === currentStageIdx + 1
                const color       = STAGE_COLOR[stage]
                return (
                  <div key={stage} style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: isCompleted ? color : isCurrent ? color : 'var(--wa-gray-light)',
                      border: `2px solid ${isCurrent ? color : isCompleted ? color : 'var(--wa-border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: '700',
                      color: (isCompleted || isCurrent) ? '#fff' : 'var(--wa-gray)',
                      boxShadow: isCurrent ? `0 0 0 4px ${color}33` : 'none'
                    }}>
                      {isCompleted ? '✓' : isCurrent ? '●' : idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: isCurrent ? '700' : '500',
                        fontSize: '0.88rem',
                        color: isCurrent ? color : isCompleted ? 'var(--wa-dark)' : 'var(--wa-gray)',
                        marginBottom: '2px'
                      }}>
                        {stage}
                        {isCurrent && <span style={{ fontSize: '0.7rem', background: color + '22', color, padding: '1px 8px', borderRadius: '99px', marginLeft: '6px' }}>Kamu di sini</span>}
                        {isNext && <span style={{ fontSize: '0.7rem', background: 'var(--wa-gray-light)', color: 'var(--wa-gray)', padding: '1px 8px', borderRadius: '99px', marginLeft: '6px' }}>Next</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--wa-gray)' }}>{STAGE_DESC[stage]}</div>
                      {isCurrent && growth.current_focus && (
                        <div style={{ fontSize: '0.75rem', color, marginTop: '4px', fontStyle: 'italic' }}>
                          Fokus sekarang: {growth.current_focus}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Next Milestone */}
            {growth.next_milestone && (
              <div style={{ background: `${stageColor}11`, border: `1px solid ${stageColor}44`, borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '0.82rem', color: stageColor, marginBottom: '4px' }}>
                  🎯 Milestone Berikutnya
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--wa-dark)', lineHeight: 1.5 }}>
                  {growth.next_milestone}
                </div>
              </div>
            )}

            {/* Next Actions */}
            {actions.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '12px', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
                  ✅ Aksi yang Disarankan Diah Anna
                </div>
                {actions.map(action => (
                  <div
                    key={action.id}
                    onClick={() => toggleAction(action.id, action.is_done)}
                    style={{
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      padding: '10px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                      background: action.is_done ? 'rgba(37,211,102,0.08)' : 'var(--wa-gray-light)',
                      opacity: action.is_done ? 0.7 : 1
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                      background: action.is_done ? 'var(--wa-green)' : 'transparent',
                      border: `2px solid ${action.is_done ? 'var(--wa-green)' : 'var(--wa-border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.65rem'
                    }}>
                      {action.is_done && '✓'}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '600', fontSize: '0.85rem',
                        color: 'var(--wa-dark)',
                        textDecoration: action.is_done ? 'line-through' : 'none'
                      }}>
                        {action.title}
                      </div>
                      {action.description && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--wa-gray)', marginTop: '2px', lineHeight: 1.4 }}>
                          {action.description}
                        </div>
                      )}
                      {action.estimated_days && !action.is_done && (
                        <div style={{ fontSize: '0.72rem', color: stageColor, marginTop: '3px' }}>
                          ⏱ ~{action.estimated_days} hari
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Topik yang sudah dibahas */}
            {profile?.topik_dibahas?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '10px', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
                  💬 Topik yang Sudah Dibahas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.topik_dibahas.map(t => (
                    <span key={t} style={{
                      background: 'var(--wa-gray-light)', color: 'var(--wa-dark)',
                      padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem'
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Streak */}
            {(growth.streak_days || 0) > 0 && (
              <div style={{ textAlign: 'center', padding: '12px', background: '#fff', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.4rem' }}>🔥</div>
                <div style={{ fontWeight: '700', color: 'var(--wa-dark)' }}>{growth.streak_days} hari</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--wa-gray)' }}>streak aktif belajar</div>
              </div>
            )}

            <button
              onClick={() => navigate('/chat')}
              style={{ width: '100%', background: 'var(--wa-green)', color: '#fff', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              💬 Lanjut ngobrol dengan Diah Anna
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
