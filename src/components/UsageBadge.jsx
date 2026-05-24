import { Link } from 'react-router-dom'

const FEATURE_LIMITS = {
  cv_review:      { free: 1,  starter: 5,   pro: 20, platinum: 999 },
  ats_checker:    { free: 1,  starter: 5,   pro: 20, platinum: 999 },
  diah_anna:      { free: 1,  starter: 5,   pro: 20, platinum: 999 },
  mock_interview: { free: 0,  starter: 0,   pro: 20, platinum: 999 },
  cv_maker:       { free: 1,  starter: 5,   pro: 20, platinum: 999 },
}

const FEATURE_LABEL = {
  cv_review:      'CV Review',
  ats_checker:    'ATS Checker',
  diah_anna:      'Sesi Career Coach',
  mock_interview: 'Mock Interview',
  cv_maker:       'CV Maker',
}

/**
 * UsageBadge — tampilkan sisa kuota fitur bulan ini
 *
 * Props:
 * - feature: 'cv_review' | 'ats_checker' | 'diah_anna' | 'mock_interview'
 * - plan: 'free' | 'starter' | 'pro' | 'platinum'
 * - remaining: angka sisa dari getRemainingUses()
 */
export default function UsageBadge({ feature, plan, remaining }) {
  const limits = FEATURE_LIMITS[feature] || {}
  const limit = limits[plan] || 1
  const label = FEATURE_LABEL[feature] || feature
  const isUnlimited = limit >= 999
  const used = isUnlimited ? 0 : Math.max(0, limit - remaining)
  const percent = isUnlimited ? 0 : Math.round((used / limit) * 100)

  const barColor = percent >= 80 ? '#dc2626' : percent >= 50 ? '#f59e0b' : 'var(--green)'
  const countColor = remaining <= 1 && !isUnlimited ? '#dc2626' : 'var(--dark)'

  return (
    <div style={styles.widget}>
      <div style={styles.top}>
        <span style={styles.label}>{label} bulan ini</span>
        {isUnlimited
          ? <span style={styles.unlimited}>Unlimited ✨</span>
          : <span style={{ ...styles.count, color: countColor }}>{used} / {limit} terpakai</span>
        }
      </div>

      {!isUnlimited && (
        <>
          <div style={styles.track}>
            <div style={{ ...styles.fill, width: `${percent}%`, background: barColor }} />
          </div>
          {remaining <= 1 && remaining > 0 && (
            <p style={styles.warning}>
              ⚠️ Sisa {remaining}x lagi.{' '}
              <Link to="/pricing" style={styles.link}>Upgrade →</Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  widget: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px 18px',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  label: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark)' },
  unlimited: { fontSize: '0.8rem', fontWeight: 500, color: 'var(--green)' },
  count: { fontSize: '0.8rem', fontWeight: 500 },
  track: { height: '6px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' },
  warning: { fontSize: '0.78rem', color: 'var(--gray)', marginTop: '8px', marginBottom: 0 },
  link: { color: 'var(--green)', fontWeight: 600 },
}
