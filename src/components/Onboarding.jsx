import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const POSITIONS = [
  'Fresh Graduate', 'Staff / Junior', 'Supervisor / Senior',
  'Manager', 'Masih Kuliah', 'Freelancer / Wirausaha',
]

const TARGETS = [
  'Naik jabatan', 'Pindah perusahaan', 'Ganti industri',
  'Naikkan gaji', 'Cari kerja pertama', 'Bangun personal brand',
]

const SALARY_RANGES = [
  'Di bawah 5 juta', '5 – 8 juta', '8 – 12 juta',
  '12 – 20 juta', '20 – 35 juta', 'Di atas 35 juta',
]

export default function Onboarding({ onDone, user }) {
  const [step, setStep]         = useState(0)
  const [nama, setNama]         = useState('')
  const [posisi, setPosisi]     = useState('')
  const [target, setTarget]     = useState('')
  const [salary, setSalary]     = useState('')
  const [cvText, setCvText]     = useState('')
  const [cvName, setCvName]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)
  const fileRef                 = useRef()

  const handleCV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setCvName(file.name)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.text) setCvText(data.text)
    } catch (e) {
      console.warn('CV parse failed:', e)
    }
    setUploading(false)
  }

  const handleDone = async () => {
    setSaving(true)
    try {
      if (user?.id) {
        // Simpan data awal ke user_career_profiles
        const profileData = {
          user_id: user.id,
          nama: nama.trim() || null,
          posisi_saat_ini: posisi || null,
          target_posisi: target || null,
          target_gaji: salary || null,
          summary: [
            nama && `Nama: ${nama}.`,
            posisi && `Posisi saat ini: ${posisi}.`,
            target && `Goal karir: ${target}.`,
            salary && `Target gaji: ${salary}.`,
            cvText && `CV sudah diupload.`,
          ].filter(Boolean).join(' '),
          sesi_count: 0,
          last_updated: new Date().toISOString(),
        }
        await supabase.from('user_career_profiles').upsert(profileData, { onConflict: 'user_id' })

        // Kalau ada CV, trigger ekstraksi profil background
        if (cvText && user.id) {
          fetch('/api/extract-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              messages: [{ role: 'user', content: `Ini CV saya:\n\n${cvText.slice(0, 3000)}` }],
            }),
          }).catch(() => {})
        }
      }
    } catch (e) {
      console.warn('Onboarding save error:', e)
    }
    setSaving(false)
    onDone({ nama, posisi, target, salary, cvText })
  }

  const canNext = [
    nama.trim().length > 0,      // step 0
    posisi && target,            // step 1
    true,                        // step 2 — CV optional, bisa skip
  ]

  // ── Styles ─────────────────────────────────────
  const overlay = {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(7,94,84,0.97)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px 24px',
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  }
  const chip = (selected, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontSize: '0.82rem', fontWeight: 600,
      background: selected ? '#25D366' : 'rgba(255,255,255,0.08)',
      color: selected ? '#fff' : 'rgba(255,255,255,0.65)',
      transition: 'all 0.15s',
    }}>{label}</button>
  )

  return (
    <div style={overlay}>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: i === step ? 22 : 6, height: 6, borderRadius: 3,
            background: i <= step ? '#25D366' : 'rgba(255,255,255,0.15)',
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
                border: '3px solid rgba(37,211,102,0.5)' }} />
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem',
              textAlign: 'center', marginBottom: 8, letterSpacing: '-0.3px' }}>
              Halo! Aku Diah Anna 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem',
              textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
              AI Career Mentor kamu. Biar aku bisa bantu lebih personal, kenalan dulu yuk!
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
                  width: '100%', background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
                  padding: '13px 16px', color: '#fff', fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          </>
        )}

        {/* ── STEP 1: Posisi & Target ── */}
        {step === 1 && (
          <>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem',
              marginBottom: 6, letterSpacing: '-0.3px' }}>
              Posisi kamu sekarang?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
              Pilih yang paling mendekati
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {POSITIONS.map(p => chip(posisi === p, () => setPosisi(p), p))}
            </div>

            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem',
              marginBottom: 6, letterSpacing: '-0.3px' }}>
              Goal karir kamu?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
              Boleh pilih lebih dari satu
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {TARGETS.map(t => chip(target === t, () => setTarget(t), t))}
            </div>
          </>
        )}

        {/* ── STEP 2: CV + Gaji ── */}
        {step === 2 && (
          <>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem',
              marginBottom: 6, letterSpacing: '-0.3px' }}>
              Upload CV kamu <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500, fontSize: '0.9rem' }}>(opsional)</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.5 }}>
              Aku langsung analisis dan jadi lebih personal. Bisa skip kalau belum punya.
            </p>

            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx"
              onChange={handleCV} style={{ display: 'none' }} />

            <button onClick={() => fileRef.current.click()} style={{
              width: '100%', background: cvName ? 'rgba(37,211,102,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px dashed ${cvName ? '#25D366' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 12, padding: '14px', color: cvName ? '#25D366' : 'rgba(255,255,255,0.5)',
              fontSize: '0.85rem', cursor: 'pointer', marginBottom: 20, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {uploading ? '⏳ Membaca CV...' : cvName ? `✅ ${cvName}` : '📎 Upload CV (PDF/Word)'}
            </button>

            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem',
              marginBottom: 6, letterSpacing: '-0.3px' }}>
              Target gaji kamu? <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500, fontSize: '0.9rem' }}>(opsional)</span>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {SALARY_RANGES.map(s => chip(salary === s, () => setSalary(s), s))}
            </div>
          </>
        )}

        {/* CTA Button */}
        <button
          onClick={() => step < 2 ? setStep(s => s + 1) : handleDone()}
          disabled={!canNext[step] || saving || uploading}
          style={{
            width: '100%', padding: '14px', marginTop: 24,
            background: canNext[step] ? 'linear-gradient(135deg, #25D366, #128C7E)' : 'rgba(255,255,255,0.1)',
            color: canNext[step] ? '#fff' : 'rgba(255,255,255,0.3)',
            fontWeight: 700, fontSize: '0.95rem', borderRadius: 14, border: 'none',
            cursor: canNext[step] ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}>
          {saving ? 'Menyimpan...' : step < 2 ? 'Lanjut →' : 'Mulai ngobrol dengan Diah Anna!'}
        </button>

        {/* Skip — hanya step 1 dan 2 */}
        {step > 0 && (
          <button onClick={() => step < 2 ? setStep(s => s + 1) : handleDone()}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
              fontSize: '0.78rem', marginTop: 12, cursor: 'pointer', width: '100%' }}>
            {step === 2 ? 'Lewati, mulai tanpa CV' : 'Lewati langkah ini'}
          </button>
        )}
      </div>
    </div>
  )
}
