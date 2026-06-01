import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: null,
    priceDisplay: 'Gratis',
    period: 'selamanya',
    color: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.12)',
    cta: 'Pakai Gratis',
    ctaStyle: 'ghost',
    popular: false,
    features: [
      { label: 'CV Review', val: '1x' },
      { label: 'Career Coach (Diah Anna)', val: 'Bebas' },
      { label: 'CV Maker AI', val: '1x' },
      { label: 'Mock Interview', val: false },
      { label: 'Priority response', val: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49000,
    priceDisplay: 'Rp 49rb',
    priceOri: 'Rp 99rb',
    period: '/bulan',
    color: 'rgba(52,183,241,0.08)',
    border: 'rgba(52,183,241,0.3)',
    cta: 'Pilih Starter',
    ctaStyle: 'blue',
    popular: false,
    features: [
      { label: 'CV Review', val: '5x/bulan' },
      { label: 'Career Coach (Diah Anna)', val: 'Bebas' },
      { label: 'CV Maker AI', val: '5x/bulan' },
      { label: 'Mock Interview', val: false },
      { label: 'Priority response', val: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199000,
    priceDisplay: 'Rp 199rb',
    priceOri: 'Rp 599rb',
    period: '/bulan',
    color: 'rgba(37,211,102,0.08)',
    border: 'rgba(37,211,102,0.4)',
    cta: 'Pilih Pro — Hemat 67%',
    ctaStyle: 'green',
    popular: true,
    badge: '⭐ PALING POPULER',
    features: [
      { label: 'CV Review', val: '30x/bulan' },
      { label: 'Career Coach (Diah Anna)', val: 'Bebas' },
      { label: 'CV Maker AI', val: '30x/bulan' },
      { label: 'Mock Interview', val: '30x/bulan' },
      { label: 'Priority response', val: true },
    ],
  },
]

const FAQ = [
  { q: 'Bisa cancel kapan saja?', a: 'Bisa. Tidak ada komitmen jangka panjang. Cancel sebelum tanggal perpanjangan dan kamu tidak ditagih lagi.' },
  { q: 'Metode pembayaran apa saja?', a: 'GoPay, OVO, Dana, QRIS, transfer bank (BCA, Mandiri, BNI, BRI), dan kartu kredit/debit via Midtrans.' },
  { q: 'Apakah data CV saya aman?', a: 'Ya. CV dan percakapan kamu tidak disimpan untuk keperluan apapun selain memproses permintaanmu.' },
  { q: 'Bedanya Free dan Pro apa?', a: 'Free cukup untuk coba-coba. Pro untuk yang serius cari kerja — bisa pakai semua fitur termasuk Mock Interview, lebih banyak kuota, dan respon lebih cepat.' },
]

export default function Pricing({ user }) {
  const navigate  = useNavigate()
  const [loading, setLoading]   = useState(null)
  const [openFaq, setOpenFaq]   = useState(null)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 60)
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '')
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [])

  const handlePay = async (plan) => {
    if (plan.id === 'free') return navigate('/chat')
    if (!user) return navigate('/')
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
      window.snap.pay(data.token, {
        onSuccess: () => navigate('/chat?payment=success'),
        onPending: () => navigate('/chat?payment=pending'),
        onError:   () => navigate('/pricing?payment=error'),
        onClose:   () => setLoading(null),
      })
    } catch {
      alert('Gagal memproses pembayaran. Coba lagi ya.')
      setLoading(null)
    }
  }

  const ctaBg = {
    green: 'linear-gradient(135deg, #25D366, #128C7E)',
    blue:  'linear-gradient(135deg, #34B7F1, #1a8fc4)',
    ghost: 'rgba(255,255,255,0.07)',
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0f0d', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-40px', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,183,241,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/chat')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.5rem', cursor: 'pointer', padding: '0 12px 0 0', lineHeight: 1 }}>‹</button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Paket & Harga</span>
      </div>

      <div style={{ position: 'relative', zIndex: 5, padding: '28px 18px 48px',
        opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease' }}>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', display: 'inline-block' }} />
            <span style={{ color: '#25D366', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.3px' }}>Harga spesial launch</span>
          </div>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 8 }}>
            Investasi karir<br/>
            <span style={{ background: 'linear-gradient(90deg, #25D366, #34B7F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>lebih murah dari kopi</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Paket Pro cuma Rp 199rb/bulan —<br/>lebih murah dari 1 sesi career coach konvensional.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {PLANS.map((plan, i) => (
            <div key={plan.id} style={{
              background: plan.color,
              border: `1.5px solid ${plan.border}`,
              borderRadius: 18,
              overflow: 'hidden',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(10px)',
              transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
            }}>
              {/* Popular badge */}
              {plan.badge && (
                <div style={{ background: 'linear-gradient(90deg, #25D366, #128C7E)', color: '#fff', textAlign: 'center', padding: '5px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ padding: '18px' }}>
                {/* Name & price row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: 2 }}>{plan.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>{plan.period}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px', lineHeight: 1 }}>{plan.priceDisplay}</div>
                    {plan.priceOri && (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', textDecoration: 'line-through', marginTop: 2 }}>{plan.priceOri}</div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {plan.features.map((f) => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: f.val ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>
                        {f.val ? '✓' : '–'} {f.label}
                      </span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: f.val === true ? '#25D366' : f.val === false ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                        background: f.val && f.val !== true ? 'rgba(255,255,255,0.06)' : 'transparent',
                        padding: f.val && f.val !== true ? '2px 8px' : '0',
                        borderRadius: 8,
                      }}>
                        {f.val === true ? 'Termasuk' : f.val === false ? 'Tidak termasuk' : f.val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handlePay(plan)}
                  disabled={loading === plan.id}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                    fontWeight: 700, fontSize: '0.9rem',
                    background: ctaBg[plan.ctaStyle],
                    color: plan.ctaStyle === 'ghost' ? 'rgba(255,255,255,0.6)' : '#fff',
                    cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                    opacity: loading === plan.id ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                    boxShadow: plan.ctaStyle === 'green' ? '0 4px 16px rgba(37,211,102,0.3)' : 'none',
                  }}
                >
                  {loading === plan.id ? 'Memproses...' : plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', marginBottom: 28, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Pembayaran aman via Midtrans</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>GoPay · OVO · Dana · QRIS · Transfer Bank · Kartu Kredit</div>
        </div>

        {/* Comparison callout */}
        <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 14, padding: '16px', marginBottom: 28 }}>
          <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>💡 Bandingin sama career coach konvensional:</div>
          {[
            { label: 'Sesi career coach 1 jam', price: 'Rp 500rb–1jt' },
            { label: 'Review CV profesional', price: 'Rp 150rb–300rb' },
            { label: 'Kursus mock interview', price: 'Rp 300rb–500rb' },
            { label: 'LamarCerdas Pro/bulan', price: 'Rp 199rb', highlight: true },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: item.highlight ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: '0.8rem', fontWeight: item.highlight ? 700 : 400 }}>{item.label}</span>
              <span style={{ color: item.highlight ? '#25D366' : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: item.highlight ? 800 : 400 }}>{item.price}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Pertanyaan umum</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ color: '#fff', fontSize: '0.83rem', fontWeight: 600, flex: 1, paddingRight: 8 }}>{item.q}</span>
                  <span style={{ color: '#25D366', fontSize: '1rem', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 16px 13px', color: 'rgba(255,255,255,0.5)', fontSize: '0.81rem', lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
