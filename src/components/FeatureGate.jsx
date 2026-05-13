import { Link } from 'react-router-dom'

export default function FeatureGate({ canUse, remaining, feature, plan, children }) {
  if (canUse) return children

  const messages = {
    mock_interview: {
      icon: '🎤',
      title: 'Mock Interview hanya untuk paket Pro',
      desc: 'Upgrade ke Pro untuk latihan interview unlimited bareng Diah Anna.',
    },
    cv_review: {
      icon: '📄',
      title: plan === 'free' ? 'Kamu sudah pakai jatah gratis CV Review' : 'Limit CV Review bulan ini habis',
      desc: plan === 'free'
        ? 'Upgrade ke Starter untuk 5x CV Review per bulan.'
        : 'Upgrade ke paket lebih tinggi untuk lebih banyak review.',
    },
    ats_checker: {
      icon: '🎯',
      title: plan === 'free' ? 'Kamu sudah pakai jatah gratis ATS Checker' : 'Limit ATS Checker bulan ini habis',
      desc: plan === 'free'
        ? 'Upgrade ke Starter untuk 5x ATS Check per bulan.'
        : 'Upgrade ke Pro untuk akses lebih banyak.',
    },
    diah_anna: {
      icon: '🧠',
      title: plan === 'free' ? 'Kamu sudah pakai jatah gratis Diah Anna' : 'Limit sesi Diah Anna bulan ini habis',
      desc: plan === 'free'
        ? 'Upgrade ke Starter untuk 5 sesi per bulan, atau Pro untuk unlimited.'
        : 'Upgrade ke Pro untuk sesi unlimited.',
    },
  }

  const msg = messages[feature] || {
    icon: '🔒',
    title: 'Fitur ini tidak tersedia di paket kamu',
    desc: 'Upgrade untuk akses penuh.',
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>{msg.icon}</div>
        <h2 style={styles.title}>{msg.title}</h2>
        <p style={styles.desc}>{msg.desc}</p>
        <div style={styles.actions}>
          <Link to="/pricing" style={styles.btnUpgrade}>
            Lihat Paket & Harga →
          </Link>
          <Link to="/dashboard" style={styles.btnBack}>
            Kembali ke Dashboard
          </Link>
        </div>
        <div style={styles.planBadge}>
          Paket kamu sekarang: <strong>{plan === 'free' ? 'Free' : plan === 'starter' ? 'Starter' : 'Pro'}</strong>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: 'calc(100vh - 64px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  card: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '48px 40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
  },
  icon: { fontSize: '3.5rem', marginBottom: '16px' },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '12px',
    color: 'var(--dark)',
  },
  desc: {
    color: 'var(--gray)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    marginBottom: '28px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  btnUpgrade: {
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    padding: '13px',
    borderRadius: '10px',
    display: 'block',
  },
  btnBack: {
    background: 'var(--gray-light)',
    color: 'var(--dark)',
    fontWeight: 500,
    fontSize: '0.9rem',
    padding: '12px',
    borderRadius: '10px',
    display: 'block',
  },
  planBadge: {
    fontSize: '0.8rem',
    color: 'var(--gray)',
  },
}
