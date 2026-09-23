import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Topik yang mungkin ingin diceritakan
const TOPICS = [
  'Kerjaan & tekanan', 'Hubungan & keluarga', 'Perasaan yang menumpuk',
  'Cemas & overthinking', 'Kesepian', 'Belum tahu, mau curhat aja',
]

// Kapan biasanya butuh curhat
const WHEN = [
  'Malam hari', 'Kapan saja', 'Saat lagi stres',
  'Pas sendiri', 'Kalau sulit tidur',
]

export default function Onboarding({ onDone, user }) {
  const [step, setStep]     = useState(0)
  const [nama, setNama]     = useState('')
  const [topic, setTopic]   = useState('')
  const [when, setWhen]     = useState('')
  const [saving, setSaving] = useState(false)

  const handleDone = async () => {
    setSaving(true)
    try {
      if (user?.id) {
        // Simpan nama & preferensi dasar ke user_career_profiles
        // (tabel ini tetap dipakai sebagai user profile storage)
        const profileData = {
          user_id:      user.id,
          nama:         nama.trim() || null,
          summary:      [
            nama && `Nama: ${nama}.`,
            topic && `Topik yang ingin diceritakan: ${topic}.`,
            when  && `Biasanya butuh curhat: ${when}.`,
          ].filter(Boolean).join(' '),
          sesi_count:   0,
          last_updated: new Date().toISOString(),
        }
        await supabase.from('user_career_profiles').upsert(profileData, { onConflict: 'user_id' })
      }
    } catch (e) {
      console.warn('Onboarding save error:', e)
    }
    setSaving(false)
    onDone({ nama, topic, when })
  }

  const canNext = [
    nama.trim().length > 0, // step 0
    true,                    // step 1 — topik opsional
  ]

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(20,16,27,0.97)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px 24px',
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  }

  const chip = (selected, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontSize: '0.82rem', fontWeight: 600,
      background: selected ? 'linear-gradient(135deg,#8B5CF6,#FB7185)' : 'rgba(255,255,255,0.08)',
      color: selected ? '#fff' : 'rgba(255,255,255,0.65)',
      transition: 'all 0.15s',
    }}>{label}</button>
  )

  return (
    <div style={overlay}>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            width: i === step ? 22 : 6, height: 6, borderRadius: 3,
            background: i <= step ? '#8B5CF6' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 340 }}>

        {/* ── STEP 0: Nama ── */}
        {step === 0 && (
          <>
            <img src="/diah-anna.png" alt="Diah Anna"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                margin: '0 auto 16px', display: 'block',
                border: '3px solid rgba(139,92,246,0.5)' }} />
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem',
              textAlign: 'center', marginBottom: 8, letterSpacing: '-0.3px' }}>
              Halo! Aku Diah Anna 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem',
              textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
              Teman ngobrol AI kamu. Cerita apa aja ke aku — aku dengerin, tanpa ngehakimin.
            </p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem',
                fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                NAMA PANGGILAN KAMU
              </label>
              <input
                autoFocus
                value={nama}
                onChange={e => setNama(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nama.trim() && setStep(1)}
                placeholder="Contoh: Budi, Sari, Yuda..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                  padding: '13px 16px', color: '#fff', fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          </>
        )}

        {/* ── STEP 1: Preferensi curhat (opsional) ── */}
        {step === 1 && (
          <>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem',
              marginBottom: 6, letterSpacing: '-0.3px' }}>
              Biasanya mau cerita soal apa, {nama}?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
              Opsional — bisa skip kalau belum tahu
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {TOPICS.map(t => chip(topic === t, () => setTopic(topic === t ? '' : t), t))}
            </div>

            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem',
              marginBottom: 6, letterSpacing: '-0.3px' }}>
              Kapan biasanya butuh ngobrol?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
              Biar Diah Anna bisa lebih siap buat kamu
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {WHEN.map(w => chip(when === w, () => setWhen(when === w ? '' : w), w))}
            </div>
          </>
        )}

        {/* CTA Button */}
        <button
          onClick={() => step < 1 ? setStep(s => s + 1) : handleDone()}
          disabled={!canNext[step] || saving}
          style={{
            width: '100%', padding: '14px', marginTop: 24,
            background: canNext[step] ? 'linear-gradient(135deg, #8B5CF6, #FB7185)' : 'rgba(255,255,255,0.1)',
            color: canNext[step] ? '#fff' : 'rgba(255,255,255,0.3)',
            fontWeight: 700, fontSize: '0.95rem', borderRadius: 14, border: 'none',
            cursor: canNext[step] ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}>
          {saving ? 'Menyimpan...' : step < 1 ? 'Lanjut →' : 'Yuk, mulai ngobrol! 💜'}
        </button>

        {/* Skip — step 1 saja */}
        {step === 1 && (
          <button onClick={handleDone}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
              fontSize: '0.78rem', marginTop: 12, cursor: 'pointer', width: '100%' }}>
            Lewati, langsung ke Diah Anna
          </button>
        )}
      </div>
    </div>
  )
}
