// src/components/UpgradeModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { postJson } from '../lib/api'

const PAYMENT_URL = 'http://lynk.id/yudadunya/r3o5ldq5qkex/checkout'

// Generate GPS steps dari data user — fallback ke generic kalau data kosong
function buildGpsSteps(gpsFromDb, gapSkills, targetPosisi) {
  // Prioritas 1: pakai gps_steps dari DB (hasil compute-genome)
  if (gpsFromDb?.length >= 3) {
    return gpsFromDb.map((s, i) => ({
      label: s.title || s.label || `Langkah ${i+1}`,
      done:  s.done  || false,
      free:  i < 2,
    }))
  }
  // Prioritas 2: generate dari gap_skills user
  if (gapSkills?.length > 0) {
    const steps = [
      { label: 'Career Assessment',      done: true,  free: true  },
      { label: gapSkills[0],             done: false, free: true  },
      { label: gapSkills[1] || 'Latihan Praktik',  done: false, free: false },
      { label: gapSkills[2] || 'Portfolio Project', done: false, free: false },
      { label: gapSkills[3] || 'Personal Branding', done: false, free: false },
      { label: 'Interview Preparation',  done: false, free: false },
    ]
    return steps
  }
  // Fallback generic
  return [
    { label: 'Career Assessment',     done: true,  free: true  },
    { label: 'Skill Foundation',      done: false, free: true  },
    { label: 'Core Skill Building',   done: false, free: false },
    { label: 'Practice & Portfolio',  done: false, free: false },
    { label: 'Personal Branding',     done: false, free: false },
    { label: 'Interview Preparation', done: false, free: false },
  ]
}

export default function UpgradeModal({ user, onClose, initialData = null }) {
  const [profile,  setProfile]  = useState(initialData?.profile  || null)
  const [growth,   setGrowth]   = useState(initialData?.growth   || null)
  const [genome,   setGenome]   = useState(initialData?.genome   || null)
  const [loading,  setLoading]  = useState(!initialData)

  // Redeem code state
  const [showRedeem,   setShowRedeem]   = useState(false)
  const [redeemCode,   setRedeemCode]   = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemMsg,    setRedeemMsg]    = useState(null)  // { type: 'ok'|'err', text }
  const [redeemDone,   setRedeemDone]   = useState(false)

  useEffect(() => {
    // Kalau data sudah dikirim dari Dashboard — langsung pakai, tidak perlu fetch
    if (initialData?.profile) { setLoading(false); return }
    if (!user?.id) { setLoading(false); return }
    Promise.all([
      supabase.from('user_career_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: g }, { data: gs }]) => {
      setProfile(p); setGrowth(g); setGenome(gs); setLoading(false)
    })
  }, [user?.id])

  const target    = profile?.target_posisi || 'Target Karier Kamu'
  const readiness = growth?.progress_percent || profile?.career_readiness || 0
  const gapPct    = Math.max(0, 100 - readiness)
  const gaps      = (profile?.skill_gaps || profile?.gap_skills || []).slice(0, 4)
  const gpsSteps  = buildGpsSteps(profile?.gps_steps, gaps, target)
  const mentorMsg = profile?.mentor_message
    || `Berdasarkan hasil analisisku, target ${target} sangat realistis untuk kamu capai. Yang paling penting sekarang bukan belajar lebih banyak, tetapi belajar hal yang tepat dalam urutan yang tepat. Career GPS Premium akan menunjukkan langkah tersebut secara spesifik untuk profilmu.`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, backdropFilter: 'blur(3px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#0d1710',
        border: '1px solid rgba(37,211,102,0.18)',
        borderRadius: '22px 22px 0 0',
        zIndex: 1001,
        maxHeight: '92vh', overflowY: 'auto',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 16,
          background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.45)',
          width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        <div style={{ padding: '12px 20px 40px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🚀</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px', marginBottom: 4 }}>
              Buka Career GPS Premium
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Kamu sudah mengetahui DNA Karier dan posisi kamu saat ini.<br/>
              Sekarang saatnya mendapatkan panduan yang jelas.
            </div>
          </div>

          {/* ── Ringkasan Profil ── */}
          {!loading && (
            <div style={{ background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.18)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.78rem', marginBottom: 10 }}>🎯 Ringkasan Profil Kamu</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ color: '#25D366', fontWeight: 800, fontSize: '0.72rem' }}>{target}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', marginTop: 2 }}>Target Karier</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ color: '#34B7F1', fontWeight: 800, fontSize: '0.88rem' }}>{readiness}%</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', marginTop: 2 }}>Career Readiness</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ color: '#FFB74D', fontWeight: 800, fontSize: '0.88rem' }}>{gapPct}%</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', marginTop: 2 }}>Gap yang Ditutup</div>
                </div>
              </div>
              {gaps.length > 0 && (
                <>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', marginBottom: 6, letterSpacing: '0.5px' }}>HAMBATAN TERBESAR:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {gaps.map((g, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
                        <span style={{ color: '#EF5350', fontWeight: 700, fontSize: '0.72rem' }}>❌</span> {g}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Feature Cards ── */}
          {[
            { icon: '🗺️', title: 'Career GPS Personal', points: [
              'Roadmap disusun berdasarkan target, pengalaman, dan genome kamu',
              '✓ Langkah apa yang harus dilakukan sekarang',
              '✓ Skill yang paling penting dipelajari',
              '✓ Prioritas yang memberikan dampak terbesar',
              '✓ Urutan belajar yang tepat',
            ]},
            { icon: '💬', title: 'Diah Anna AI Mentor', points: [
              'Mentor karier yang memahami dan mengingat profilmu',
              '✓ Chat tanpa batas',
              '✓ Konsultasi kapan saja',
              '✓ Jawaban sesuai kondisi dan tujuan kariermu',
              '✓ Mengingat perjalanan dan progresmu',
            ]},
            { icon: '📈', title: 'Progress Tracking', points: [
              'Jangan lagi belajar tanpa arah.',
              '✓ Pantau Career Readiness Score',
              '✓ Lihat perkembangan mingguan',
              '✓ Tracking milestone yang sudah dicapai',
              '✓ Tetap fokus pada target',
            ]},
            { icon: '💼', title: 'Opportunity Matching', points: [
              'Peluang yang sesuai dengan DNA dan tujuan kariermu.',
              '✓ Rekomendasi yang lebih relevan',
              '✓ Fokus pada peluang yang cocok',
              '✓ Tidak perlu mencari dari nol',
            ]},
          ].map((card, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '13px', marginBottom: 10 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>{card.icon} {card.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {card.points.map((p, j) => (
                  <div key={j} style={{ fontSize: '0.78rem', color: p.startsWith('✓') ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{p}</div>
                ))}
              </div>
            </div>
          ))}

          {/* ── GPS Preview ── */}
          <div style={{ background: 'rgba(52,183,241,0.06)', border: '1px solid rgba(52,183,241,0.18)', borderRadius: 12, padding: '13px', marginBottom: 14 }}>
            <div style={{ color: '#34B7F1', fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>Preview Roadmap Kamu</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gpsSteps.map((step, i) => {
                const isFree = step.free !== undefined ? step.free : i < 2
                const isDone = step.done
                const label  = step.label || step.title || `Langkah ${i+1}`
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? '#25D366' : isFree ? 'rgba(52,183,241,0.2)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.62rem', fontWeight: 700,
                      color: isDone ? '#fff' : isFree ? '#34B7F1' : 'rgba(255,255,255,0.15)',
                    }}>
                      {isDone ? '✓' : isFree ? i+1 : '🔒'}
                    </span>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: isDone ? '#25D366' : isFree ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.18)',
                      filter: !isFree ? 'blur(3.5px)' : 'none',
                      userSelect: !isFree ? 'none' : 'auto',
                    }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Pesan Diah Anna ── */}
          <div style={{ background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.18)', borderRadius: 12, padding: '13px', marginBottom: 20, display: 'flex', gap: 10 }}>
            <img src="/diah-anna.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.72rem', marginBottom: 5 }}>Pesan dari Diah Anna</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.65 }}>{mentorMsg}</div>
            </div>
          </div>

          {/* ── Pricing ── */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 3 }}>
              <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.82rem', textDecoration: 'line-through' }}>Rp599.000/bln</span>
              <span style={{ background: '#EF5350', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>HEMAT 67%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <span style={{ color: '#FFB74D', fontWeight: 900, fontSize: '1.6rem' }}>Rp199.000</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>/bulan</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: 2 }}>Semua fitur premium · Unlimited · Batalkan kapan saja</div>
          </div>

          {/* ── CTAs ── */}
          <a
            href={PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%', padding: '15px', marginBottom: 10,
              background: 'linear-gradient(135deg,#25D366,#128C7E)',
              color: '#fff', fontWeight: 800, fontSize: '1rem',
              borderRadius: 14, textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 20px rgba(37,211,102,0.42)',
            }}>
            🚀 Buka Career GPS Saya
          </a>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.85rem',
              borderRadius: 12, cursor: 'pointer',
            }}>
            Lanjutkan Versi Gratis
          </button>

          {/* ── Redeem Code ── */}
          {!redeemDone ? (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              {!showRedeem ? (
                <button
                  onClick={() => setShowRedeem(true)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  Sudah punya kode redeem?
                </button>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', textAlign: 'left' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: 8 }}>Masukkan kode redeem (12 karakter)</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={redeemCode}
                      onChange={e => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(null) }}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={12}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 9,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)', color: '#fff',
                        fontSize: '0.95rem', fontFamily: 'monospace', letterSpacing: 2,
                        outline: 'none',
                      }}
                    />
                    <button
                      disabled={redeemCode.length < 12 || redeemLoading}
                      onClick={async () => {
                        if (!user?.id) return
                        setRedeemLoading(true); setRedeemMsg(null)
                        try {
                          const data = await postJson('/api/redeem-code', { code: redeemCode })
                          if (data.success) {
                            setRedeemDone(true)
                            setRedeemMsg({ type: 'ok', text: '🎉 Premium aktif 30 hari! Halaman akan refresh otomatis...' })
                            setTimeout(() => window.location.reload(), 1500)
                          } else {
                            setRedeemMsg({ type: 'err', text: data.error || 'Kode tidak valid' })
                          }
                        } catch {
                          setRedeemMsg({ type: 'err', text: 'Koneksi bermasalah, coba lagi.' })
                        }
                        setRedeemLoading(false)
                      }}
                      style={{
                        padding: '10px 16px', borderRadius: 9,
                        background: redeemCode.length < 12 ? 'rgba(37,211,102,0.2)' : 'linear-gradient(135deg,#25D366,#128C7E)',
                        color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                        border: 'none', cursor: redeemCode.length < 12 ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {redeemLoading ? '⏳' : 'Aktifkan'}
                    </button>
                  </div>
                  {redeemMsg && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: redeemMsg.type === 'ok' ? '#25D366' : '#EF5350', fontWeight: 600 }}>
                      {redeemMsg.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 16, padding: '14px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>🎉</div>
              <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.9rem' }}>Premium berhasil diaktifkan!</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: 4 }}>Berlaku 30 hari. Refresh halaman untuk mulai.</div>
              <button onClick={() => window.location.reload()} style={{ marginTop: 10, padding: '9px 20px', borderRadius: 9, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer' }}>
                Refresh Sekarang
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
