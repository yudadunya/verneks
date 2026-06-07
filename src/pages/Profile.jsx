import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import BottomNav from '../components/BottomNav'

const STAGE_COLOR = {
  'Career Explorer':    '#34B7F1',
  'Career Builder':     '#25D366',
  'Career Professional':'#FFB74D',
  'Career Expert':      '#F48FB1',
  'Career Leader':      '#CE93D8',
}

const EMOTION_EMOJI = {
  positif: '😊', semangat: '🔥', bingung: '😕', khawatir: '😟',
  frustasi: '😤', optimis: '💪', lelah: '😔', excited: '🎉',
}

export default function Profile({ user }) {
  const { plan } = useSubscription(user?.id)
  const navigate = useNavigate()
  const [profile, setProfile]     = useState(null)
  const [growth, setGrowth]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: g }]) => {
      setProfile(p)
      setGrowth(g)
      setLoading(false)
    })
  }, [user?.id])

  const handleLogout = async () => {
    setLogoutLoading(true)
    // Bersihkan discovery data supaya fresh saat login berikutnya
    localStorage.removeItem('lc_discovery_messages')
    localStorage.removeItem('lc_discovery_result')
    await supabase.auth.signOut()
    navigate('/')
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
               || user?.user_metadata?.name?.split(' ')[0]
               || 'Kamu'

  const avatarUrl = user?.user_metadata?.avatar_url
  const stageColor = STAGE_COLOR[growth?.career_stage] || 'var(--wa-green)'
  const emotionEmoji = Object.entries(EMOTION_EMOJI).find(([k]) =>
    profile?.emotional_state?.toLowerCase().includes(k)
  )?.[1] || '💙'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header">
        <div className="wa-header-title">Profil Karir</div>
        <div className="wa-header-subtitle">{user?.email}</div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Avatar & nama */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px',
            background: 'var(--wa-green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: '3px solid rgba(37,211,102,0.3)'
          }}>
            {avatarUrl
              ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
              : <span style={{ fontSize: '1.8rem' }}>👤</span>}
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--wa-dark)' }}>
            {profile?.nama || firstName}
          </div>
          {profile?.posisi_saat_ini && (
            <div style={{ fontSize: '0.82rem', color: 'var(--wa-gray)', marginTop: '2px' }}>
              {profile.posisi_saat_ini}
            </div>
          )}
          {growth?.career_stage && (
            <div style={{
              display: 'inline-block', marginTop: '8px',
              background: stageColor + '22', color: stageColor,
              padding: '3px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700'
            }}>
              {growth.career_stage}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--wa-gray)', fontSize: '0.85rem' }}>
            ⏳ Memuat data karir...
          </div>
        )}

        {/* Career Info */}
        {!loading && profile && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontWeight: '700', marginBottom: '12px', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
              🎯 Informasi Karir
            </div>

            {profile.target_posisi && (
              <Row label="Target Posisi" value={profile.target_posisi} />
            )}
            {profile.posisi_saat_ini && (
              <Row label="Posisi Saat Ini" value={profile.posisi_saat_ini} />
            )}
            {profile.emotional_state && (
              <Row label="Kondisi" value={`${emotionEmoji} ${profile.emotional_state}`} />
            )}
            {profile.topik_dibahas?.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--wa-gray)', marginBottom: '4px' }}>Topik Dibahas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {profile.topik_dibahas.map(t => (
                    <span key={t} style={{
                      background: 'rgba(37,211,102,0.1)', color: 'var(--wa-green)',
                      padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '600'
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.summary && (
              <div style={{ marginTop: '8px', padding: '10px', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--wa-dark)', lineHeight: 1.6 }}>
                {profile.summary}
              </div>
            )}
          </div>
        )}

        {/* Career DNA dari career_dna field */}
        {!loading && profile?.career_dna && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontWeight: '700', marginBottom: '12px', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
              🧬 Career DNA
            </div>
            {profile.career_dna.ambisi && <Row label="Ambisi" value={profile.career_dna.ambisi} />}
            {profile.career_dna.nilai_kerja && <Row label="Nilai Kerja" value={profile.career_dna.nilai_kerja} />}
            {profile.career_dna.kekhawatiran_utama && <Row label="Kekhawatiran" value={profile.career_dna.kekhawatiran_utama} />}
            {profile.career_dna.preferensi_industri?.length > 0 && (
              <Row label="Industri Incaran" value={profile.career_dna.preferensi_industri.join(', ')} />
            )}
          </div>
        )}

        {/* Growth State */}
        {!loading && growth && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontWeight: '700', marginBottom: '12px', color: 'var(--wa-dark)', fontSize: '0.9rem' }}>
              📈 Progress Karir
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                <span style={{ color: 'var(--wa-gray)' }}>Progress</span>
                <span style={{ fontWeight: '700', color: stageColor }}>{growth.progress_percent || 0}%</span>
              </div>
              <div style={{ background: 'var(--wa-gray-light)', borderRadius: '99px', height: '7px', overflow: 'hidden' }}>
                <div style={{ background: stageColor, width: `${growth.progress_percent || 0}%`, height: '100%', borderRadius: '99px', transition: 'width 0.8s ease' }} />
              </div>
            </div>
            {growth.current_focus && <Row label="Fokus Sekarang" value={growth.current_focus} />}
            {growth.next_milestone && <Row label="Target Berikutnya" value={growth.next_milestone} />}
            {(growth.streak_days || 0) > 0 && <Row label="Streak Aktif" value={`🔥 ${growth.streak_days} hari`} />}
          </div>
        )}

        {/* CTA jika belum ada profil */}
        {!loading && !profile && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
            <div style={{ fontWeight: '700', marginBottom: '6px' }}>Profil karir belum dibuat</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--wa-gray)', marginBottom: '16px' }}>
              Ngobrol dengan Diah Anna minimal 3 pesan agar profil karirmu terbentuk otomatis.
            </div>
            <button
              onClick={() => navigate('/chat')}
              style={{ background: 'var(--wa-green)', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Mulai Chat
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          style={{
            width: '100%', padding: '13px',
            border: '1px solid var(--wa-red)', color: 'var(--wa-red)',
            background: '#fff', borderRadius: '10px',
            fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          {logoutLoading ? 'Keluar...' : '🚪 Logout'}
        </button>
      </div>
      <BottomNav isPremium={plan === 'premium'} />
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--wa-gray)' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--wa-dark)' }}>{value}</div>
    </div>
  )
}
