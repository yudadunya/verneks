import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FREE_FEATURES = [
  'Career DNA Test',
  'Career Genome',
  'Career Gap Analysis',
  'Career Readiness %',
  '3 Langkah Pertama GPS',
]

const PREMIUM_FEATURES = [
  { icon: '🗺️', text: 'Career GPS Lengkap — roadmap personal step by step' },
  { icon: '💬', text: 'Diah Anna AI Mentor tanpa batas' },
  { icon: '📈', text: 'Progress Tracking & streak harian' },
  { icon: '📋', text: 'Weekly Coaching Report' },
  { icon: '💼', text: 'Opportunity Matching — lowongan yang cocok' },
  { icon: '✅', text: 'Personal Action Plan' },
]

export default function Paywall() {
  const navigate = useNavigate()
  const [result, setResult]       = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [revealed, setRevealed]   = useState(false)
  const [plan, setPlan]           = useState('premium') // 'premium' | 'free'

  useEffect(() => {
    const saved = sessionStorage.getItem('lc_discovery_result')
    if (!saved) { navigate('/discovery'); return }
    try {
      setResult(JSON.parse(saved))
      setTimeout(() => setRevealed(true), 80)
    } catch { navigate('/discovery') }
  }, [])

  const handleLogin = async (selectedPlan) => {
    setPlan(selectedPlan)
    setLoginLoading(true)
    // Simpan plan intent ke sessionStorage supaya App.jsx bisa baca setelah login
    sessionStorage.setItem('lc_plan_intent', selectedPlan)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  if (!result) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0f0d' }}>
      <div style={{ fontSize: '2rem' }}>⏳</div>
    </div>
  )

  const p = result.profile_preview || {}
  const readiness = result.career_readiness || 0
  const gpsSteps = result.gps_steps || []
  const lockedSteps = gpsSteps.filter((_, i) => i >= 3)
  const mentorMessage = result.mentor_message || null

  const fade = (delay = 0) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'none' : 'translateY(14px)',
    transition: `all 0.5s ease ${delay}s`,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0d', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/genome-result')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.83rem' }}>
          ← Kembali
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Career GPS</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '22px 18px 160px', maxWidth: 480, margin: '0 auto' }}>

        {/* Result Summary Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', ...fade(0) }}>
          {p.target_posisi && (
            <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 99, padding: '4px 12px', fontSize: '0.78rem', color: '#25D366', fontWeight: 600 }}>
              🎯 {p.target_posisi}
            </div>
          )}
          <div style={{ background: 'rgba(52,183,241,0.1)', border: '1px solid rgba(52,183,241,0.2)', borderRadius: 99, padding: '4px 12px', fontSize: '0.78rem', color: '#34B7F1', fontWeight: 600 }}>
            📊 Kesiapan {readiness}%
          </div>
        </div>

        {/* Diah Anna Personalized Message */}
        <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 16, padding: '16px', marginBottom: 20, ...fade(0.05) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(37,211,102,0.3)' }} />
            <div>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.82rem' }}>Diah Anna</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem' }}>AI Career Mentor</div>
            </div>
          </div>

          {/* Pesan personal */}
          <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 16 }}>
            {mentorMessage || `${p.nama ? `${p.nama}, b` : 'B'}erdasarkan hasil analisis saya, kamu punya potensi nyata untuk mencapai target karirmu.${p.hambatan_utama ? ` Hambatan terbesar saat ini adalah ${p.hambatan_utama}.` : ''} Saya sudah menyusun langkah-langkah spesifik yang perlu kamu lakukan.`}
          </div>

          {/* GPS Roadmap dengan blur */}
          <div style={{ borderTop: '1px solid rgba(37,211,102,0.15)', paddingTop: 14 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.5px' }}>
              ROADMAP PERSONAL:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gpsSteps.slice(0, 3).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem' }}>
                  <span style={{ color: step.done ? '#25D366' : '#34B7F1', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                    {step.done ? '✓' : `${i + 1}.`}
                  </span>
                  <span style={{ color: step.done ? '#25D366' : 'rgba(255,255,255,0.7)' }}>{step.title}</span>
                </div>
              ))}
              {lockedSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', position: 'relative' }}>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>🔒</span>
                  <span style={{ color: 'rgba(255,255,255,0.15)', filter: 'blur(4px)', userSelect: 'none' }}>{step.title}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
              {lockedSteps.length} langkah berikutnya tersedia setelah upgrade
            </div>
          </div>
        </div>

        {/* Premium Features */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px', marginBottom: 16, ...fade(0.1) }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>
            🎯 Career GPS Kamu Sudah Siap
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.5 }}>
            Buka roadmap lengkap, AI mentor tanpa batas, dan progress tracking personal.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {PREMIUM_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{f.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yang Tetap Gratis */}
        <div style={{ background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.1)', borderRadius: 12, padding: '14px', ...fade(0.15) }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.5px' }}>SELALU GRATIS:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 8px' }}>
            {FREE_FEATURES.map(f => (
              <span key={f} style={{ color: '#25D366', fontSize: '0.75rem' }}>✓ {f}</span>
            ))}
          </div>
        </div>

      </div>

      {/* ── Fixed Bottom CTAs ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, padding: '14px 18px 32px',
        background: 'linear-gradient(to top, #0a0f0d 80%, transparent)',
      }}>
        {/* Pricing hint */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ color: '#FFB74D', fontWeight: 800, fontSize: '1.1rem' }}>Rp29.000</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}> / bulan · batalkan kapan saja</span>
        </div>

        {/* Premium CTA */}
        <button
          onClick={() => handleLogin('premium')}
          disabled={loginLoading}
          style={{
            width: '100%', padding: '15px', marginBottom: 10,
            background: loginLoading ? '#333' : 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            borderRadius: 14, border: 'none', cursor: loginLoading ? 'not-allowed' : 'pointer',
            boxShadow: loginLoading ? 'none' : '0 4px 20px rgba(37,211,102,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loginLoading && plan === 'premium' ? '⏳ Mengarahkan...' : '🚀 Upgrade Premium — Buka Career GPS'}
        </button>

        {/* Free CTA */}
        <button
          onClick={() => handleLogin('free')}
          disabled={loginLoading}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: '0.85rem',
            borderRadius: 12, cursor: loginLoading ? 'not-allowed' : 'pointer',
          }}>
          {loginLoading && plan === 'free' ? '⏳ Mengarahkan...' : 'Simpan Hasil Gratis — Tanpa Premium'}
        </button>
      </div>
    </div>
  )
}
