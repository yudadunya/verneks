import { Link } from 'react-router-dom'

/**
 * UsageBadge — tampilkan sisa kuota chat harian
 * Model baru: Free = 15 chat/hari, Premium = unlimited
 *
 * Props:
 * - plan: 'free' | 'premium'
 * - remaining: angka sisa chat hari ini
 */
export default function UsageBadge({ plan, remaining }) {
  const isUnlimited = plan === 'premium'
  const limit = 15
  const used = isUnlimited ? 0 : Math.max(0, limit - (remaining ?? limit))
  const percent = isUnlimited ? 0 : Math.round((used / limit) * 100)
  const barColor = percent >= 80 ? '#dc2626' : percent >= 50 ? '#f59e0b' : 'var(--green)'
  const countColor = (remaining ?? limit) <= 3 && !isUnlimited ? '#dc2626' : 'var(--dark)'

  return (
    <div style={styles.widget}>
      <div style={styles.top}>
        <span style={styles.label}>Chat hari ini</span>
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
          {(remaining ?? limit) <= 3 && (remaining ?? limit) > 0 && (
            <p style={styles.warning}>
              ⚠️ Sisa {remaining ?? limit}x chat hari ini.{' '}
              <Link to="/pricing" style={styles.link}>Upgrade Premium →</Link>
            </p>
          )}
          {(remaining ?? limit) === 0 && (
            <p style={styles.warning}>
              ⏱️ Kuota habis. Reset tengah malam.{' '}
              <Link to="/pricing" style={styles.link}>Upgrade Premium →</Link>
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
