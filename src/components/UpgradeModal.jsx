// src/components/UpgradeModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PAYMENT_URL = 'http://lynk.id/yudadunya/r3o5ldq5qkex/checkout'
const PROMO_DURATION_MS = 24 * 60 * 60 * 1000 // 24 jam dalam millisecond

// Langkah-langkah perjalanan self-care bersama Diah Anna
function buildJourneySteps(profile) {
  const nama = profile?.nama ? profile.nama : 'kamu'

  return [
    { label: 'Kenalan sama Diah Anna',             done: true,  free: true  },
    { label: 'Mulai cerita, didengarkan tanpa syarat', done: true,  free: true  },
    { label: 'Lihat pola emosi & diri kamu',       done: false, free: false },
    { label: 'Jurnal refleksi harian',              done: false, free: false },
    { label: 'Rekomendasi aktivitas personal',      done: false, free: false },
    { label: 'Chat tanpa batas, kapan saja',        done: false, free: false },
  ]
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}j ${minutes}m ${seconds}d`
}

export default function UpgradeModal({ user, onClose, initialData = null }) {
  const [profile,  setProfile]  = useState(initialData?.profile  || null)
  const [loading,  setLoading]  = useState(!initialData)

  // Redeem code state
  const [showRedeem,    setShowRedeem]    = useState(false)
  const [redeemCode,    setRedeemCode]    = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemMsg,     setRedeemMsg]     = useState(null) // { type: 'ok'|'err', text }
  const [redeemDone,    setRedeemDone]    = useState(false)

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(24 * 60 * 60 * 1000)
  const [isPromoActive, setIsPromoActive] = useState(true)

  useEffect(() => {
    if (initialData?.profile) { setLoading(false); return }
    if (!user?.id) { setLoading(false); return }
    supabase.from('user_career_profiles').select('nama').eq('user_id', user.id).maybeSingle()
      .then(({ data: p }) => { setProfile(p); setLoading(false) })
  }, [user?.id])

  // Promo timer berdasarkan created_at akun (bukan localStorage)
  useEffect(() => {
    if (!user?.created_at) {
      setIsPromoActive(false)
      return
    }
    const startTime = new Date(user.created_at).getTime()
    const updateTimer = () => {
      const remaining = Math.max(0, PROMO_DURATION_MS - (Date.now() - startTime))
      setTimeRemaining(remaining)
      setIsPromoActive(remaining > 0)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [user?.created_at])

  const journeySteps     = buildJourneySteps(profile)
  const nama             = profile?.nama || ''
  const diahAnnaMsg      = `${nama ? `${nama}, ` : ''}kamu sudah ambil langkah pertama yang berani dengan mau cerita. Aku mau terus ada buat kamu — dengerin tanpa batas, bantu kamu makin kenal diri sendiri, dan menemani hari-hari yang berat maupun ringan. Ini yang bisa kita lakuin bareng kalau kamu mau lanjut.`
  const discountPct      = Math.round(((599000 - 99000) / 599000) * 100)
  const timeFormatted    = formatTimeRemaining(timeRemaining)

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
        background: '#14101B',
        border: '1px solid rgba(139,92,246,0.18)',
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
          width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        <div style={{ padding: '12px 20px 40px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>💜</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px', marginBottom: 4 }}>
              Lanjutkan Perjalananmu Bersama Diah Anna
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Kamu sudah mulai cerita. Sekarang saatnya<br/>
              didengarkan tanpa batas, kapan pun kamu butuh.
            </div>
          </div>

          {/* ── Journey Steps ── */}
          <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: '14px', marginBottom: 18 }}>
            <div style={{ color: '#C4B5FD', fontWeight: 700, fontSize: '0.78rem', marginBottom: 12 }}>🗺️ Perjalananmu Bersama Diah Anna</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {journeySteps.map(({ label, done, free }, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: '1.1rem', opacity: done ? 1 : free ? 0.6 : 0.3 }}>
                      {done ? '✅' : free ? '⭕' : '🔒'}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      color: done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                      fontWeight: done ? 600 : 400,
                      filter: !free && !done ? 'blur(3px)' : 'none',
                    }}>{label}</span>
                    {free && !done && (
                      <span style={{ fontSize: '0.6rem', color: '#C4B5FD', fontWeight: 700, background: 'rgba(139,92,246,0.15)', padding: '2px 6px', borderRadius: 4 }}>GRATIS</span>
                    )}
                  </div>
                  {i < journeySteps.length - 1 && (
                    <div style={{ marginLeft: 7, height: 18, width: 2, background: 'rgba(139,92,246,0.25)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Pesan Diah Anna ── */}
          <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12, padding: '13px', marginBottom: 20, display: 'flex', gap: 10 }}>
            <img src="/diah-anna.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#C4B5FD', fontWeight: 700, fontSize: '0.72rem', marginBottom: 5 }}>Pesan dari Diah Anna</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.65 }}>{diahAnnaMsg}</div>
            </div>
          </div>

          {/* ── Pricing ── */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            {isPromoActive && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,183,77,0.2), rgba(251,113,133,0.15))',
                border: '1px solid rgba(255,183,77,0.4)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ fontSize: '0.95rem' }}>⏰</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFB74D' }}>
                  HARGA SPESIAL BERAKHIR DALAM {timeFormatted}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 3 }}>
              <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.82rem', textDecoration: 'line-through' }}>Rp599.000</span>
              {isPromoActive
                ? <span style={{ background: '#EF5350', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>HEMAT {discountPct}%</span>
                : <span style={{ background: 'rgba(239,83,80,0.2)', color: '#EF5350', fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(239,83,80,0.3)' }}>PROMO BERAKHIR</span>
              }
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
              <span style={{ color: isPromoActive ? '#FFB74D' : '#EF5350', fontWeight: 900, fontSize: '1.6rem' }}>
                Rp{isPromoActive ? '99.000' : '599.000'}
              </span>
              <span style={{
                background: isPromoActive ? 'rgba(255,183,77,0.15)' : 'rgba(239,83,80,0.15)',
                color: isPromoActive ? '#FFB74D' : '#EF5350',
                fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                border: isPromoActive ? '1px solid rgba(255,183,77,0.3)' : '1px solid rgba(239,83,80,0.3)',
              }}>
                SEKALI BAYAR
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: 4 }}>
              {isPromoActive ? 'Akses penuh 30 hari · Tidak ada biaya tersembunyi · Bukan langganan' : 'Harga normal berlaku'}
            </div>
          </div>

          {/* ── CTAs ── */}
          <a
            href={PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%', padding: '15px', marginBottom: 10,
              background: 'linear-gradient(135deg, #8B5CF6, #FB7185)',
              color: '#fff', fontWeight: 800, fontSize: '1rem',
              borderRadius: 14, textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 20px rgba(139,92,246,0.42)',
            }}>
            💜 Ya, Lanjutkan Bersama Diah Anna
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
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
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
                          const res  = await fetch('/api/utils?action=redeem', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: redeemCode, userId: user.id }),
                          })
                          const data = await res.json()
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
                        background: redeemCode.length < 12 ? 'rgba(139,92,246,0.2)' : 'linear-gradient(135deg,#8B5CF6,#FB7185)',
                        color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                        border: 'none', cursor: redeemCode.length < 12 ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}>
                      {redeemLoading ? '⏳' : 'Aktifkan'}
                    </button>
                  </div>
                  {redeemMsg && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: redeemMsg.type === 'ok' ? '#C4B5FD' : '#EF5350', fontWeight: 600 }}>
                      {redeemMsg.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 16, padding: '14px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>🎉</div>
              <div style={{ color: '#C4B5FD', fontWeight: 700, fontSize: '0.9rem' }}>Premium berhasil diaktifkan!</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: 4 }}>Berlaku 30 hari. Refresh halaman untuk mulai.</div>
              <button onClick={() => window.location.reload()} style={{ marginTop: 10, padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#8B5CF6,#FB7185)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer' }}>
                Refresh Sekarang
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
