// ATSChecker.jsx
export default function ATSChecker() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🎯 ATS Score Checker</h1>
        <p style={styles.sub}>Segera hadir — cek seberapa ATS-friendly CV kamu.</p>
        <div style={styles.comingSoon}>
          <p style={{ fontSize: '4rem' }}>🚧</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginTop: '16px' }}>Coming Soon</p>
          <p style={{ color: 'var(--gray)', marginTop: '8px', fontSize: '0.9rem' }}>Fitur ini sedang dalam pengembangan</p>
        </div>
      </div>
    </main>
  )
}

const styles = {
  page: { padding: '40px 24px', minHeight: 'calc(100vh - 64px)' },
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '8px' },
  sub: { color: 'var(--gray)', fontSize: '0.95rem', marginBottom: '40px' },
  comingSoon: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '60px',
    textAlign: 'center',
  },
}
