import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithGoogle, supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard')
    })
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.logo}>
          Lamar<span style={{ color: 'var(--green)' }}>Cerdas</span>
        </Link>

        <div style={styles.badge}>✨ Gratis — Tidak perlu kartu kredit</div>

        <h1 style={styles.title}>Mulai coaching karir kamu</h1>
        <p style={styles.sub}>Daftar dalam 1 klik, langsung bisa pakai semua fitur gratis</p>

        <button onClick={signInWithGoogle} style={styles.btnGoogle}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
          Daftar & Masuk dengan Google
        </button>

        <div style={styles.perks}>
          <div style={styles.perk}>✅ CV Review AI gratis 1x/bulan</div>
          <div style={styles.perk}>✅ ATS Score Checker gratis 1x/bulan</div>
          <div style={styles.perk}>✅ Diah Anna - AI Career Coach 1x/bulan</div>
        </div>

        <p style={styles.terms}>
          Dengan mendaftar, kamu setuju dengan{' '}
          <Link to="/" style={{ color: 'var(--green)' }}>Syarat & Ketentuan</Link> kami.
        </p>
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
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: 700,
    display: 'block',
    marginBottom: '24px',
  },
  badge: {
    display: 'inline-block',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: 'var(--green-dark)',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: '100px',
    marginBottom: '16px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: '8px',
  },
  sub: {
    color: 'var(--gray)',
    fontSize: '0.9rem',
    marginBottom: '28px',
    lineHeight: 1.5,
  },
  btnGoogle: {
    width: '100%',
    background: '#fff',
    color: 'var(--dark)',
    fontWeight: 600,
    fontSize: '0.95rem',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontFamily: 'var(--font-body)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: '24px',
  },
  perks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
    textAlign: 'left',
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
  },
  perk: {
    fontSize: '0.85rem',
    color: 'var(--dark)',
  },
  terms: {
    color: 'var(--gray)',
    fontSize: '0.75rem',
    lineHeight: 1.6,
  },
}
