import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import Navbar from './components/Navbar'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
        LamarCerdas...
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/cv-review" element={<CVReview user={user} />} />
        <Route path="/ats-checker" element={<ATSChecker user={user} />} />
        <Route path="/mock-interview" element={<MockInterview user={user} />} />
        <Route path="/career-coach" element={<CareerCoach user={user} />} />
        <Route path="/pricing" element={<Pricing user={user} />} />
      </Routes>
    </BrowserRouter>
  )
}
