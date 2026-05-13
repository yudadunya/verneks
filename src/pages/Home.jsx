import { Link } from 'react-router-dom'

const features = [
  {
    icon: '📄',
    title: 'CV Review AI',
    desc: 'Upload CV kamu, dapat feedback detail dari AI dalam hitungan detik.',
    href: '/cv-review',
    
  },
  {
    icon: '🎯',
    title: 'ATS Score Checker',
    desc: 'Cek seberapa ATS-friendly CV kamu sebelum dikirim ke perusahaan impian.',
    href: '/ats-checker',
    
  },
  {
    icon: '🧠',
    title: 'Career Coach AI',
    desc: 'Ngobrol langsung sama Diah Anna, career coach AI kamu — karir, gaji, sampai resign.',
    href: '/career-coach',
    
  },
  {
    icon: '🎤',
    title: 'Mock Interview AI',
    desc: 'Latihan interview dengan Diah Anna yang kasih feedback jujur, bukan basa-basi.',
    href: '/mock-interview',
    
  },
]

const plans = [
  {
    name: 'Free',
    price: 'Gratis',
    period: '',
    color: '#f3f4f0',
    textColor: 'var(--dark)',
    features: [
      '✅CV Review',
      '✅ATS Score Checker',
      '✅Career Coach AI',
        ],
    cta: 'Mulai Gratis',
    href: '/register',
    popular: false,
  },
  {
    name: 'Starter',
    price: 'Rp 49rb',
    priceOri: 'Rp 99rb',
    period: '/bulan',
    color: 'var(--dark)',
    textColor: '#fff',
    features: [
      '✅CV Review 5x/bulan',
      '✅ATS Score Checker 5x/bulan',
      '✅Career Coach AI 5 sesi/bulan',
          ],
    cta: 'Pilih Starter',
    href: '/pricing',
    popular: false,
  },
  {
    name: 'Pro',
    price: 'Rp 199rb',
    priceOri: 'Rp 599rb',
    period: '/bulan',
    color: 'var(--green)',
    textColor: '#fff',
    features: [
      '✅CV Review 5x/bulan',
      '✅ATS Score Checker 5x/bulan',
      '✅Career Coach AI unlimited',
      '✅Mock Interview unlimited',
    ],
    cta: 'Pilih Pro',
    href: '/pricing',
    popular: true,
  },
]

export default function Home({ user }) {
  return (
    <main>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.badge}>🇮🇩 AI Career Platform #1 Indonesia</div>
          <h1 style={styles.heroTitle}>
            CV Kamu Ditolak Sistem<br />
            <em style={styles.heroItalic}>Tanpa Kamu Tahu?</em> Bahkan Sebelum HRD Buka
          </h1>
          <p style={styles.heroDesc}>
            GRATIS-Cek seberapa ATS-friendly CV kamu sekarang — plus review, mock interview, dan career coach AI.
          </p>
          <div style={styles.heroCta}>
            <Link to={user ? '/dashboard' : '/register'} style={styles.btnPrimary}>
              {user ? 'Buka Dashboard' : 'Mulai Gratis — Tanpa Kartu Kredit'}
            </Link>
            <Link to="/cv-review" style={styles.btnSecondary}>
              Coba Review CV Sekarang →
            </Link>
          </div>
          <p style={styles.heroNote}>✓ Coba Gratis &nbsp; ✓ Terbukti bantu dapat interview &nbsp; ✓ Feedback spesifik, bukan generik</p>
        </div>

        {/* Decorative blob */}
        <div style={styles.blob} aria-hidden="true" />
      </section>

      {/* Features */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Semua yang kamu butuhkan<br />untuk dapat kerja lebih cepat</h2>
          <div style={styles.grid}>
            {features.map((f) => (
              <Link to={f.href} key={f.title} style={styles.card}>
                <div style={styles.cardIcon}>{f.icon}</div>
                <div style={styles.cardTag}>{f.tag}</div>
                <h3 style={styles.cardTitle}>{f.title}</h3>
                <p style={styles.cardDesc}>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ ...styles.section, background: '#f3f4f0' }}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Pilih paket yang cocok</h2>
          <div style={styles.pricingGrid}>
            {plans.map((plan) => (
              <div key={plan.name} style={{ ...styles.planCard, background: plan.color, color: plan.textColor }}>
                {plan.popular && <div style={styles.popularBadge}>⭐ Paling Populer</div>}
                <div style={styles.planName}>{plan.name}</div>
                <div style={styles.planPrice}>
                  <span style={styles.planPriceNum}>{plan.price}</span>
                  {plan.priceOri && (
                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.9rem', marginLeft: '6px' }}>{plan.priceOri}</span>
                  )}
                  <span style={{ opacity: 0.7, fontSize: '0.875rem', marginLeft: '4px' }}>{plan.period}</span>
                </div>
                <ul style={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} style={styles.planFeature}>{f}</li>
                  ))}
                </ul>
                <Link to={plan.href} style={{ ...styles.planCta, background: plan.name === 'Free' ? 'var(--green)' : 'rgba(255,255,255,0.15)', color: plan.name === 'Free' ? '#fff' : plan.textColor, border: plan.name === 'Free' ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <span style={styles.footerLogo}>Lamar<span style={{ color: 'var(--green)' }}>Cerdas</span></span>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
            © 2026 LamarCerdas. Dibuat dengan ❤️ untuk job seeker Indonesia.
          </p>
        </div>
      </footer>
    </main>
  )
}

const styles = {
  hero: {
    position: 'relative',
    padding: '80px 24px 100px',
    textAlign: 'center',
    overflow: 'hidden',
  },
  heroInner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '720px',
    margin: '0 auto',
  },
  badge: {
    display: 'inline-block',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: 'var(--green-dark)',
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: '100px',
    marginBottom: '24px',
    letterSpacing: '0.02em',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    fontWeight: 700,
    lineHeight: 1.1,
    color: 'var(--dark)',
    marginBottom: '20px',
  },
  heroItalic: {
    fontStyle: 'italic',
    color: 'var(--green)',
  },
  heroDesc: {
    fontSize: '1.1rem',
    color: 'var(--gray)',
    lineHeight: 1.7,
    marginBottom: '36px',
    maxWidth: '540px',
    margin: '0 auto 36px',
  },
  heroCta: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  btnPrimary: {
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    padding: '14px 28px',
    borderRadius: '12px',
    display: 'inline-block',
  },
  btnSecondary: {
    color: 'var(--dark)',
    fontWeight: 500,
    fontSize: '0.95rem',
    padding: '14px 20px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    display: 'inline-block',
    background: '#fff',
  },
  heroNote: {
    fontSize: '0.8rem',
    color: 'var(--gray)',
    marginTop: '16px',
  },
  blob: {
    position: 'absolute',
    top: '-200px',
    right: '-200px',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, #dcfce7 0%, transparent 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  section: {
    padding: '80px 24px',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '48px',
    lineHeight: 1.2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '28px',
    transition: 'all 0.2s',
    display: 'block',
    position: 'relative',
  },
  cardIcon: {
    fontSize: '2rem',
    marginBottom: '12px',
  },
  cardTag: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--green-dark)',
    background: '#f0fdf4',
    padding: '3px 8px',
    borderRadius: '100px',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 700,
    marginBottom: '8px',
    color: 'var(--dark)',
  },
  cardDesc: {
    fontSize: '0.9rem',
    color: 'var(--gray)',
    lineHeight: 1.6,
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  planCard: {
    borderRadius: '20px',
    padding: '28px',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fbbf24',
    color: '#1c1917',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: '100px',
    whiteSpace: 'nowrap',
  },
  planName: {
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    opacity: 0.7,
    marginBottom: '12px',
  },
  planPrice: {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  planPriceNum: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: 700,
  },
  planFeatures: {
    listStyle: 'none',
    marginBottom: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  planFeature: {
    fontSize: '0.875rem',
    opacity: 0.9,
    display: 'flex',
    gap: '8px',
  },
  planCta: {
    display: 'block',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '12px',
    borderRadius: '10px',
    transition: 'opacity 0.15s',
  },
  footer: {
    borderTop: '1px solid var(--border)',
    padding: '32px 24px',
  },
  footerLogo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 700,
    display: 'block',
    marginBottom: '8px',
  },
}
