import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'

export default function CVReview({ user }) {
  const { plan, canUse, getRemainingUses, trackUsage, loading: subLoading } = useSubscription(user?.id)
  const [cvText, setCvText] = useState('')
  const [jobTarget, setJobTarget] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savingPdf, setSavingPdf] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [view, setView] = useState('form') // 'form' | 'result'
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(ext)) return setError('Format tidak didukung. Gunakan PDF atau Word (.docx).')
    setUploading(true); setError(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/parse-cv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, fileName: file.name }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCvText(data.text); setFileName(file.name)
    } catch (e) { setError(e.message || 'Gagal membaca file.') }
    setUploading(false)
  }

  const handleReview = async () => {
    if (!cvText.trim()) return setError('Paste isi CV kamu dulu ya.')
    setLoading(true); setError(null); setResult(null)
    try {
      await trackUsage('cv_review')
      const res = await fetch('/api/cv-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, jobTarget }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.review); setView('result')
    } catch { setError('Waduh, ada error. Coba lagi ya.') }
    setLoading(false)
  }

  const handleSavePdf = async () => {
    setSavingPdf(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({ margin: 16, filename: `Verneks-CV-Review-${new Date().toLocaleDateString('id-ID')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(resultRef.current).save()
    } catch { alert('Gagal export PDF.') }
    setSavingPdf(false)
  }

  if (subLoading) return <div className="wa-screen"><div className="wa-header"><div className="wa-header-avatar">📄</div><div><div className="wa-header-title">CV Review</div></div></div></div>
  if (!user) { window.location.href = '/register'; return null }
  if (!canUse('cv_review') && !result && !loading) return <FeatureGate canUse={false} feature="cv_review" plan={plan} user={user} />

  return (
    <div className="wa-screen">
      <div className="wa-header">
        {view === 'result' && (
          <button className="wa-header-back" onClick={() => setView('form')}>‹</button>
        )}
        <div className="wa-header-avatar" style={{ background: '#4CAF50' }}>📄</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">{view === 'result' ? 'Hasil CV Review' : 'CV Review AI'}</div>
          <div className="wa-header-subtitle">
            {view === 'result' ? (jobTarget || 'Feedback lengkap') : `Sisa ${getRemainingUses('cv_review')}x bulan ini`}
          </div>
        </div>
        {view === 'result' && (
          <button onClick={handleSavePdf} disabled={savingPdf} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            {savingPdf ? '...' : '📥 PDF'}
          </button>
        )}
      </div>

      {view === 'form' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="wa-section-header">Target Posisi (opsional)</div>
          <div className="wa-form-group">
            <input className="wa-form-input" type="text" placeholder="Contoh: Data Analyst di startup tech" value={jobTarget} onChange={e => setJobTarget(e.target.value)} />
          </div>

          <div className="wa-section-header">Upload CV kamu</div>
          <div
            className="wa-upload-area"
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]) }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files[0])} />
            {uploading ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--wa-gray)' }}>⏳ Membaca file...</p>
            ) : fileName ? (
              <div className="wa-attachment">
                <span className="wa-attachment-icon">📎</span>
                <span className="wa-attachment-name">{fileName}</span>
                <span style={{ color: 'var(--wa-green)', fontSize: '0.75rem', fontWeight: 600 }}>Ganti</span>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📎</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--wa-gray)' }}>Upload PDF atau Word</p>
                <p style={{ fontSize: '0.75rem', color: '#aaa' }}>Maks. 5MB · .pdf .doc .docx</p>
              </>
            )}
          </div>

          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--wa-border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--wa-gray)' }}>atau paste teks CV</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--wa-border)' }} />
          </div>

          <div className="wa-section-header">Isi CV Kamu</div>
          <div className="wa-form-group">
            <textarea
              className="wa-form-textarea"
              rows={8}
              placeholder="Paste seluruh isi CV kamu di sini — pengalaman, pendidikan, skill, dll."
              value={cvText}
              onChange={e => { setCvText(e.target.value); setFileName(null) }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--wa-gray)', textAlign: 'right', marginTop: '4px' }}>{cvText.length} karakter</div>
          </div>

          {error && <div className="wa-alert red" style={{ margin: '8px 12px' }}>{error}</div>}

          <div style={{ padding: '12px 16px' }}>
            <button className="wa-btn-primary" onClick={handleReview} disabled={loading}>
              {loading ? '⏳ Menganalisis CV...' : '🔍 Review CV Sekarang'}
            </button>
          </div>
          <div style={{ height: '64px' }} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div className="wa-empty">
              <span className="wa-empty-icon">🤖</span>
              <p className="wa-empty-text">AI lagi baca CV kamu...</p>
            </div>
          ) : (
            <div ref={resultRef} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid var(--wa-border)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--wa-border)' }}>
                <strong style={{ fontSize: '0.95rem' }}>Verneks — Hasil CV Review</strong>
                <p style={{ fontSize: '0.72rem', color: 'var(--wa-gray)', marginTop: '2px' }}>
                  {jobTarget && `Posisi: ${jobTarget} · `}{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
          <div style={{ height: '80px' }} />
        </div>
      )}
    </div>
  )
}
