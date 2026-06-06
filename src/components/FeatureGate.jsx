import { Link } from 'react-router-dom'

// FeatureGate sekarang hanya ditampilkan saat daily limit habis
// (bukan per-fitur lock seperti model lama)
export default function FeatureGate({ canUse, feature, plan, children }) {
  if (canUse) return children

  return (
    <div className="wa-screen">
      <div className="wa-header">
        <div className="wa-header-avatar">⏱️</div>
        <div>
          <div className="wa-header-title">Batas Harian</div>
          <div className="wa-header-subtitle">Paket: {plan === 'premium' ? 'Premium ⭐' : 'Free'}</div>
        </div>
      </div>

      <div className="wa-chat-area" style={{ flex: 1 }}>
        <div className="wa-section-divider"><span>Notifikasi</span></div>
        <div className="wa-bubble-wrap incoming">
          <div className="wa-bubble incoming" style={{ maxWidth: '90%' }}>
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>⏱️ Kuota 15 chat hari ini sudah habis</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--wa-gray)', marginBottom: '6px' }}>
              Kuota harian Free kamu sudah terpakai. Reset otomatis tengah malam (00:00 WIB).
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--wa-gray)' }}>
              Atau upgrade ke Premium untuk chat unlimited tanpa batas harian.
            </p>
            <div className="wa-bubble-time">sekarang</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid var(--wa-border)' }}>
        <a
          href="http://lynk.id/yudadunya/r3o5ldq5qkex/checkout"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', marginBottom: '10px' }}
        >
          <button className="wa-btn-primary">🚀 Upgrade Premium — Rp 199rb/bln</button>
        </a>
        <Link to="/chat" style={{ display: 'block' }}>
          <button className="wa-btn-secondary">⏳ Tunggu reset besok</button>
        </Link>
      </div>
      <div style={{ height: '64px' }} />
    </div>
  )
}
