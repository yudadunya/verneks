import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithGoogle, supabase } from '../lib/supabase'

export default function Login() {
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

        <h1 style={styles.title}>Selamat datang kembali</h1>
        <p style={styles.sub}>Masuk untuk lanjut coaching karir kamu</p>

        <button onClick={signInWithGoogle} style={styles.btnGoogle}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
          Masuk dengan Google
        </button>

        <p style={styles.note}>
          Belum punya akun? Tidak perlu daftar —<br />
          langsung masuk dengan Google di atas.
        </p>

        <p style={styles.terms}>
          Dengan masuk, kamu setuju dengan{' '}
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
    marginBottom: '32px',
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
    marginBottom: '32px',
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
    marginBottom: '20px',
  },
  note: {
    color: 'var(--gray)',
    fontSize: '0.8rem',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  terms: {
    color: 'var(--gray)',
    fontSize: '0.75rem',
    lineHeight: 1.6,
  },
}
