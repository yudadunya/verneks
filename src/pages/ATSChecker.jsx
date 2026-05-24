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
  const [view, setView] = useState('form')

  const extractScore = (text) => { const m = text.match(/ATS Score:\s*(\d+)\/100/); return m ? parseInt(m[1]) : null }
  const getScoreColor = (s) => s >= 80 ? '#25D366' : s >= 60 ? '#f59e0b' : '#ea0038'
  const getScoreLabel = (s) => s >= 80 ? 'ATS Friendly 🎉' : s >= 60 ? 'Perlu Perbaikan ⚠️' : 'ATS Unfriendly ❌'

  const handleCheck = async () => {
    if (!cvText.trim()) return setError('Paste isi CV kamu dulu ya.')
    setLoading(true); setError(null); setResult(null); setScore(null)
    try {
      const res = await fetch('/api/ats-checker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, jobDescription }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result); setScore(extractScore(data.result))
      await trackUsage('ats_checker'); setView('result')
    } catch { setError('Waduh, ada error. Coba lagi ya.') }
    setLoading(false)
  }

  if (subLoading) return <div className="wa-screen"><div className="wa-header"><div className="wa-header-avatar">🎯</div><div><div className="wa-header-title">ATS Checker</div></div></div></div>
  if (!user) { window.location.href = '/register'; return null }
  if (!canUse('ats_checker')) return <FeatureGate canUse={false} feature="ats_checker" plan={plan} user={user} />

  return (
    <div className="wa-screen">
      <div className="wa-header">
        {view === 'result' && <button className="wa-header-back" onClick={() => setView('form')}>‹</button>}
        <div className="wa-header-avatar" style={{ background: '#2196F3' }}>🎯</div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">ATS Score Checker</div>
          <div className="wa-header-subtitle">{view === 'result' ? (score !== null ? `Score: ${score}/100` : 'Hasil analisis') : `Sisa ${getRemainingUses('ats_checker')}x bulan ini`}</div>
        </div>
        {view === 'result' && score !== null && (
          <div className="wa-score-ring" style={{ background: getScoreColor(score), width: '44px', height: '44px', fontSize: '0.8rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff' }}>
            {score}
          </div>
        )}
      </div>

      {view === 'form' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="wa-section-header">Job Description (opsional tapi recommended)</div>
          <div className="wa-form-group">
            <textarea className="wa-form-textarea" rows={4} placeholder="Paste job description dari lowongan yang mau kamu lamar — hasilnya jauh lebih akurat" value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--wa-gray)', textAlign: 'right' }}>{jobDescription.length} karakter</div>
          </div>

          <div className="wa-section-header">Isi CV Kamu</div>
          <div className="wa-form-group">
            <textarea className="wa-form-textarea" rows={10} placeholder="Paste seluruh isi CV kamu di sini" value={cvText} onChange={e => setCvText(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--wa-gray)', textAlign: 'right' }}>{cvText.length} karakter</div>
          </div>

          {error && <div className="wa-alert red" style={{ margin: '8px 12px' }}>{error}</div>}

          <div style={{ padding: '12px 16px' }}>
            <button className="wa-btn-primary" onClick={handleCheck} disabled={loading}>
              {loading ? '⏳ Menganalisis...' : '🎯 Cek ATS Score'}
            </button>
          </div>
          <div style={{ height: '64px' }} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Score bubble */}
          {score !== null && (
            <div className="wa-bubble-wrap incoming" style={{ padding: '12px 8px 0' }}>
              <div className="wa-bubble incoming" style={{ maxWidth: '100%', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: getScoreColor(score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0 }}>
                    {score}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: getScoreColor(score) }}>{getScoreLabel(score)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--wa-gray)' }}>ATS Score CV kamu</div>
                    <div style={{ marginTop: '6px' }}>
                      <div className="wa-progress-track" style={{ width: '160px' }}>
                        <div className="wa-progress-fill" style={{ width: `${score}%`, background: getScoreColor(score) }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="wa-bubble-time">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )}

          {result && (
            <div style={{ padding: '8px 16px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid var(--wa-border)', fontSize: '0.88rem', lineHeight: 1.7 }}>
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
          <div style={{ height: '80px' }} />
        </div>
      )}
    </div>
  )
}
