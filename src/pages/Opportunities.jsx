import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import { getSummary as getLocalSummary, getTopRsiPatterns as getLocalTopRsiPatterns } from '../lib/localMemory'

const CACHE_KEY = 'lc_activity_matches'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 jam dalam ms

function loadCache(userId) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${userId}`)
    if (!raw) return null
    const { activities, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return activities
  } catch { return null }
}

function saveCache(userId, activities) {
  try {
    sessionStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({ activities, ts: Date.now() }))
  } catch {}
}

function clearCache(userId) {
  try { sessionStorage.removeItem(`${CACHE_KEY}_${userId}`) } catch {}
}

export default function Opportunities({ user, loading = false }) {
  const navigate = useNavigate()
  const [isPremium,     setIsPremium]     = useState(null)
  const [activities,    setActivities]    = useState([])
  const [dataLoading,   setDataLoading]   = useState(false)
  const [error,         setError]         = useState(null)
  const [needsMoreChat, setNeedsMoreChat] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/'); return }

    supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const premium = !!data?.plan && data.plan !== 'free'
        setIsPremium(premium)
        if (!premium) return

        const cached = loadCache(user.id)
        if (cached) { setActivities(cached); return }

        fetchActivities()
      })
  }, [user?.id])

  const fetchActivities = async (forceRefresh = false) => {
    if (forceRefresh) clearCache(user.id)
    setDataLoading(true)
    setError(null)
    setNeedsMoreChat(false)
    try {
      const [summary, rsiPatterns] = await Promise.all([
        getLocalSummary(), getLocalTopRsiPatterns(8),
      ])

      const res = await fetch('/api/utils?action=job-match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, localMemory: { summary, rsiPatterns } }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'Belum cukup ngobrol') { setNeedsMoreChat(true); return }
        throw new Error(data.error)
      }

      // API masih return field dengan nama lama (role, company, salary) —
      // map ke nama yang lebih deskriptif di sini agar UI konsisten
      const mapped = (data.jobs || []).map(item => ({
        name:     item.role,
        category: item.company,
        duration: item.salary,
        match:    item.match,
        reason:   item.reason,
      }))
      setActivities(mapped)
      saveCache(user.id, mapped)
    } catch (e) {
      setError(e.message)
    } finally {
      setDataLoading(false)
    }
  }

  if (!user) return null

  // ── Non-premium gate ──────────────────────────────────────────────────────
  if (isPremium === false) return (
    <div style={{
      minHeight: '100vh', background: '#14101B',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', textAlign: 'center', paddingBottom: 90,
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌿</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginBottom: 10 }}>
        Rekomendasi Self-Care
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
        Lihat aktivitas self-care yang benar-benar cocok<br />dengan pola diri kamu.<br /><br />
        Fitur ini tersedia untuk pengguna Premium.
      </div>
      <button
        onClick={() => window.location.href = '/pricing'}
        style={{ padding: '13px 32px', background: 'linear-gradient(135deg,#8B5CF6,#FB7185)', color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}
      >
        🚀 Upgrade Premium
      </button>
      <button
        onClick={() => window.history.back()}
        style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer' }}
      >
        ← Kembali
      </button>
      <BottomNav isPremium={false} />
    </div>
  )

  if (isPremium === null) return null

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#14101B', paddingBottom: '80px' }}>
      <div style={{
        padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(20,16,27,0.92)', backdropFilter: 'blur(14px)',
      }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>🌿 Rekomendasi Self-Care</div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Loading */}
        {dataLoading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              Diah Anna sedang nyariin<br />aktivitas terbaik buat kamu...
            </div>
          </div>
        )}

        {/* Belum cukup ngobrol */}
        {!dataLoading && needsMoreChat && (
          <div style={{
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)',
            borderRadius: 14, padding: '20px 18px', marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>💬</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem', marginBottom: 8 }}>
              Diah Anna belum cukup kenal kamu
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 18 }}>
              Ngobrol dulu beberapa kali ya, biar rekomendasinya beneran nyambung sama apa yang kamu rasain — bukan saran generik.
            </div>
            <button
              onClick={() => navigate('/chat')}
              style={{ padding: '11px 26px', background: 'linear-gradient(135deg,#8B5CF6,#FB7185)', color: '#fff', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Cerita ke Diah Anna →
            </button>
          </div>
        )}

        {/* Error */}
        {!dataLoading && !needsMoreChat && error && (
          <div style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)', borderRadius: 12, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚠️</div>
            <div style={{ color: '#EF9A9A', fontSize: '0.85rem', marginBottom: 12 }}>
              Gagal memuat: {error}
            </div>
            <button
              onClick={() => fetchActivities(true)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Daftar aktivitas */}
        {!dataLoading && !needsMoreChat && !error && activities.length > 0 && (
          <>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: 12 }}>
              {activities.length} aktivitas cocok dengan pola kamu
            </div>

            {activities.map((activity, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', flex: 1, marginRight: 8 }}>
                    {activity.name}
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg,#8B5CF6,#FB7185)',
                    color: '#fff', padding: '3px 10px',
                    borderRadius: '10px', fontSize: '0.7rem',
                    fontWeight: 700, flexShrink: 0,
                  }}>
                    {activity.match}% Cocok
                  </div>
                </div>

                {/* Label kategori & durasi */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(196,181,253,0.12)', color: '#C4B5FD',
                    fontSize: '0.7rem', fontWeight: 600,
                    padding: '2px 8px', borderRadius: 6,
                  }}>
                    {activity.category}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)',
                    fontSize: '0.7rem', fontWeight: 500,
                    padding: '2px 8px', borderRadius: 6,
                  }}>
                    ⏱ {activity.duration}
                  </span>
                </div>

                {activity.reason && (
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.55 }}>
                    {activity.reason}
                  </div>
                )}

                <button
                  onClick={() => navigate('/chat')}
                  style={{ background: 'none', border: 'none', color: '#C4B5FD', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Tanya Diah Anna →
                </button>
              </div>
            ))}

            <button
              onClick={() => fetchActivities(true)}
              style={{ width: '100%', marginTop: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
            >
              🔄 Refresh rekomendasi
            </button>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', marginTop: 8 }}>
              Diperbarui otomatis setiap 6 jam
            </div>
          </>
        )}
      </div>

      <BottomNav isPremium={isPremium} />
    </div>
  )
}
