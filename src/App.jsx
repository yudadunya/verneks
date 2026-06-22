import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { useSubscription } from './hooks/useSubscription'

// Lazy load semua halaman ok
const Home         = lazy(() => import('./pages/Home'))
const Login        = lazy(() => import('./pages/Login'))
const Register     = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))
const Chat         = lazy(() => import('./pages/Chat'))
const Pricing      = lazy(() => import('./pages/Pricing'))
const Blog         = lazy(() => import('./pages/Blog'))
const BlogPost     = lazy(() => import('./pages/BlogPost'))
const Journey      = lazy(() => import('./pages/Journey'))
const Discovery    = lazy(() => import('./pages/Discovery'))
const Paywall      = lazy(() => import('./pages/Paywall'))
const GenomeResult = lazy(() => import('./pages/GenomeResult'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const DNA          = lazy(() => import('./pages/DNA'))
const Opportunities = lazy(() => import('./pages/Opportunities'))
const Profile      = lazy(() => import('./pages/Profile'))
const AdminPanel   = lazy(() => import('./pages/AdminPanel'))

import UpgradeModal from './components/UpgradeModal'

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

// ── Sinkronisasi data Discovery → Supabase setelah SIGNED_IN ────────────────
// PENTING: fungsi ini dipanggil DI LUAR callback onAuthStateChange (lewat
// setTimeout 0), supaya auth-lock Supabase sudah dilepas. Memanggil
// supabase.* di dalam callback auth menyebabkan deadlock navigator.locks
// → seluruh app freeze (terutama saat buka app dengan sesi masih aktif).
async function syncDiscoveryData(u, setChatMessages) {
  setChatMessages(loadMessages(u.id))

  const discoveryResult = localStorage.getItem('lc_discovery_result')
  const discoveryMessages = localStorage.getItem('lc_discovery_messages')
  let hasCareerData = false

  if (discoveryResult) {
    try {
      const result = JSON.parse(discoveryResult)

      const { data: existing } = await supabase
        .from('user_career_profiles')
        .select('career_readiness')
        .eq('user_id', u.id)
        .maybeSingle()

      if (existing?.career_readiness == null) {
        const p  = result.profile_preview || {}
        const gs = result.genome_scores   || {}
        const gw = result.growth_state    || {}

        const { error: profileErr } = await supabase.from('user_career_profiles').upsert({
          user_id:          u.id,
          nama:             p.nama             || null,
          target_posisi:    p.target_posisi    || null,
          posisi_saat_ini:  p.posisi_saat_ini  || null,
          industri:         p.industri         || null,
          hambatan:         p.hambatan_utama   || p.hambatan || null,
          motivasi:         p.motivasi         || null,
          gaya_kerja:       p.gaya_kerja       || null,
          career_readiness: result.career_readiness || 0,
          skill_gaps:       result.gap_skills  || [],
          gps_steps:        result.gps_steps   || [],
          mentor_message:   result.mentor_message || null,
          summary:          result.wow_insight  || result.mentor_message || null,
          last_updated:     new Date().toISOString(),
        }, { onConflict: 'user_id' })
        if (profileErr) console.warn('[discovery-save] profile error:', profileErr.message)

        if (Object.values(gs).some(v => v > 0)) {
          supabase.from('user_genome_scores').upsert({
            user_id:      u.id,
            ...gs,
            top_strength: result.top_strength || null,
            updated_at:   new Date().toISOString(),
          }, { onConflict: 'user_id' }).catch(e => console.warn('[genome-save]', e.message))
        }

        if (gw.career_stage) {
          supabase.from('user_growth_state').upsert({
            user_id:          u.id,
            career_stage:     gw.career_stage,
            progress_percent: gw.progress_percent || result.career_readiness || 0,
            current_focus:    gw.current_focus || null,
            updated_at:       new Date().toISOString(),
          }, { onConflict: 'user_id' }).catch(e => console.warn('[growth-save]', e.message))
        }

        if (discoveryMessages) {
          try {
            const msgs = JSON.parse(discoveryMessages)
            const apiMsgs = msgs
              .filter(m => m.role === 'user' || m.role === 'bot')
              .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text || '' }))
              .filter(m => m.content)
            fetch('/api/extract-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: u.id, messages: apiMsgs })
            }).catch(e => console.warn('[extract-profile]', e))
          } catch {}
        }
      }

      if (result.gps_steps?.length > 0) {
        const { data: existingMs } = await supabase
          .from('user_milestones').select('id').eq('user_id', u.id).limit(1)
        if (!existingMs?.length) {
          const rows = result.gps_steps.map((step, i) => ({
            user_id:      u.id,
            title:        step.title || step,
            description:  step.description || null,
            step_index:   i,
            is_completed: step.done || false,
          }))
          await supabase.from('user_milestones').insert(rows)
        }
      }

      hasCareerData = true
    } catch (e) {
      console.warn('[discovery-save] error:', e.message)
    }
    localStorage.removeItem('lc_discovery_result')
    localStorage.removeItem('lc_discovery_messages')
    sessionStorage.removeItem(`lc_job_matches_${u.id}`)
  }

  if (!hasCareerData) {
    try {
      const { data: cp } = await supabase
        .from('user_career_profiles')
        .select('career_readiness')
        .eq('user_id', u.id)
        .maybeSingle()
      hasCareerData = cp?.career_readiness != null
    } catch (err) {
      console.warn('[App redirect] cek career_readiness gagal:', err.message)
    }
  }

  const target = hasCareerData ? '/chat' : '/discovery'
  if (window.location.pathname !== target) {
    window.location.replace(target)
  }
}

export default function App() {
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeData, setUpgradeData] = useState(null)

  const subscription = useSubscription(user?.id)

  // ── Auto-logout setelah inaktif 5 menit ──────────────────────────────────
  // Depend ke user?.id (bukan objek user), supaya TOKEN_REFRESHED otomatis
  // tiap ~1 jam tidak terus-menerus teardown/re-setup timer ini.
  useEffect(() => {
    if (!user?.id) return

    const INACTIVE_LIMIT = 5 * 60 * 1000
    let inactiveTimer

    const resetTimer = () => {
      clearTimeout(inactiveTimer)
      inactiveTimer = setTimeout(async () => {
        console.warn('[App] Auto-logout: inaktif 5 menit')
        await Promise.race([
          supabase.auth.signOut().catch(() => {}),
          new Promise(resolve => setTimeout(resolve, 3000)),
        ])
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') || k.startsWith('lc_'))
          .forEach(k => localStorage.removeItem(k))
        window.location.replace('/')
      }, INACTIVE_LIMIT)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    window.addEventListener('diah-anna-replied', resetTimer)

    resetTimer()

    return () => {
      clearTimeout(inactiveTimer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
      window.removeEventListener('diah-anna-replied', resetTimer)
    }
  }, [user?.id])

  // Global upgrade modal trigger
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setUpgradeData(e.detail)
      setShowUpgrade(true)
    }
    window.addEventListener('show-upgrade', handler)
    return () => window.removeEventListener('show-upgrade', handler)
  }, [])

  useEffect(() => {
    const clearSWAndCache = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map(r => r.unregister()))
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
      } catch (e) { console.warn('[App] clearSW error:', e) }
    }
    clearSWAndCache()

    let timeoutFired = false

    const timeoutId = setTimeout(() => {
      timeoutFired = true
      console.warn('[App] getSession timeout setelah 5 detik')
      const sbKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
      if (sbKeys.length === 0) {
        window.location.replace('/')
      } else {
        setLoading(false)
      }
    }, 5000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId)
        const u = session?.user ?? null
        setUser(u)
        if (u) setChatMessages(loadMessages(u.id))
        setLoading(false)
      })
      .catch(() => {
        clearTimeout(timeoutId)
        if (!timeoutFired) {
          setUser(null)
          setLoading(false)
        }
      })

    // ── onAuthStateChange — callback TIDAK async ──────────────────────────
    // Semua kerja Supabase di-defer keluar callback via setTimeout(0) agar
    // auth-lock dilepas → tidak ada deadlock/freeze saat sesi aktif.
    const { data: { subscription: authListenerSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
        return
      }
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        setChatMessages(loadMessages(u.id))
        if (_event === 'SIGNED_IN') {
          setTimeout(() => {
            syncDiscoveryData(u, setChatMessages)
          }, 0)
        }
      } else {
        setChatMessages([])
        Object.keys(sessionStorage)
          .filter(k => k.startsWith('lc_greeted_'))
          .forEach(k => sessionStorage.removeItem(k))
      }
    })
    return () => authListenerSub.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '16px',
      background: 'var(--wa-header)'
    }}>
      <img src="/verneks_icon_1.png" alt="Verneks" style={{ width: 56, height: 56, objectFit: 'contain' }} />
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>Verneks</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Memuat...</div>
    </div>
  )

  const PageLoader = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '16px',
      background: 'var(--wa-header)'
    }}>
      <img src="/verneks_icon_1.png" alt="Verneks" style={{ width: 56, height: 56, objectFit: 'contain' }} />
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>Verneks</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Memuat...</div>
    </div>
  )

  return (
    <>
    <BrowserRouter>
      <Suspense fallback={PageLoader}>
      <Routes>
        <Route path="/"              element={<Home user={user} />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/pricing"       element={<Pricing user={user} />} />
        <Route path="/chat"          element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/discovery"      element={<Discovery />} />
        <Route path="/genome-result"   element={<GenomeResult />} />
        <Route path="/paywall"          element={<Paywall />} />
        <Route path="/dashboard"       element={<Dashboard user={user} loading={loading} subscription={subscription} />} />
        <Route path="/journey"         element={<Journey user={user} loading={loading} subscription={subscription} />} />
        <Route path="/dna"            element={<DNA user={user} loading={loading} subscription={subscription} />} />
        <Route path="/opportunities"  element={<Opportunities user={user} loading={loading} />} />
        <Route path="/profile"        element={<Profile user={user} loading={loading} subscription={subscription} />} />
        <Route path="/blog"          element={<Blog user={user} />} />
        <Route path="/blog/:slug"    element={<BlogPost user={user} />} />
        <Route path="/adm-lc"        element={<AdminPanel />} />

        {/* Backward Compatibility */}
        <Route path="/cv-review"      element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/ats-checker"    element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/mock-interview" element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/career-coach"   element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/cv-maker"       element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    {showUpgrade && user && (
      <UpgradeModal
        user={user}
        initialData={upgradeData}
        onClose={() => { setShowUpgrade(false); setUpgradeData(null) }}
      />
    )}
    </>
  )
}
