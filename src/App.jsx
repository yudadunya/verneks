import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'

// Lazy load semua halaman — bundle dipecah per route, hanya dimuat saat dibutuhkan
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

// UpgradeModal tetap static — dipakai global di semua halaman
import UpgradeModal from './components/UpgradeModal'

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

// Expose navigate() ke luar BrowserRouter via ref
function NavigateSetter({ navigateRef }) {
  const nav = useNavigate()
  useEffect(() => { navigateRef.current = nav }, [nav])
  return null
}

export default function App() {
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [redirectTo, setRedirectTo] = useState(null)
  const navigateRef = useRef(null)
  const [chatMessages, setChatMessages] = useState([])
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeData, setUpgradeData] = useState(null)

  // Global upgrade modal trigger
  useEffect(() => {
    const handler = (e) => {
      // Hanya update data kalau event membawa detail (dari Dashboard)
      // Kalau dari BottomNav (tanpa detail) — pakai data terakhir yang tersimpan
      if (e.detail) setUpgradeData(e.detail)
      setShowUpgrade(true)
    }
    window.addEventListener('show-upgrade', handler)
    return () => window.removeEventListener('show-upgrade', handler)
  }, [])

  useEffect(() => {
    // Failsafe: kalau getSession() hang (stale token setelah logout), paksa unblock setelah 8 detik
    const loadingTimeout = setTimeout(() => setLoading(false), 8000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(loadingTimeout)
        const u = session?.user ?? null
        setUser(u)
        if (u) setChatMessages(loadMessages(u.id))
        setLoading(false)
      })
      .catch(() => { clearTimeout(loadingTimeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
        return
      }
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setChatMessages(loadMessages(u.id))
        if (_event === 'SIGNED_IN') {
          // Sync discovery result ke Supabase
          const discoveryResult = localStorage.getItem('lc_discovery_result')
          const discoveryMessages = localStorage.getItem('lc_discovery_messages')
          if (discoveryResult) {
            try {
              const result = JSON.parse(discoveryResult)

              // Cek dulu — kalau user sudah punya data, jangan overwrite
              const { data: existing } = await supabase
                .from('user_career_profiles')
                .select('career_readiness')
                .eq('user_id', u.id)
                .maybeSingle()

              if (existing?.career_readiness == null) {
                // User baru — simpan data Discovery ke Supabase
                const p  = result.profile_preview || {}
                const gs = result.genome_scores   || {}
                const gw = result.growth_state    || {}

                // 1. Simpan profil
                supabase.from('user_career_profiles').upsert({
                  user_id:          u.id,
                  nama:             p.nama             || null,
                  target_posisi:    p.target_posisi    || null,
                  posisi_saat_ini:  p.posisi_saat_ini  || null,
                  industri:         p.industri         || null,
                  hambatan:         p.hambatan_utama   || null,
                  career_readiness: result.career_readiness || 0,
                  skill_gaps:       result.gap_skills  || [],
                  gps_steps:        result.gps_steps   || [],
                  mentor_message:   result.mentor_message || null,
                  summary:          result.mentor_message || null,
                  last_updated:     new Date().toISOString(),
                }, { onConflict: 'user_id' }).then(({ error }) => {
                  if (error) console.warn('[discovery-save] profile error:', error.message)
                })

                // 2. Simpan genome scores
                if (Object.values(gs).some(v => v > 0)) {
                  supabase.from('user_genome_scores').upsert({
                    user_id:      u.id,
                    ...gs,
                    top_strength: result.top_strength || null,
                    updated_at:   new Date().toISOString(),
                  }, { onConflict: 'user_id' }).catch(e => console.warn('[genome-save]', e.message))
                }

                // 3. Simpan growth state
                if (gw.career_stage) {
                  supabase.from('user_growth_state').upsert({
                    user_id:          u.id,
                    career_stage:     gw.career_stage,
                    progress_percent: gw.progress_percent || result.career_readiness || 0,
                    current_focus:    gw.current_focus || null,
                    updated_at:       new Date().toISOString(),
                  }, { onConflict: 'user_id' }).catch(e => console.warn('[growth-save]', e.message))
                }

                // 4. Kirim messages ke extract-profile
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
              } // end if no existing data

            } catch (e) {
              console.warn('[discovery-save] error:', e.message)
            }
            localStorage.removeItem('lc_discovery_result')
            localStorage.removeItem('lc_discovery_messages')
            sessionStorage.removeItem(`lc_job_matches_${u.id}`)
          }
          // Redirect ke dashboard — kecuali user baru yang belum ada data Discovery
          const path = window.location.pathname
          const hash = window.location.hash
          const search = window.location.search

          console.log('[App redirect] path:', path, '| hash:', hash, '| search:', search)

          const shouldRedirect =
            path === '/' ||
            path === '/genome-result' ||
            path === '/paywall' ||
            hash.includes('access_token') ||
            search.includes('access_token')

          const onDiscovery = path === '/discovery'

          console.log('[App redirect] shouldRedirect:', shouldRedirect, '| onDiscovery:', onDiscovery)

          if (shouldRedirect) {
            try {
              const { data: cp, error } = await supabase
                .from('user_career_profiles')
                .select('career_readiness')
                .eq('user_id', u.id)
                .maybeSingle()

              console.log('[App redirect] career_readiness:', cp?.career_readiness, 'error:', error)

              const target = cp?.career_readiness != null ? '/chat' : '/discovery'
              if (navigateRef.current) {
                navigateRef.current(target, { replace: true })
              } else {
                setRedirectTo(target)
              }
            } catch (err) {
              console.error('[App redirect] fallback to /discovery', err)
              if (navigateRef.current) {
                navigateRef.current('/discovery', { replace: true })
              } else {
                setRedirectTo('/discovery')
              }
            }
          } else if (onDiscovery) {
            // User baru setelah OAuth — biarkan tetap di /discovery
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
      <img src="/verneks_icon_1.png" alt="Verneks" style={{ width: 56, height: 56, objectFit: 'contain' }} />
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>Verneks</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Memuat...</div>
    </div>
  )

  // Fallback spinner saat lazy chunk loading
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
      <NavigateSetter navigateRef={navigateRef} />
      {redirectTo && <Navigate to={redirectTo} replace />}
      <Suspense fallback={PageLoader}>
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
        <Route path="/adm-lc"        element={<AdminPanel />} />
        
        {/* Backward Compatibility: Semua route lama redirect ke /chat */}
        <Route path="/cv-review"      element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/ats-checker"    element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/mock-interview" element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/career-coach"   element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
        <Route path="/cv-maker"       element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
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
