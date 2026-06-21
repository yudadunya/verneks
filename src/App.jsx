import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { supabase } from './lib/supabase'
import { useSubscription } from './hooks/useSubscription'

// ── Error Boundary global — catch React crash → tampilkan UI helpful ──────
// Tanpa ini: uncaught render error = blank putih total tanpa info
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, background:'#075E54', padding:24, textAlign:'center' }}>
        <div style={{ fontSize:'2rem' }}>⚠️</div>
        <div style={{ color:'#fff', fontWeight:700, fontSize:'1.1rem' }}>Ups, ada yang error</div>
        <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', maxWidth:280 }}>
          {this.state.error?.message || 'Terjadi kesalahan tak terduga'}
        </div>
        <button
          onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
          style={{ marginTop:8, padding:'10px 24px', background:'#25D366', color:'#fff', border:'none', borderRadius:20, fontWeight:700, cursor:'pointer', fontSize:'0.9rem' }}
        >
          Muat Ulang
        </button>
      </div>
    )
  }
}

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
    const key = `lc_chat_${userId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      // FIX: kalau data > 500KB, terlalu besar → buang dan mulai fresh
      // ini yang bikin app stuck saat load (parse JSON 1MB+ di main thread)
      if (saved.length > 500_000) {
        console.warn('[loadMessages] localStorage terlalu besar, dibersihkan')
        localStorage.removeItem(key)
        return []
      }
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Tetap limit ke 100 untuk safety
        return parsed.slice(-100)
      }
    }
  } catch {
    // JSON corrupt → hapus
    try { localStorage.removeItem(`lc_chat_${userId}`) } catch {}
  }
  return []
}

export default function App() {
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeData, setUpgradeData] = useState(null)

  // ── Subscription/plan SATU SUMBER KEBENARAN ──────────────────────────────
  // Sebelumnya: Chat.jsx, DNA.jsx, Profile.jsx, Journey.jsx, Dashboard.jsx
  // masing-masing fetch sendiri-sendiri (5 query independen), tiap mulai
  // dari default "free" sebelum query resolve. Akibatnya: setiap pindah
  // halaman, sempat kelihatan "Free" sebelum balik ke "Premium" — dan kalau
  // koneksi lambat, jendela "kelihatan Free" itu jadi lama/macet.
  // Sekarang: di-fetch SEKALI di sini (App.jsx tidak pernah unmount saat
  // pindah route), dipakai bersama semua halaman via prop.
  const subscription = useSubscription(user?.id)

  // ── Auto-logout setelah inaktif 30 menit (seperti mobile banking) ───────
  useEffect(() => {
    if (!user) return

    const INACTIVE_LIMIT = 30 * 60 * 1000 // 30 menit
    let inactiveTimer

    const resetTimer = () => {
      clearTimeout(inactiveTimer)
      inactiveTimer = setTimeout(async () => {
        console.warn('[App] Auto-logout: inaktif 30 menit')
        await supabase.auth.signOut()
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') || k.startsWith('lc_'))
          .forEach(k => localStorage.removeItem(k))
        window.location.replace('/')
      }, INACTIVE_LIMIT)
    }

    // FIX: throttle resetTimer agar tidak clearTimeout ribuan kali/menit
    // mousemove tanpa throttle = overhead tinggi, bikin chat terasa lag
    let lastReset = 0
    const resetTimerThrottled = () => {
      const now = Date.now()
      if (now - lastReset < 10_000) return // max 1x per 10 detik
      lastReset = now
      resetTimer()
    }

    // Event yang dianggap aktif — mousemove pakai versi throttled
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    window.addEventListener('mousemove', resetTimerThrottled, { passive: true })
    resetTimer() // mulai timer

    return () => {
      clearTimeout(inactiveTimer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
      window.removeEventListener('mousemove', resetTimerThrottled)
    }
  }, [user])

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
    // FIX: clearSWAndCache DIHAPUS dari sini.
    // Sebelumnya ada di index.html + main.jsx + sini (3 tempat) →
    // race condition unregister SW saat chunk JS lazy load sedang didownload
    // → chunk dibatalkan → React gagal render halaman → blank putih.
    // Index.html sudah handle ini sebelum JS load, tidak perlu duplikat.

    console.log('[App] Starting getSession...')

    // Race: getSession vs timeout 5 detik
    let settled = false

    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      console.warn('[App] getSession timeout setelah 5 detik')
      const sbKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
      if (sbKeys.length === 0) {
        window.location.replace('/')
      } else {
        setLoading(false)
        console.warn('[App] Token ada tapi getSession lambat — biarkan user tetap')
      }
    }, 5000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        console.log('[App] getSession resolved, user:', session?.user?.email ?? 'null')
        const u = session?.user ?? null
        setUser(u)
        if (u) setChatMessages(loadMessages(u.id))
        setLoading(false)
      })
      .catch(() => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        setUser(null)
        setLoading(false)
      })

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
          let hasCareerData = false

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

                // 1. Simpan profil — await agar data pasti tersimpan sebelum redirect
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

              // Init milestones dari GPS steps kalau belum ada
              if (result.gps_steps?.length > 0) {
                supabase.from('user_milestones').select('id').eq('user_id', u.id).limit(1)
                  .then(({ data: existing }) => {
                    if (!existing?.length) {
                      const rows = result.gps_steps.map((step, i) => ({
                        user_id:      u.id,
                        title:        step.title || step,
                        description:  step.description || null,
                        step_index:   i,
                        is_completed: step.done || false,
                      }))
                      supabase.from('user_milestones').insert(rows).then()
                    }
                  })
              }

              // Data baru disimpan ATAU sudah ada sebelumnya — user kini punya career data
              hasCareerData = true

            } catch (e) {
              console.warn('[discovery-save] error:', e.message)
            }
            localStorage.removeItem('lc_discovery_result')
            localStorage.removeItem('lc_discovery_messages')
            sessionStorage.removeItem(`lc_job_matches_${u.id}`)
          }

          // Returning user tanpa discoveryResult — cek langsung ke Supabase
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

          // Redirect deterministik — selalu arahkan ke halaman yang benar.
          // Tidak lagi bergantung pada path/hash/search dari URL OAuth callback,
          // jadi tidak ada lagi kondisi "stuck di /discovery setelah login".
          const target = hasCareerData ? '/chat' : '/discovery'
          if (window.location.pathname !== target) {
            window.location.replace(target)
          }
        }
      } else {
        setChatMessages([])
        // Hapus greeting flags agar greeting muncul lagi saat login berikutnya
        Object.keys(sessionStorage)
          .filter(k => k.startsWith('lc_greeted_'))
          .forEach(k => sessionStorage.removeItem(k))
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
      <ErrorBoundary>
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
        
        {/* Backward Compatibility: Semua route lama redirect ke /chat */}
        <Route path="/cv-review"      element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/ats-checker"    element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/mock-interview" element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/career-coach"   element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
        <Route path="/cv-maker"       element={<Chat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} subscription={subscription} />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
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