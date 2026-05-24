import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const plans = [
  { id: 'free', name: 'Free', priceDisplay: 'Gratis', priceOri: null, period: 'selamanya', emoji: '🆓', bg: '#fff', features: ['CV Review 1x/bulan', 'ATS Checker 1x/bulan', 'Web Career Coach 1x/bulan', 'Mock Interview ❌', 'WA Career Coach ❌'], cta: 'Pakai Gratis', popular: false },
  { id: 'starter', name: 'Starter', priceDisplay: 'Rp 49rb', priceOri: 'Rp 99rb', period: '/bulan', emoji: '🚀', bg: '#F3F4F6', features: ['CV Review 5x/bulan', 'ATS Checker 5x/bulan', 'Web Career Coach 5x/bulan', 'Mock Interview ❌', 'WA Career Coach 5x/bulan'], cta: 'Pilih Starter', popular: false },
  { id: 'pro', name: 'Pro', priceDisplay: 'Rp 199rb', priceOri: 'Rp 599rb', period: '/bulan', emoji: '⭐', bg: '#E8F5E9', features: ['CV Review 20x/bulan', 'ATS Checker 20x/bulan', 'Web Career Coach 20x/bulan', 'Mock Interview 20x/bulan', 'WA Career Coach 20x/bulan'], cta: 'Pilih Pro', popular: true },
  { id: 'platinum', name: 'Platinum', priceDisplay: 'Rp 399rb', priceOri: 'Rp 999rb', period: '/bulan', emoji: '👑', bg: '#FFF8E1', features: ['CV Review UNLIMITED', 'ATS Checker UNLIMITED', 'Web Career Coach UNLIMITED', 'Mock Interview UNLIMITED', 'WA Career Coach UNLIMITED', 'Priority response', 'Early access fitur baru'], cta: 'Pilih Platinum', popular: false },
]

export default function Pricing({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY)
    document.head.appendChild(script)
    return () => document.head.removeChild(script)
  }, [])

  const handlePay = async (plan) => {
    if (plan.id === 'free') return navigate('/register')
    if (!user) return navigate('/register')
    setLoading(plan.id)
    try {
      const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan.id, userId: user.id, userEmail: user.email, userName: user.user_metadata?.full_name || '' }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.snap.pay(data.token, {
        onSuccess: () => navigate('/dashboard?payment=success'),
        onPending: () => navigate('/dashboard?payment=pending'),
        onError: () => navigate('/pricing?payment=error'),
        onClose: () => setLoading(null),
      })
    } catch { alert('Gagal memproses pembayaran. Coba lagi ya.'); setLoading(null) }
  }

  return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar">⭐</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">Paket & Harga</div>
          <div className="wa-header-subtitle">Pilih paket yang sesuai</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="wa-alert green">
          🔒 Pembayaran aman via Midtrans · Transfer bank, GoPay, OVO, Dana, Kartu Kredit
        </div>

        {plans.map(plan => (
          <div key={plan.id}>
            <div style={{ background: plan.bg, margin: '8px 12px', borderRadius: '12px', border: `1.5px solid ${plan.popular ? 'var(--wa-green)' : 'var(--wa-border)'}`, overflow: 'hidden', position: 'relative' }}>
              {plan.popular && (
                <div style={{ background: 'var(--wa-green)', color: '#fff', textAlign: 'center', padding: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                  ⭐ PALING POPULER
                </div>
              )}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{plan.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{plan.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--wa-dark)' }}>{plan.priceDisplay}</span>
                      {plan.priceOri && <span style={{ fontSize: '0.8rem', color: 'var(--wa-gray)', textDecoration: 'line-through' }}>{plan.priceOri}</span>}
                      <span style={{ fontSize: '0.78rem', color: 'var(--wa-gray)' }}>{plan.period}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.84rem', color: f.includes('❌') ? 'var(--wa-gray)' : 'var(--wa-dark)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span style={{ fontSize: '0.9rem' }}>{f.includes('❌') ? '❌' : '✅'}</span>
                      <span>{f.replace('❌', '').replace('✅', '').trim()}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handlePay(plan)}
                  disabled={loading === plan.id}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                    background: plan.popular ? 'var(--wa-green)' : plan.id === 'platinum' ? '#d97706' : 'var(--wa-dark)',
                    color: '#fff'
                  }}
                >
                  {loading === plan.id ? 'Memproses...' : plan.cta}
                </button>
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: '80px' }} />
      </div>
    </div>
  )
}
