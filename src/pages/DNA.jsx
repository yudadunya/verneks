import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import BottomNav from '../components/BottomNav'

const GENOME_MAP = [
  { key: 'analytical',   label: 'Analytical',   emoji: '🧠', color: '#34B7F1', desc: 'Kemampuan analisis data & problem solving' },
  { key: 'leadership',   label: 'Leadership',   emoji: '👑', color: '#F48FB1', desc: 'Kemampuan memimpin & mengarahkan tim' },
  { key: 'builder',      label: 'Builder',      emoji: '⚙️', color: '#25D366', desc: 'Kemampuan membangun & mengeksekusi' },
  { key: 'creator',      label: 'Creator',      emoji: '🎨', color: '#FFB74D', desc: 'Kreativitas & inovasi' },
  { key: 'communication',label: 'Communication',emoji: '💬', color: '#CE93D8', desc: 'Kemampuan komunikasi & presentasi' },
  { key: 'risk_taking',  label: 'Risk Taking',  emoji: '🚀', color: '#EF9A9A', desc: 'Keberanian mengambil keputusan' },
]

function getTopStrength(scores) {
  if (!scores) return null
  return GENOME_MAP.reduce((best, g) =>
    (scores[g.key] || 0) > (scores[best.key] || 0) ? g : best
  , GENOME_MAP[0])
}

function getDiahInsight(scores) {
  const top = getTopStrength(scores)
  if (!top) return null
  const insightMap = {
    analytical:    'Otak analitikmu tajam banget! Kamu cocok banget di Data Analyst, Business Intelligence, atau Product Analytics.',
    leadership:    'Leadership-mu kuat. Kamu punya potensi besar sebagai Team Lead, Product Manager, atau bahkan Founder.',
    builder:       'Kamu tipe eksekutor handal. Software Engineer, DevOps, atau Ops Manager adalah arena bermainmu.',
    creator:       'Jiwa kreatormu menonjol! UI/UX Designer, Content Strategist, atau Brand Manager sangat sesuai.',
    communication: 'Kemampuan komunikasimu luar biasa. Sales, Marketing, atau HR Business Partner bisa jadi jalur karirmu.',
    risk_taking:   'Nyalimu besar! Entrepreneur, Venture Capital, atau Business Development sangat cocok untukmu.',
  }
  return { top, insight: insightMap[top.key] }
}

export default function DNA({ user }) {
  const { plan } = useSubscription(user?.id)
  const navigate = useNavigate()
  const [scores, setScores] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    supabase
      .from('user_genome_scores')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { setScores(data); setLoading(false) })
  }, [user?.id])

  const insight = getDiahInsight(scores)
  const hasData = scores && GENOME_MAP.some(g => (scores[g.key] || 0) > 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header">
        <div className="wa-header-title">Career DNA 🧬</div>
        <div className="wa-header-subtitle">Profil genetik karirmu</div>
      </div>

      <div style={{ padding: '16px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--wa-gray)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
            <div>Memuat Career DNA...</div>
          </div>
        )}

        {!loading && !hasData && (
          <div style={{ textAlign: 'center', padding: '40px 16px', background: '#fff', borderRadius: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧬</div>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--wa-dark)' }}>DNA-mu belum terbentuk</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--wa-gray)', marginBottom: '20px', lineHeight: 1.5 }}>
              Ngobrol minimal 3 pesan dengan Diah Anna agar AI bisa membaca pola karir & kepribadianmu.
            </div>
            <button
              onClick={() => navigate('/chat')}
              style={{ background: 'var(--wa-green)', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              💬 Mulai ngobrol dengan Diah Anna
            </button>
          </div>
        )}

        {!loading && hasData && (
          <>
            {insight && (
              <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--wa-green)', marginBottom: '4px' }}>Diah Anna</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--wa-dark)', lineHeight: 1.5 }}>
                    {insight.insight}
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', marginBottom: '16px', color: 'var(--wa-dark)' }}>🧬 Genome Score</div>
              {GENOME_MAP.map(g => {
                const val = scores[g.key] || 0
                return (
                  <div key={g.key} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{g.emoji} {g.label}</span>
                      <span style={{ fontWeight: '700', color: g.color, fontSize: '0.95rem' }}>{val}</span>
                    </div>
                    <div style={{ background: 'var(--wa-gray-light)', borderRadius: '99px', height: '7px', overflow: 'hidden' }}>
                      <div style={{
                        background: g.color, height: '100%', borderRadius: '99px',
                        width: `${val}%`,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--wa-gray)', marginTop: '2px' }}>{g.desc}</div>
                  </div>
                )
              })}
            </div>

            {scores.updated_at && (
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--wa-gray)' }}>
                Terakhir diperbarui: {new Date(scores.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav isPremium={plan === 'premium'} />
    </div>
  )
}
