import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function Profile({ user }) {
  const navigate = useNavigate()
  if (!user) { navigate('/'); return null }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '80px' }}>
      <div className="wa-header"><div className="wa-header-title">Profile</div></div>
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--wa-green)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem' }}>👤</div>
        <div style={{ fontWeight: '700' }}>{user.user_metadata?.full_name || 'User'}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--wa-gray)', marginBottom: '20px' }}>{user.email}</div>
        
        <button onClick={() => navigate('/chat')} style={{ width: '100%', padding: '12px', background: 'var(--wa-green)', color: '#fff', borderRadius: '8px', marginBottom: '10px' }}>Chat dengan Diah Anna</button>
        <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', padding: '12px', border: '1px solid var(--wa-red)', color: 'var(--wa-red)', borderRadius: '8px' }}>Logout</button>
      </div>
      <BottomNav />
    </div>
  )
}
