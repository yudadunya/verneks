import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSubscription } from '../hooks/useSubscription'
import FeatureGate from '../components/FeatureGate'

export default function ATSChecker({ user }) {
  const { plan, canUse, getRemainingUses, trackUsage, loading: subLoading } = useSubscription(user?.id)
  const [cvText, setCvText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [score, setScore] = useState(null)

  const extractScore = (text) => {
    const match = text.match(/ATS Score:\s*(\d+)\/100/)
    return match ? parseInt(match[1]) : null
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a'
    if (score >= 60) return '#d97706'
    return '#dc2626'
  }

  const getScoreLabel = (score) => {
    if (score >= 80) return 'ATS Friendly 🎉'
    if (score >= 60) return 'Perlu Perbaikan ⚠️'
    return 'ATS Unfriendly ❌'
  }

  const handleCheck = async () => {
    if (!cvText.trim()) return setError('Paste isi CV kamu dulu ya.')
    setLoading(true)
    setError(null)
    setResult(null)
    setScore(null)

    try {
      const res = await fetch('/api/ats-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobDescription }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result)
      setScore(extractScore(data.result))
      await trackUsage('ats_checker')
    } catch (e) {
      setError('Waduh, ada error. Coba lagi ya.')
    }
    setLoading(false)
  }

  if (subLoading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)' }}>Memuat...</div>
if (!user) {
  window.location.href = '/register'
  return null
}
  if (!canUse('ats_checker')) return (
    <FeatureGate canUse={false} feature="ats_checker" plan={plan} />
  )

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎯 ATS Score Checker</h1>
          <p style={styles.sub}>Cek seberapa ATS-friendly CV kamu sebelum dikirim ke perusahaan impian.</p>
        </div>

        <div style={styles.layout}>
          <div style={styles.inputSection}>
            <div style={styles.field}>
              <label style={styles.label}>Job Description (opsional tapi recommended)</label>
              <textarea
                style={{ ...styles.textarea, minHeight: '120px' }}
                placeholder="Paste job description dari lowongan yang mau kamu lamar — hasilnya akan jauh lebih akurat"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={5}
              />
              <p style={styles.hint}>{jobDescription.length} karakter</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Isi CV Kamu</label>
              <textarea
                style={styles.textarea}
                placeholder="Paste seluruh isi CV kamu di sini"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                rows={14}
              />
              <p style={styles.hint}>{cvText.length} karakter</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button onClick={handleCheck} disabled={loading} style={styles.btn}>
              {loading ? '⏳ Menganalisis...' : '🎯 Cek ATS Score'}
            </button>
          </div>

          <div style={styles.resultSection}>
            {loading && (
              <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>AI lagi analisis CV kamu...</p>
              </div>
            )}

            {score !== null && !loading && (
              <div style={styles.scoreBox}>
                <div style={{ ...styles.scoreBig, color: getScoreColor(score) }}>
                  {score}<span style={styles.scoreOf}>/100</span>
                </div>
                <div style={{ ...styles.scoreLabel, color: getScoreColor(score) }}>
                  {getScoreLabel(score)}
                </div>
                <div style={styles.scoreBar}>
                  <div style={{
                    ...styles.scoreBarFill,
                    width: `${score}%`,
                    background: getScoreColor(score)
                  }} />
                </div>
              </div>
            )}

            {result && !loading && (
              <div style={styles.resultBox}>
                <div style={styles.markdown}>
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div style={styles.placeholder}>
                <p style={{ fontSize: '3rem', marginBottom: '12px' }}>🎯</p>
                <p style={{ color: 'var(--gray)', fontSize: '0.9rem', textAlign: 'center' }}>
                  Hasil ATS Score kamu akan muncul di sini
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
  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  inputSection: {},
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' },
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
    minHeight: '200px',
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
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid var(--green)',
    borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
  },
  scoreBox: {
    padding: '28px',
    borderBottom: '1px solid var(--border)',
    textAlign: 'center',
    background: '#fafaf7',
  },
  scoreBig: {
    fontFamily: 'var(--font-display)',
    fontSize: '4rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  scoreOf: { fontSize: '1.5rem', opacity: 0.5 },
  scoreLabel: { fontWeight: 600, fontSize: '1rem', marginTop: '8px', marginBottom: '16px' },
  scoreBar: {
    background: '#e5e7e0',
    borderRadius: '100px',
    height: '8px',
    overflow: 'hidden',
    maxWidth: '200px',
    margin: '0 auto',
  },
  scoreBarFill: { height: '100%', borderRadius: '100px', transition: 'width 1s ease' },
  resultBox: { flex: 1, overflow: 'auto' },
  markdown: { padding: '20px', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--dark)' },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px',
  },
}
