import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: 'Gratis',
    priceOri: null,
    period: 'selamanya',
    color: '#fff',
    textColor: 'var(--dark)',
    borderColor: 'var(--border)',
    features: [
      '✅ CV Review 1x',
      '✅ ATS Checker 1x',
      '✅ Diah Anna-AI Career Coach 1x sesi',
      '❌ Mock Interview',
    ],
    cta: 'Pakai Gratis',
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49000,
    priceDisplay: 'Rp 49rb',
    priceOri: 'Rp 99rb',
    period: '/bulan',
    color: 'var(--dark)',
    textColor: '#fff',
    borderColor: 'var(--dark)',
    features: [
      '✅ CV Review 5x/bulan',
      '✅ ATS Checker 5x/bulan',
      '✅ Diah Anna-AI Career Coach 5 sesi/bulan',
      '❌ Mock Interview',
    ],
    cta: 'Pilih Starter',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199000,
    priceDisplay: 'Rp 199rb',
    priceOri: 'Rp 599rb',
    period: '/bulan',
    color: 'var(--green)',
    textColor: '#fff',
    borderColor: 'var(--green)',
    features: [
      '✅ CV Review 5x/bulan',
      '✅ ATS Checker 5x/bulan',
      '✅ Diah Anna-AI Career Coach unlimited',
      '✅ Mock Interview unlimited',
    ],
    cta: 'Pilih Pro',
    popular: true,
  },
]

export default function Pricing({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    // Load Midtrans Snap script
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
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.id,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || '',
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Open Midtrans Snap
      window.snap.pay(data.token, {
        onSuccess: () => navigate('/dashboard?payment=success'),
        onPending: () => navigate('/dashboard?payment=pending'),
        onError: () => navigate('/pricing?payment=error'),
        onClose: () => setLoading(null),
      })
    } catch (e) {
      alert('Gagal memproses pembayaran. Coba lagi ya.')
    }
    setLoading(null)
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Pilih Paket Kamu</h1>
          <p style={styles.sub}>Mulai gratis, upgrade kapan aja. Tidak ada kontrak jangka panjang.</p>
        </div>

        <div style={styles.grid}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                ...styles.card,
                background: plan.color,
                color: plan.textColor,
                border: `2px solid ${plan.borderColor}`,
              }}
            >
              {plan.popular && (
                <div style={styles.popularBadge}>⭐ Paling Populer</div>
              )}

              <div style={styles.planName}>{plan.name}</div>

              <div style={styles.priceRow}>
                <span style={styles.price}>{plan.priceDisplay}</span>
                {plan.priceOri && (
                  <span style={styles.priceOri}>{plan.priceOri}</span>
                )}
              </div>
              <div style={{ ...styles.period, opacity: 0.7 }}>{plan.period}</div>

              <ul style={styles.features}>
                {plan.features.map((f) => (
                  <li key={f} style={styles.feature}>{f}</li>
                ))}
              </ul>

              <button
                onClick={() => handlePay(plan)}
                disabled={loading === plan.id}
                style={{
                  ...styles.cta,
                  background: plan.id === 'free' ? 'var(--green)' : 'rgba(255,255,255,0.2)',
                  color: plan.id === 'free' ? '#fff' : plan.textColor,
                  border: plan.id === 'free' ? 'none' : '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {loading === plan.id ? 'Memproses...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p style={styles.note}>
          🔒 Pembayaran aman via Midtrans · Transfer bank, GoPay, OVO, Dana, Kartu Kredit
        </p>
      </div>
    </main>
  )
}

const styles = {
  page: { padding: '60px 24px', minHeight: 'calc(100vh - 64px)' },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '48px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '12px' },
  sub: { color: 'var(--gray)', fontSize: '1rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    borderRadius: '20px',
    padding: '32px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  popularBadge: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fbbf24',
    color: '#1c1917',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 16px',
    borderRadius: '100px',
    whiteSpace: 'nowrap',
  },
  planName: {
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    opacity: 0.7,
    marginBottom: '16px',
  },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: '8px' },
  price: { fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700 },
  priceOri: {
    fontSize: '1rem',
    textDecoration: 'line-through',
    opacity: 0.5,
  },
  period: { fontSize: '0.875rem', marginBottom: '24px' },
  features: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '28px',
    flex: 1,
  },
  feature: { fontSize: '0.875rem', opacity: 0.9 },
  cta: {
    display: 'block',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '0.95rem',
    padding: '13px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  note: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: 'var(--gray)',
  },
}
