import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import CVReview from './pages/CVReview'
import ATSChecker from './pages/ATSChecker'
import MockInterview from './pages/MockInterview'
import CareerCoach from './pages/CareerCoach'
import Pricing from './pages/Pricing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyPhone from './pages/VerifyPhone'
import CVMaker from './pages/CVMaker'
import BottomNav from './components/BottomNav'

function AppContent({ user }) {
  const location = useLocation()
  // Pages that show bottom nav (when logged in)
  const navPages = ['/dashboard', '/cv-review', '/ats-checker', '/mock-interview', '/career-coach', '/cv-maker', '/pricing']
  const showNav = user && navPages.some(p => location.pathname.startsWith(p))

  return (
    <>
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-phone" element={<VerifyPhone user={user} />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/cv-review" element={<CVReview user={user} />} />
        <Route path="/cv-maker" element={<CVMaker user={user} />} />
        <Route path="/ats-checker" element={<ATSChecker user={user} />} />
        <Route path="/mock-interview" element={<MockInterview user={user} />} />
        <Route path="/career-coach" element={<CareerCoach user={user} />} />
        <Route path="/pricing" element={<Pricing user={user} />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
        return
      }
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '16px',
      background: 'var(--wa-header)'
    }}>
      <div style={{ fontSize: '3rem' }}>💼</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.5px' }}>
        LamarCerdas
      </div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
        Memuat...
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <AppContent user={user} />
    </BrowserRouter>
  )
}
