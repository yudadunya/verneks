// src/pages/AdminPanel.jsx
import { useState } from 'react'

// KEAMANAN: tidak ada lagi Service Role Key atau password di sisi client.
// Semua operasi admin lewat /api/utils?action=admin yang verifikasi password di server setiap request.
async function adminCall(password, action, extra = {}) {
  const res = await fetch('/api/utils?action=admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, ...extra }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal memproses.')
  return data
}

export default function AdminPanel() {
  const [authed,    setAuthed]    = useState(false)
  const [password,  setPassword]  = useState('') // disimpan di state, dikirim ulang tiap request
  const [passInput, setPassInput] = useState('')
  const [passErr,   setPassErr]   = useState('')
  const [codes,     setCodes]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [copied,    setCopied]    = useState(null)
  const [genCount,  setGenCount]  = useState(1)

  const handleLogin = async () => {
    setPassErr('')
    setLoading(true)
    try {
      const data = await adminCall(passInput, 'list')
      setCodes(data.codes || [])
      setPassword(passInput) // simpan password tervalidasi untuk request berikutnya
      setAuthed(true)
    } catch (e) {
      setPassErr(e.message === 'Password salah.' ? 'Password salah' : e.message)
    }
    setLoading(false)
  }

  const loadCodes = async () => {
    setLoading(true)
    try {
      const data = await adminCall(password, 'list')
      setCodes(data.codes || [])
    } catch (e) {
      setPassErr(e.message)
      setAuthed(false) // password mungkin sudah tidak valid (misal diganti)
    }
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenLoading(true)
    try {
      const data = await adminCall(password, 'generate', { count: genCount })
      setCodes(data.codes || [])
    } catch (e) {
      setPassErr(e.message)
    }
    setGenLoading(false)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const s = {
    page:    { minHeight: '100vh', background: '#0a0f0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20 },
    card:    { background: '#111a14', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480 },
    title:   { color: '#25D366', fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 },
    sub:     { color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginBottom: 20 },
    input:   { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
    btn:     { width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', marginTop: 10 },
    btnSm:   { padding: '8px 16px', borderRadius: 8, background: 'rgba(37,211,102,0.15)', color: '#25D366', fontWeight: 700, fontSize: '0.8rem', border: '1px solid rgba(37,211,102,0.3)', cursor: 'pointer' },
    row:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 },
    code:    { fontFamily: 'monospace', fontSize: '0.9rem', letterSpacing: 2, color: '#fff', fontWeight: 700 },
    used:    { fontSize: '0.7rem', color: '#EF5350', fontWeight: 600 },
    unused:  { fontSize: '0.7rem', color: '#25D366', fontWeight: 600 },
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>🔐 Verneks Admin</div>
        <div style={s.sub}>Masukkan password admin untuk melanjutkan</div>
        <input
          style={{ ...s.input, borderColor: passErr ? '#EF5350' : 'rgba(255,255,255,0.1)' }}
          type="password"
          placeholder="Password admin"
          value={passInput}
          onChange={e => { setPassInput(e.target.value); setPassErr('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        {passErr && <div style={{ color: '#EF5350', fontSize: '0.75rem', marginTop: 6 }}>{passErr}</div>}
        <button style={s.btn} onClick={handleLogin} disabled={loading}>
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </div>
    </div>
  )

  // ── Admin panel ───────────────────────────────────────────────────────────
  const unused = codes.filter(c => !c.used_by).length
  const used   = codes.filter(c =>  c.used_by).length

  return (
    <div style={{ ...s.page, alignItems: 'flex-start', paddingTop: 40 }}>
      <div style={{ ...s.card, maxWidth: 520 }}>
        <div style={s.title}>⚡ Generate Redeem Code</div>
        <div style={s.sub}>Kode premium 30 hari · {unused} tersedia · {used} terpakai</div>

        {/* Generate */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <select
            value={genCount}
            onChange={e => setGenCount(Number(e.target.value))}
            style={{ ...s.input, width: 'auto', padding: '10px 12px' }}
          >
            {[1,2,3,5,10].map(n => <option key={n} value={n}>{n} kode</option>)}
          </select>
          <button style={{ ...s.btnSm, flex: 1 }} onClick={handleGenerate} disabled={genLoading}>
            {genLoading ? '⏳ Membuat...' : '✨ Generate Kode'}
          </button>
          <button style={{ ...s.btnSm }} onClick={loadCodes} disabled={loading}>🔄</button>
        </div>

        {passErr && <div style={{ color: '#EF5350', fontSize: '0.78rem', marginBottom: 12 }}>{passErr}</div>}

        {/* List kode */}
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 20 }}>Memuat...</div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {codes.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>
                Belum ada kode. Generate dulu!
              </div>
            )}
            {codes.map(c => (
              <div key={c.code} style={s.row}>
                <div>
                  <div style={s.code}>{c.code}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                    {new Date(c.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {c.used_by
                    ? <span style={s.used}>✕ Terpakai</span>
                    : <span style={s.unused}>✓ Tersedia</span>
                  }
                  {!c.used_by && (
                    <button
                      style={{ ...s.btnSm, fontSize: '0.72rem', padding: '5px 10px' }}
                      onClick={() => copyCode(c.code)}
                    >
                      {copied === c.code ? '✓ Disalin!' : 'Salin'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
