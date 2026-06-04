import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Chat from './pages/Chat'
import Pricing from './pages/Pricing'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Journey from './pages/Journey'
import Discovery from './pages/Discovery'
import Paywall from './pages/Paywall'
import GenomeResult from './pages/GenomeResult'
import Dashboard from './pages/Dashboard'
import DNA from './pages/DNA'
import Opportunities from './pages/Opportunities'
import Profile from './pages/Profile'

// Helper baca localStorage
function loadMessages(userId) {
  if (!userId) return []
  try {
    const saved = localStorage.getItem(`lc_chat_${userId}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return []
}

export default function App() {
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [chatMessages, setChatMessages] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) setChatMessages(loadMessages(u.id))
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
        return
      }
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setChatMessages(loadMessages(u.id))
        if (_event === 'SIGNED_IN') {
          // Cek apakah ada discovery result yang perlu disimpan
          const discoveryResult = sessionStorage.getItem('lc_discovery_result')
          const discoveryMessages = sessionStorage.getItem('lc_discovery_messages')
          if (discoveryResult && discoveryMessages) {
            try {
              const msgs = JSON.parse(discoveryMessages)
              const apiMsgs = msgs
                .filter(m => m.role === 'user' || m.role === 'bot')
                .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text || '' }))
                .filter(m => m.content)
              // Simpan ke Supabase via extract-profile
              fetch('/api/extract-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: u.id, messages: apiMsgs })
              }).catch(e => console.warn('[discovery-save]', e))
            } catch {}
            sessionStorage.removeItem('lc_discovery_result')
            sessionStorage.removeItem('lc_discovery_messages')
          }
          if (window.location.pathname === '/' ||
              window.location.pathname === '/genome-result' ||
              window.location.hash.includes('access_token')) {
            window.location.replace('/dashboard')
          }
        }
      } else {
        setChatMessages([])
      }
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
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>LamarCerdas</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Memuat...</div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Home user={user} />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/pricing"       element={<Pricing user={user} />} />
        <Route path="/chat"          element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/discovery"      element={<Discovery />} />
        <Route path="/genome-result"   element={<GenomeResult />} />
        <Route path="/paywall"          element={<Paywall />} />
        <Route path="/dashboard"       element={<Dashboard user={user} />} />
        <Route path="/journey"         element={<Journey user={user} />} />
        <Route path="/dna"            element={<DNA user={user} />} />
        <Route path="/opportunities"  element={<Opportunities user={user} />} />
        <Route path="/profile"        element={<Profile user={user} />} />
        <Route path="/blog"          element={<Blog user={user} />} />
        <Route path="/blog/:slug"    element={<BlogPost user={user} />} />
        
        {/* Backward Compatibility: Semua route lama redirect ke /chat */}
        <Route path="/cv-review"      element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/ats-checker"    element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/mock-interview" element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/career-coach"   element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/cv-maker"       element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
      </Routes>
    </BrowserRouter>
  )
}
