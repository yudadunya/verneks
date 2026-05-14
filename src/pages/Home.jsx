import { Link } from 'react-router-dom'

const features = [
  {
    icon: '📄',
    title: 'CV Review',
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
    icon: '🎤',
    title: 'Mock Interview',
    desc: 'Simulasi interview kerja dengan pertanyaan nyata dari HRD',
    href: '/mock-interview',
  },
  {
    icon: '🧠',
    title: 'Career Coach',
    desc: 'Tanya apapun soal karir — gaji, CV, strategi melamar',
    href: '/career-coach',
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
      '✅Career Coach',
    ],
    cta: 'Mulai Gratis',
    href: '/register',
    popular: false,
  },
  {
    name: 'Starter',
    price: '49rb',
    priceOri: '99rb',
    period: '/bulan',
    color: 'var(--dark)',
    textColor: '#fff',
    features: [
      '✅CV Review 5x/bulan',
      '✅ATS Score Checker 5x/bulan',
      '✅Career Coach 5 sesi/bulan',
    ],
    cta: 'Pilih Starter',
    href: '/pricing',
    popular: false,
  },
  {
    name: 'Pro',
    price: '199rb',
    priceOri: '599rb',
    period: '/bulan',
    color: 'var(--green)',
    textColor: '#fff',
    features: [
      '✅CV Review 5x/bulan',
      '✅ATS Score Checker 5x/bulan',
      '✅Career Coach unlimited',
      '✅Mock Interview unlimited',
    ],
    cta: 'Pilih Pro',
    href: '/pricing',
    popular: true,
  },
]

const testimonials = [
  {
    avatar: '👩🏻',
    quote: 'Selama ini kirim CV ke mana-mana tapi ga ada yang nyangkut. Ternyata CV aku ga lolos ATS sama sekali. Setelah benerin berdasarkan saran LamarCerdas, langsung ada panggilan minggu berikutnya.',
    name: 'Rizky A.',
    detail: 'Teknik Informatika, Universitas Brawijaya',
  },
  {
    avatar: '👩🏽',
    quote: 'Aku tipe yang nervous banget kalau interview. Latihan sama fitur Mock Interview bikin aku jauh lebih siap — pertanyaannya mirip banget sama yang ditanya HRD beneran.',
    name: 'Dinda R.',
    detail: 'Manajemen, Universitas Diponegoro',
  },
  {
    avatar: '👨🏻',
    quote: 'Kukira CV aku udah bagus karena udah minta tolong kakak tingkat. Ternyata masih banyak yang kurang. Feedback dari LamarCerdas lebih detail dan langsung ke poin.',
    name: 'Fajar M.',
    detail: 'Akuntansi, Universitas Padjadjaran',
  },
  {
    avatar: '👩🏼',
    quote: 'Ga nyangka platform lokal bisa sekeren ini. Semua yang aku butuhin ada — dari CV sampai latihan interview. Dan yang paling penting, gratis dulu buat nyobain.',
    name: 'Sari W.',
    detail: 'Ilmu Komunikasi, Universitas Gadjah Mada',
  },
]

const faqs = [
  {
    q: 'Aman ga data CV aku?',
    a: 'CV kamu hanya digunakan untuk proses analisis AI dan tidak disimpan atau dibagikan ke pihak manapun. Setelah sesi selesai, data kamu otomatis terhapus.',
  },
  {
    q: 'Bedanya LamarCerdas sama ChatGPT apa?',
    a: 'ChatGPT bersifat general — tidak tahu konteks pasar kerja Indonesia, format CV lokal, atau pertanyaan interview yang umum dipakai HRD Indonesia. LamarCerdas dibangun khusus untuk job seeker Indonesia, jadi feedbacknya lebih relevan dan langsung bisa dipakai.',
  },
  {
    q: 'AI-nya akurat ga?',
    a: 'Tidak ada AI yang 100% sempurna — tapi feedback LamarCerdas berdasarkan ribuan pola CV dan interview yang berhasil di pasar kerja Indonesia. Anggap sebagai second opinion yang jujur, bukan pengganti intuisi kamu.',
  },
  {
    q: 'Kalau mau cancel subscription gimana?',
    a: 'Bisa cancel kapanpun langsung dari dashboard, tanpa perlu hubungi siapapun. Tidak ada pertanyaan, tidak ada biaya tambahan.',
  },
  {
    q: 'Cocok ga buat yang belum punya pengalaman kerja sama sekali?',
    a: 'Justru LamarCerdas paling berguna untuk fresh grad tanpa pengalaman — karena kami bantu kamu tampilkan potensi dan skill akademis dengan cara yang dilirik HRD, meski belum punya portofolio kerja.',
  },
]

export default function Home({ user }) {
  return (
    <main>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.badge}>AI Career Platform khusus untuk Fresh Grad Indonesia</div>
          <h1 style={styles.heroTitle}>
            CV kamu<br />
            <em style={styles.heroItalic}>ditolak sistem </em>sebelum ke HRD?
          </h1>
          <p style={styles.heroDesc}>
            Platform AI yang sudah bantu Fresh Grad Indonesia dapat panggilan interview — mulai dari CV, ATS, sampai latihan interview.
          </p>
          <div style={styles.heroCta}>
            <Link to={user ? '/dashboard' : '/register'} style={styles.btnPrimary}>
              {user ? 'Buka Dashboard' : 'Coba Gratis Sekarang'}
            </Link>
          </div>
          <p style={styles.heroNote}>✓ Hasil dalam beberapa detik &nbsp; ✓ Terbukti bantu dapat interview &nbsp; ✓ Feedback spesifik, bukan generik</p>
        </div>
        <div style={styles.blob} aria-hidden="true" />
      </section>

      {/* Features */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Dari nol sampai dapat panggilan<br />— semua ada di sini</h2>
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
          <h2 style={styles.sectionTitle}>Investasi terkecil sebelum gaji pertamamu</h2>
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
                <Link
                  to={plan.href}
                  style={{
                    ...styles.planCta,
                    background: plan.name === 'Free' ? 'var(--green)' : 'rgba(255,255,255,0.15)',
                    color: plan.name === 'Free' ? '#fff' : plan.textColor,
                    border: plan.name === 'Free' ? 'none' : '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Fresh Grad Indonesia sudah buktiin sendiri</h2>
          <div style={styles.testimoniGrid}>
            {testimonials.map((t) => (
              <div key={t.name} style={styles.testimoniCard}>
                <p style={styles.testimoniQuote}>"{t.quote}"</p>
                <div style={styles.testimoniAuthor}>
                  <span style={styles.testimoniAvatar}>{t.avatar}</span>
                  <div>
                    <div style={styles.testimoniName}>{t.name}</div>
                    <div style={styles.testimoniDetail}>{t.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...styles.section, background: '#f3f4f0' }}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Pertanyaan yang sering ditanya</h2>
          <div style={styles.faqList}>
            {faqs.map((faq) => (
              <div key={faq.q} style={styles.faqItem}>
                <h3 style={styles.faqQ}>{faq.q}</h3>
                <p style={styles.faqA}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Penutup */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaInner}>
          <h2 style={styles.ctaTitle}>Sudah siap dapat panggilan interview pertamamu?</h2>
          <p style={styles.ctaDesc}>Ribuan Fresh Grad Indonesia sudah mulai — sekarang giliran kamu.</p>
          <Link to={user ? '/dashboard' : '/register'} style={styles.ctaBtn}>
            {user ? 'Buka Dashboard' : 'Coba Gratis Sekarang'}
          </Link>
          <p style={styles.ctaNote}>✓ Coba gratis &nbsp; ✓ Hasil 30 detik &nbsp; ✓ Feedback spesifik, bukan generik</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <span style={styles.footerLogo}>Lamar<span style={{ color: 'var(--green)' }}>Cerdas</span></span>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
            © 2026 LamarCerdas. Dibuat dengan 💙 untuk job seeker Indonesia.
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

  // Testimonials
  testimoniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  testimoniCard: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  testimoniQuote: {
    fontSize: '0.9rem',
    color: 'var(--gray)',
    lineHeight: 1.7,
    fontStyle: 'italic',
    margin: 0,
    flexGrow: 1,
  },
  testimoniAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  testimoniAvatar: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  testimoniName: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--dark)',
  },
  testimoniDetail: {
    fontSize: '0.75rem',
    color: 'var(--gray)',
    marginTop: '2px',
  },

  // FAQ
  faqList: {
    maxWidth: '720px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  faqItem: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px 28px',
  },
  faqQ: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '8px',
  },
  faqA: {
    fontSize: '0.9rem',
    color: 'var(--gray)',
    lineHeight: 1.7,
    margin: 0,
  },

  // CTA Penutup
  ctaSection: {
    padding: '80px 24px',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    textAlign: 'center',
  },
  ctaInner: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  ctaTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
    fontWeight: 700,
    color: 'var(--dark)',
    lineHeight: 1.2,
    marginBottom: '16px',
  },
  ctaDesc: {
    fontSize: '1rem',
    color: 'var(--gray)',
    marginBottom: '32px',
    fontStyle: 'italic',
  },
  ctaBtn: {
    display: 'inline-block',
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '16px 36px',
    borderRadius: '14px',
    marginBottom: '20px',
    letterSpacing: '0.01em',
  },
  ctaNote: {
    fontSize: '0.78rem',
    color: 'var(--gray)',
    marginTop: '4px',
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
