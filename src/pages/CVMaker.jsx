import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'

const FORMATS = [
  {
    id: 'ats',
    label: 'ATS Friendly',
    icon: '🎯',
    desc: 'Lolos filter Workday, Taleo, Greenhouse',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    border: '#bae6fd',
    tag: 'Untuk perusahaan besar & MNC',
  },
  {
    id: 'jobstreet',
    label: 'JobStreet',
    icon: '💼',
    desc: 'Optimal untuk platform lokal Indonesia',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    tag: 'Untuk job portal lokal',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '🔗',
    desc: 'Personal branding yang menarik recruiter',
    color: '#0077b5',
    bg: '#eff6ff',
    border: '#bfdbfe',
    tag: 'Untuk networking & headhunter',
  },
]

const DIFF = {
  ats: {
    bullets: ['Keyword-optimized untuk ATS scanner', 'Action verbs + angka di setiap bullet', 'Struktur section standar industri', 'Bebas tabel & grafis yang block parser'],
  },
  jobstreet: {
    bullets: ['Ringkasan karir yang personal & hangat', 'Info gaji & ketersediaan kerja', 'Bahasa Indonesia profesional lokal', 'Format yang familiar untuk HRD lokal'],
  },
  linkedin: {
    bullets: ['Headline formula yang menarik klik', 'About section storytelling 1.300 karakter', 'Experience dengan impact metrics', 'Bahasa Inggris untuk reach global'],
  },
}

export default function CVMaker({ user }) {
  const { plan, usage, canUse, getRemainingUses, trackUsage, loading: subLoading } = useSubscription(user?.id)

  const [mode, setMode] = useState('scratch')
  const [format, setFormat] = useState('ats')
  const [jobTarget, setJobTarget] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '', experience: '', education: '', skills: '', extra: '' })
  const [cvText, setCvText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savingPdf, setSavingPdf] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState(null)
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const selectedFmt = FORMATS.find(f => f.id === format)

  const handleFileUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      return setError('Format tidak didukung. Gunakan PDF atau Word (.docx).')
    }
    setUploading(true)
    setError(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileName: file.name }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCvText(data.text)
      setFileName(file.name)
    } catch (e) {
      setError(e.message || 'Gagal membaca file.')
    }
    setUploading(false)
  }

  const handleGenerate = async () => {
    if (mode === 'optimize' && !cvText.trim()) return setError('Paste CV kamu dulu ya.')
    if (mode === 'scratch' && !form.name.trim()) return setError('Isi nama dulu ya.')
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/cv-maker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, format, jobTarget, cvText: mode === 'optimize' ? cvText : undefined, formData: mode === 'scratch' ? form : undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result)
      await trackUsage('cv_maker')
    } catch (e) {
      setError(e.message || 'Waduh, ada error. Coba lagi ya.')
    }
    setLoading(false)
  }

  const handleSavePdf = async () => {
    setSavingPdf(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({
        margin: 16,
        filename: `LamarCerdas-${format.toUpperCase()}-${new Date().toLocaleDateString('id-ID')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(resultRef.current).save()
    } catch { alert('Gagal export PDF.') }
    setSavingPdf(false)
  }

  if (subLoading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)' }}>Memuat...</div>
  if (!user) { window.location.href = '/register'; return null }
  if (!canUse('cv_maker') && !result && !loading) return (
    <FeatureGate canUse={false} feature="cv_maker" plan={plan} user={user} />
  )

  return (
    <main style={s.page}>
      {/* Subtle background texture */}
      <div style={s.bgGrid} />

      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.badge}>CV MAKER AI</div>
            <h1 style={s.title}>Buat CV yang<br /><span style={s.titleAccent}>benar-benar berbeda</span></h1>
            <p style={s.sub}>Dari nol atau optimasi CV lama — ATS-ready, JobStreet-ready, atau LinkedIn-ready dalam 30 detik.</p>
          </div>
          <div style={s.usagePill}>
            <span style={s.usageDot} />
            <span>Sisa <strong>{getRemainingUses('cv_maker')}x</strong> bulan ini</span>
          </div>
        </div>

        {/* Format selector */}
        <div style={s.formatRow}>
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)} style={{ ...s.formatCard, ...(format === f.id ? { ...s.formatCardActive, borderColor: f.color, background: f.bg } : {}) }}>
              <div style={s.formatTop}>
                <span style={s.formatIcon}>{f.icon}</span>
                <span style={{ ...s.formatDot, background: format === f.id ? f.color : '#e5e7eb' }} />
              </div>
              <div style={{ ...s.formatName, color: format === f.id ? f.color : '#374151' }}>{f.label}</div>
              <div style={s.formatTag}>{f.tag}</div>
              <div style={s.formatDesc}>{f.desc}</div>
              {format === f.id && (
                <ul style={s.formatBullets}>
                  {DIFF[f.id].bullets.map((b, i) => (
                    <li key={i} style={{ ...s.formatBulletItem, color: f.color }}>
                      <span style={{ color: f.color, marginRight: '6px' }}>✓</span>{b}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>

        <div style={s.layout}>
          {/* Left: Input */}
          <div style={s.inputPanel}>
            {/* Mode toggle */}
            <div style={s.modeRow}>
              <button style={{ ...s.modeBtn, ...(mode === 'scratch' ? { ...s.modeBtnOn, borderColor: selectedFmt.color, color: selectedFmt.color } : {}) }} onClick={() => setMode('scratch')}>
                <span>📝</span> Dari Scratch
              </button>
              <button style={{ ...s.modeBtn, ...(mode === 'optimize' ? { ...s.modeBtnOn, borderColor: selectedFmt.color, color: selectedFmt.color } : {}) }} onClick={() => setMode('optimize')}>
                <span>⚡</span> Optimasi CV Lama
              </button>
            </div>

            {/* Job target */}
            <div style={s.field}>
              <label style={s.label}>Target Posisi <span style={s.opt}>opsional</span></label>
              <input style={s.input} placeholder="Contoh: Product Manager di startup fintech" value={jobTarget} onChange={e => setJobTarget(e.target.value)} />
            </div>

            {mode === 'scratch' && (
              <>
                <div style={s.twoCol}>
                  <div style={s.field}>
                    <label style={s.label}>Nama Lengkap <span style={s.req}>*</span></label>
                    <input style={s.input} placeholder="Budi Santoso" value={form.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Lokasi</label>
                    <input style={s.input} placeholder="Jakarta Selatan" value={form.location} onChange={e => setField('location', e.target.value)} />
                  </div>
                </div>
                <div style={s.twoCol}>
                  <div style={s.field}>
                    <label style={s.label}>Email</label>
                    <input style={s.input} type="email" placeholder="budi@email.com" value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>No. HP</label>
                    <input style={s.input} placeholder="0812-xxxx-xxxx" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Pengalaman Kerja</label>
                  <textarea style={s.textarea} rows={5} value={form.experience} onChange={e => setField('experience', e.target.value)}
                    placeholder={'PT Maju Jaya (2021–2024) – Marketing Manager\n• Meningkatkan penjualan 40% dalam 6 bulan\n• Mengelola tim 8 orang\n\nFresh graduate? Kosongkan saja.'} />
                </div>
                <div style={s.twoCol}>
                  <div style={s.field}>
                    <label style={s.label}>Pendidikan</label>
                    <textarea style={{ ...s.textarea, minHeight: '72px' }} rows={2} value={form.education} onChange={e => setField('education', e.target.value)} placeholder="S1 Manajemen, UI (2017–2021)" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Keahlian</label>
                    <textarea style={{ ...s.textarea, minHeight: '72px' }} rows={2} value={form.skills} onChange={e => setField('skills', e.target.value)} placeholder="Excel, SQL, Figma, public speaking" />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Info Tambahan <span style={s.opt}>sertifikasi, organisasi, proyek</span></label>
                  <input style={s.input} placeholder="Google Analytics Certified, Ketua BEM 2019" value={form.extra} onChange={e => setField('extra', e.target.value)} />
                </div>
              </>
            )}

            {mode === 'optimize' && (
              <div style={s.field}>
                <label style={s.label}>CV Kamu</label>

                <div
                  style={{ ...s.uploadArea, ...(uploading ? { opacity: 0.6, cursor: 'wait' } : {}) }}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]) }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => handleFileUpload(e.target.files[0])}
                  />
                  {uploading ? (
                    <p style={s.uploadText}>⏳ Membaca file...</p>
                  ) : fileName ? (
                    <p style={s.uploadText}>✅ <strong>{fileName}</strong> — teks berhasil dibaca <span style={{ color: selectedFmt.color, cursor: 'pointer', fontSize: '0.8rem', marginLeft: '6px' }}>ganti file</span></p>
                  ) : (
                    <>
                      <p style={s.uploadIcon}>📎</p>
                      <p style={s.uploadText}>Upload PDF atau Word <span style={{ color: '#9ca3af' }}>atau drag & drop</span></p>
                      <p style={s.uploadHint}>Maks. 5MB · .pdf .doc .docx</p>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>atau paste manual</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                <textarea style={s.textarea} rows={10} value={cvText}
                  onChange={e => { setCvText(e.target.value); setFileName(null) }}
                  placeholder="Paste seluruh isi CV kamu di sini — pengalaman, pendidikan, skill, dll." />
                <p style={s.charCount}>{cvText.length} karakter</p>
              </div>
            )}

            {error && <div style={s.errorBox}>{error}</div>}

            <button onClick={handleGenerate} disabled={loading} style={{ ...s.genBtn, background: loading ? '#9ca3af' : selectedFmt.color }}>
              {loading ? '⏳ AI sedang menulis CV...' : `✨ Buat CV ${selectedFmt.label}`}
            </button>
          </div>

          {/* Right: Result */}
          <div style={s.resultPanel}>
            {!loading && !result && (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>{selectedFmt.icon}</div>
                <p style={s.emptyTitle}>CV {selectedFmt.label} kamu akan muncul di sini</p>
                <p style={s.emptySub}>{selectedFmt.desc}</p>
                <ul style={s.emptyList}>
                  {DIFF[format].bullets.map((b, i) => (
                    <li key={i} style={{ ...s.emptyListItem, color: selectedFmt.color }}>
                      <span>✓</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {loading && (
              <div style={s.loadingState}>
                <div style={{ ...s.spinner, borderColor: selectedFmt.color, borderTopColor: 'transparent' }} />
                <p style={s.loadingText}>AI sedang menulis CV {selectedFmt.label} kamu...</p>
                <p style={s.loadingNote}>Biasanya selesai dalam 15–20 detik</p>
              </div>
            )}

            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ ...s.resultHeader, background: selectedFmt.bg, borderColor: selectedFmt.border }}>
                  <div style={s.resultHeaderLeft}>
                    <span style={{ ...s.resultBadge, background: selectedFmt.color }}>{selectedFmt.icon} {selectedFmt.label}</span>
                    <span style={s.resultReady}>Siap digunakan</span>
                  </div>
                  <button onClick={handleSavePdf} disabled={savingPdf} style={{ ...s.pdfBtn, background: selectedFmt.color }}>
                    {savingPdf ? '⏳' : '📥'} {savingPdf ? 'Menyimpan...' : 'Simpan PDF'}
                  </button>
                </div>
                <div ref={resultRef} style={s.resultBody}>
                  <div style={s.resultMeta}>
                    <strong>LamarCerdas — CV {selectedFmt.label}</strong>
                    <span style={s.resultDate}>
                      {jobTarget && `${jobTarget} · `}
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const s = {
  page: { padding: '48px 24px', minHeight: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' },
  bgGrid: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle, #e5e7e0 1px, transparent 1px)',
    backgroundSize: '28px 28px', opacity: 0.45,
  },
  container: { maxWidth: '1160px', margin: '0 auto', position: 'relative', zIndex: 1 },

  // Header
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', gap: '24px', flexWrap: 'wrap' },
  headerLeft: {},
  badge: { display: 'inline-block', background: '#0f1710', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '12px', color: '#0f1710' },
  titleAccent: { color: 'var(--green)' },
  sub: { color: 'var(--gray)', fontSize: '0.95rem', maxWidth: '520px', lineHeight: 1.6 },
  usagePill: { display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e5e7e0', borderRadius: '100px', padding: '8px 16px', fontSize: '0.85rem', color: '#374151', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  usageDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 },

  // Format cards
  formatRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
  formatCard: { background: '#fff', border: '2px solid #e5e7eb', borderRadius: '16px', padding: '20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  formatCardActive: { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
  formatTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  formatIcon: { fontSize: '1.6rem' },
  formatDot: { width: '10px', height: '10px', borderRadius: '50%', transition: 'background 0.18s' },
  formatName: { fontSize: '1rem', fontWeight: 700, marginBottom: '4px', transition: 'color 0.18s' },
  formatTag: { fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' },
  formatDesc: { fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.4, marginBottom: '12px' },
  formatBullets: { listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #f3f4f6', paddingTop: '12px' },
  formatBulletItem: { fontSize: '0.78rem', marginBottom: '5px', display: 'flex', alignItems: 'flex-start', gap: '2px', lineHeight: 1.4 },

  // Layout
  layout: { display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '24px', alignItems: 'start' },

  // Input panel
  inputPanel: { background: '#fff', border: '1px solid #e5e7e0', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  modeRow: { display: 'flex', gap: '8px', marginBottom: '24px' },
  modeBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#6b7280', fontFamily: 'inherit', transition: 'all 0.15s' },
  modeBtnOn: { background: '#fafaf7' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#374151', letterSpacing: '0.02em' },
  opt: { fontWeight: 400, color: '#9ca3af', fontSize: '0.75rem', marginLeft: '4px' },
  req: { color: '#dc2626', marginLeft: '2px' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', background: '#fafaf7', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border 0.15s' },
  textarea: { width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', background: '#fafaf7', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' },
  charCount: { fontSize: '0.72rem', color: '#9ca3af', textAlign: 'right', marginTop: '4px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', marginBottom: '16px' },
  genBtn: { width: '100%', color: '#fff', fontWeight: 700, fontSize: '0.95rem', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em', transition: 'opacity 0.15s', marginTop: '4px' },

  // Result panel
  resultPanel: { background: '#fff', border: '1px solid #e5e7e0', borderRadius: '20px', overflow: 'hidden', minHeight: '520px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'sticky', top: '80px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '48px 32px', textAlign: 'center' },
  emptyIcon: { fontSize: '3rem', marginBottom: '16px' },
  emptyTitle: { fontWeight: 700, fontSize: '1rem', color: '#374151', marginBottom: '6px' },
  emptySub: { color: '#9ca3af', fontSize: '0.85rem', marginBottom: '20px' },
  emptyList: { listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' },
  emptyListItem: { fontSize: '0.82rem', marginBottom: '8px', display: 'flex', gap: '8px' },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', padding: '48px' },
  spinner: { width: '36px', height: '36px', borderRadius: '50%', borderWidth: '3px', borderStyle: 'solid', animation: 'spin 0.8s linear infinite' },
  loadingText: { fontWeight: 600, fontSize: '0.95rem', color: '#374151' },
  loadingNote: { fontSize: '0.8rem', color: '#9ca3af' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid' },
  resultHeaderLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  resultBadge: { color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px' },
  resultReady: { fontSize: '0.78rem', color: '#6b7280' },
  pdfBtn: { color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  resultBody: { padding: '20px 24px', fontSize: '0.875rem', lineHeight: 1.75, color: '#1f2937', overflow: 'auto', flex: 1 },
  resultMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '4px' },
  resultDate: { fontSize: '0.72rem', color: '#9ca3af' },
  uploadArea: {
    border: '2px dashed #d1d5db', borderRadius: '12px', padding: '18px',
    textAlign: 'center', cursor: 'pointer', background: '#fafaf7',
    marginBottom: '4px', transition: 'all 0.15s',
  },
  uploadIcon: { fontSize: '1.4rem', marginBottom: '4px' },
  uploadText: { fontSize: '0.85rem', color: '#374151', margin: '0 0 4px' },
  uploadHint: { fontSize: '0.72rem', color: '#9ca3af', margin: 0 },
}
