import { Link } from 'react-router-dom'

const menuItems = [
  { icon: '📄', title: 'CV Review', desc: 'Review CV kamu dengan AI', href: '/cv-review', badge: null },
  { icon: '🎯', title: 'ATS Checker', desc: 'Cek ATS score CV kamu', href: '/ats-checker', badge: 'Baru' },
  { icon: '🎤', title: 'Mock Interview', desc: 'Latihan interview dengan AI', href: '/mock-interview', badge: null },
  { icon: '🧠', title: 'Diah Anna - AI Career Coach', desc: 'Chat dengan career coach AI kamu', href: '/career-coach', badge: null },
]

export default function Dashboard({ user }) {
  if (!user) return (
    <div style={styles.center}>
      <p>Kamu harus <Link to="/login" style={{ color: 'var(--green)' }}>masuk</Link> dulu.</p>
    </div>
  )

  const name = user.user_metadata?.full_name?.split(' ')[0] || 'kamu'

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Hei, {name}! 👋</h1>
          <p style={styles.sub}>Mau ngapain hari ini?</p>
        </div>

        {/* Plan badge */}
        <div style={styles.planBadge}>
          <span>Paket kamu: </span>
          <strong style={{ color: 'var(--green)' }}>Free</strong>
          <Link to="/pricing" style={styles.upgradeLink}>Upgrade →</Link>
        </div>

        {/* Menu grid */}
        <div style={styles.grid}>
          {menuItems.map((item) => (
            <Link to={item.href} key={item.title} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.icon}>{item.icon}</span>
                {item.badge && <span style={styles.badge}>{item.badge}</span>}
              </div>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardDesc}>{item.desc}</p>
              <span style={styles.cardArrow}>Mulai →</span>
            </Link>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <div style={styles.recentSection}>
          <h2 style={styles.recentTitle}>Aktivitas Terakhir</h2>
          <div style={styles.emptyState}>
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>Belum ada aktivitas. Mulai dengan review CV kamu!</p>
            <Link to="/cv-review" style={styles.startBtn}>Review CV Sekarang</Link>
          </div>
        </div>
      </div>
    </main>
  )
}

const styles = {
  page: { padding: '40px 24px', minHeight: 'calc(100vh - 64px)' },
  container: { maxWidth: '900px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  header: { marginBottom: '24px' },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '4px',
  },
  sub: { color: 'var(--gray)', fontSize: '1rem' },
  planBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '100px',
    padding: '6px 16px',
    fontSize: '0.875rem',
    marginBottom: '32px',
    color: 'var(--dark)',
  },
  upgradeLink: {
    color: 'var(--green)',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '40px',
  },
  card: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    display: 'block',
    transition: 'all 0.15s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  icon: { fontSize: '1.8rem' },
  badge: {
    background: '#fef3c7',
    color: '#92400e',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '100px',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '4px',
  },
  cardDesc: { fontSize: '0.85rem', color: 'var(--gray)', marginBottom: '16px' },
  cardArrow: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--green)' },
  recentSection: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '28px',
  },
  recentTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 700,
    marginBottom: '20px',
  },
  emptyState: { textAlign: 'center', padding: '20px 0' },
  startBtn: {
    display: 'inline-block',
    marginTop: '16px',
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '10px 20px',
    borderRadius: '10px',
  },
}
