import { useState, useRef } from 'react'

export default function ShareCard({ resultText, type = 'curhat', onClose }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef()

  const shareText = `Baru curhat sama Diah Anna di Verneks — AI teman ngobrol yang dengerin tanpa ngehakimin, gratis! 🙌\n\nKocok isi kepala dulu sebelum meledak? Coba juga yuk → https://verneks.my.id`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleWA = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const svgContent = generateCardSVG()
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'verneks-curhat.svg'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function generateCardSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14101B"/>
      <stop offset="100%" stop-color="#1e1528"/>
    </linearGradient>
    <linearGradient id="gr" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#FB7185"/>
    </linearGradient>
  </defs>
  <rect width="400" height="220" rx="20" fill="url(#bg)"/>
  <rect x="0" y="0" width="400" height="5" rx="2" fill="url(#gr)"/>
  <rect x="20" y="20" width="32" height="32" rx="8" fill="url(#gr)"/>
  <text x="36" y="41" text-anchor="middle" font-size="16" fill="white">✦</text>
  <text x="62" y="40" font-family="Arial, sans-serif" font-weight="800" font-size="15" fill="white">Verneks</text>
  <text x="62" y="54" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.4)">Teman Curhat AI</text>
  <text x="200" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="40">💬</text>
  <text x="200" y="148" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="white">Udah curhat belum hari ini?</text>
  <text x="200" y="192" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)">verneks.my.id · Teman Curhat AI Gratis</text>
</svg>`
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: '#14101B',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 36px',
        border: '1px solid rgba(139,92,246,0.15)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>Bagikan & ajak teman curhat 💜</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 20 }}>Share ke teman — siapa tahu mereka juga butuh didengar!</div>

        {/* Preview card */}
        <div ref={cardRef} style={{
          background: 'linear-gradient(135deg, #14101B, #1e1528)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 16,
          padding: '18px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #8B5CF6, #FB7185)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(139,92,246,0.5)', flexShrink: 0 }}/>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.88rem' }}>Diah Anna · Verneks</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                Teman Curhat AI · verneks.my.id
              </div>
            </div>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            💬 Selesai curhat sama Diah Anna — lega banget bisa keluarin isi kepala tanpa dihakimi.
          </div>
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={() => navigator.share({ title: 'Verneks', text: shareText }).catch(() => {})} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'linear-gradient(135deg, #8B5CF6, #FB7185)', color: '#fff',
              fontWeight: 700, fontSize: '0.9rem',
              padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
            }}>
              <span style={{ fontSize: '1.1rem' }}>↗️</span> Bagikan via...
            </button>
          )}
          <button onClick={handleWA} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: navigator?.share ? 'rgba(139,92,246,0.1)' : 'linear-gradient(135deg,#8B5CF6,#FB7185)',
            border: navigator?.share ? '1px solid rgba(139,92,246,0.3)' : 'none',
            color: navigator?.share ? '#C4B5FD' : '#fff',
            fontWeight: 700, fontSize: '0.9rem',
            padding: '13px', borderRadius: 12, cursor: 'pointer',
          }}>
            <span style={{ fontSize: '1.1rem' }}>💬</span> WhatsApp
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCopy} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'rgba(255,255,255,0.07)', color: copied ? '#C4B5FD' : 'rgba(255,255,255,0.7)',
              fontWeight: 600, fontSize: '0.85rem',
              padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              transition: 'color 0.2s',
            }}>
              {copied ? '✓ Tersalin!' : '📋 Copy teks'}
            </button>
            <button onClick={handleDownload} disabled={downloading} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)',
              fontWeight: 600, fontSize: '0.85rem',
              padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            }}>
              {downloading ? '...' : '⬇️ Download'}
            </button>
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', cursor: 'pointer', padding: '8px' }}>
          Tutup
        </button>
      </div>
    </div>
  )
}
