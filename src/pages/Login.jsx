import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    if (!email || !password) return setError('Isi email dan password dulu ya.')
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email atau password salah.')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.logo}>Lamar<span style={{ color: 'var(--green)' }}>Cerdas</span></Link>
        <h1 style={styles.title}>Selamat datang kembali</h1>
        <p style={styles.sub}>Masuk ke akun kamu</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="kamu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button onClick={handleLogin} disabled={loading} style={styles.btn}>
          {loading ? 'Masuk...' : 'Masuk'}
        </button>

        <p style={styles.footer}>
  <Link to="/forgot-password" style={styles.link}>Lupa password?</Link>
</p>
<p style={styles.footer}>
  Belum punya akun? <Link to="/register" style={styles.link}>Daftar gratis</Link>
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
    maxWidth: '420px',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: 700,
    display: 'block',
    marginBottom: '28px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: '6px',
  },
  sub: {
    color: 'var(--gray)',
    fontSize: '0.9rem',
    marginBottom: '28px',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '0.875rem',
    marginBottom: '20px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '6px',
    color: 'var(--dark)',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '0.95rem',
    outline: 'none',
    background: 'var(--cream)',
    color: 'var(--dark)',
  },
  btn: {
    width: '100%',
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    marginTop: '8px',
    marginBottom: '20px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: 'var(--gray)',
  },
  link: {
    color: 'var(--green)',
    fontWeight: 600,
  },
}
