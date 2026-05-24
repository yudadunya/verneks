import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) return setError('Email dan password harus diisi.')
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email atau password salah.'); setLoading(false); return }
    navigate('/dashboard')
  }

  return (
    <div className="wa-screen" style={{ minHeight: '100vh' }}>
      <div style={{ background: 'var(--wa-header)', padding: '40px 24px 60px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>💼</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.3rem' }}>LamarCerdas</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '4px' }}>Masuk ke akun kamu</div>
      </div>

      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', marginTop: '-20px', flex: 1, padding: '32px 0' }}>
        <div className="wa-section-header">Email</div>
        <div className="wa-form-group">
          <input className="wa-form-input" type="email" placeholder="email@kamu.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="wa-section-header">Password</div>
        <div className="wa-form-group">
          <input className="wa-form-input" type="password" placeholder="Password kamu" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        {error && <div className="wa-alert red" style={{ margin: '8px 12px' }}>{error}</div>}

        <div style={{ padding: '16px' }}>
          <button className="wa-btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '8px 16px', fontSize: '0.85rem', color: 'var(--wa-gray)' }}>
          <Link to="/forgot-password" style={{ color: 'var(--wa-green-dark)', fontWeight: 600 }}>Lupa password?</Link>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.85rem', color: 'var(--wa-gray)' }}>
          Belum punya akun?{' '}
          <Link to="/register" style={{ color: 'var(--wa-green-dark)', fontWeight: 700 }}>Daftar Gratis</Link>
        </div>
      </div>
    </div>
  )
}
