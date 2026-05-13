import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function CVReview({ user }) {
  const [cvText, setCvText] = useState('')
  const [jobTarget, setJobTarget] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleReview = async () => {
    if (!cvText.trim()) return setError('Paste isi CV kamu dulu ya.')
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/cv-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobTarget }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.review)
    } catch (e) {
      setError('Waduh, ada error. Coba lagi ya.')
    }
    setLoading(false)
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📄 CV Review AI</h1>
          <p style={styles.sub}>Paste isi CV kamu, AI akan kasih feedback detail dalam 30 detik.</p>
        </div>

        <div style={styles.layout}>
          {/* Input */}
          <div style={styles.inputSection}>
            <div style={styles.field}>
              <label style={styles.label}>Target Posisi (opsional)</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Contoh: Data Analyst di startup tech"
                value={jobTarget}
                onChange={(e) => setJobTarget(e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Isi CV Kamu</label>
              <textarea
                style={styles.textarea}
                placeholder="Paste seluruh isi CV kamu di sini — pengalaman, pendidikan, skill, dll."
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                rows={16}
              />
              <p style={styles.hint}>{cvText.length} karakter</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button onClick={handleReview} disabled={loading} style={styles.btn}>
              {loading ? '⏳ Menganalisis CV...' : '🔍 Review CV Sekarang'}
            </button>
          </div>

          {/* Result */}
          <div style={styles.resultSection}>
            {loading && (
              <div style={styles.loadingBox}>
                <div style={styles.loadingDot} />
                <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>AI lagi baca CV kamu...</p>
              </div>
            )}

            {result && (
              <div style={styles.resultBox}>
                <div style={styles.resultHeader}>
                  <span>✅ Hasil Review</span>
                </div>
                <div style={styles.markdown}>
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div style={styles.placeholder}>
                <p style={{ fontSize: '3rem', marginBottom: '12px' }}>🤖</p>
                <p style={{ color: 'var(--gray)', fontSize: '0.9rem', textAlign: 'center' }}>
                  Hasil review CV kamu akan muncul di sini
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const styles = {
  page: { padding: '40px 24px', minHeight: 'calc(100vh - 64px)' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  header: { marginBottom: '32px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '8px' },
  sub: { color: 'var(--gray)', fontSize: '0.95rem' },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    '@media(max-width: 768px)': { gridTemplateColumns: '1fr' },
  },
  inputSection: {},
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '0.95rem',
    outline: 'none',
    background: 'var(--cream)',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '0.9rem',
    outline: 'none',
    background: 'var(--cream)',
    resize: 'vertical',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
  },
  hint: { fontSize: '0.75rem', color: 'var(--gray)', marginTop: '4px', textAlign: 'right' },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '0.875rem',
    marginBottom: '16px',
  },
  btn: {
    width: '100%',
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
  },
  resultSection: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '12px',
    padding: '40px',
  },
  loadingDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid var(--green)',
    borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
  },
  resultHeader: {
    background: '#f0fdf4',
    borderBottom: '1px solid #bbf7d0',
    padding: '14px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--green-dark)',
  },
  markdown: {
    padding: '20px',
    fontSize: '0.9rem',
    lineHeight: 1.7,
    color: 'var(--dark)',
    overflow: 'auto',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px',
  },
}
