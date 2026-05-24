import { Link } from 'react-router-dom'

export default function FeatureGate({ canUse, remaining, feature, plan, children }) {
  if (canUse) return children

  const messages = {
    cv_maker: { icon: '✨', title: plan === 'free' ? 'Jatah gratis CV Maker habis' : 'Limit CV Maker habis', desc: plan === 'free' ? 'Upgrade ke Starter untuk 5x CV Maker per bulan.' : 'Upgrade ke paket lebih tinggi.' },
    mock_interview: { icon: '🎤', title: 'Mock Interview hanya untuk Pro & Platinum', desc: 'Upgrade untuk akses latihan interview.' },
    cv_review: { icon: '📄', title: plan === 'free' ? 'Jatah gratis CV Review habis' : 'Limit CV Review habis', desc: plan === 'free' ? 'Upgrade ke Starter untuk 5x CV Review per bulan.' : 'Upgrade untuk lebih banyak review.' },
    ats_checker: { icon: '🎯', title: plan === 'free' ? 'Jatah gratis ATS Checker habis' : 'Limit ATS Checker habis', desc: plan === 'free' ? 'Upgrade ke Starter untuk 5x ATS Check.' : 'Upgrade untuk lebih banyak check.' },
    diah_anna: { icon: '🧠', title: plan === 'free' ? 'Jatah gratis Career Coach habis' : 'Limit sesi Career Coach habis', desc: plan === 'free' ? 'Upgrade ke Starter untuk 5 sesi per bulan.' : 'Upgrade untuk sesi lebih banyak.' },
  }

  const msg = messages[feature] || { icon: '🔒', title: 'Fitur tidak tersedia', desc: 'Upgrade untuk akses penuh.' }
  const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', platinum: 'Platinum' }

  return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar">{msg.icon}</div>
        <div><div className="wa-header-title">Batas Paket</div><div className="wa-header-subtitle">Paket kamu: {PLAN_LABEL[plan] || 'Free'}</div></div>
      </div>

      <div className="wa-chat-area" style={{ flex: 1 }}>
        <div className="wa-section-divider"><span>Notifikasi</span></div>
        <div className="wa-bubble-wrap incoming">
          <div className="wa-bubble incoming" style={{ maxWidth: '90%' }}>
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>{msg.icon} {msg.title}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--wa-gray)' }}>{msg.desc}</p>
            <div className="wa-bubble-time">sekarang</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid var(--wa-border)' }}>
        <Link to="/pricing" style={{ display: 'block' }}>
          <button className="wa-btn-primary" style={{ marginBottom: '10px' }}>⭐ Lihat Paket & Harga</button>
        </Link>
        <Link to="/dashboard" style={{ display: 'block' }}>
          <button className="wa-btn-secondary">← Kembali ke Dashboard</button>
        </Link>
      </div>
      <div style={{ height: '64px' }} />
    </div>
  )
}
