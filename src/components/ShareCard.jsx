import { useState, useRef } from 'react'

// Parse ATS score dari teks hasil review
function parseScore(text) {
  const match = text.match(/(?:ATS\s*Score|Skor)[^\d]*(\d{1,3})\s*(?:\/\s*100)?/i)
  return match ? parseInt(match[1]) : null
}

function scoreColor(score) {
  if (score >= 80) return '#25D366'
  if (score >= 60) return '#FFB74D'
  return '#ef4444'
}

function scoreLabel(score) {
  if (score >= 80) return 'Bagus! 🎉'
  if (score >= 60) return 'Lumayan 💪'
  return 'Perlu diperbaiki 🔧'
}

export default function ShareCard({ resultText, type = 'cv-review', onClose }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef()

  const score = parseScore(resultText)
  const shareText = score
    ? `CV aku baru dicek sama Diah Anna — AI Career Coach di LamarCerdas, dapat skor ATS ${score}/100! 🎯\n\nDia langsung kasih tahu apa yang harus diperbaiki, gratis banget.\n\nKamu juga bisa coba → https://lamarcerdas.my.id`
    : `Baru pakai Diah Anna AI Career Coach di LamarCerdas buat review CV — hasilnya detail banget dan gratis! 🙌\n\nCoba juga yuk → https://lamarcerdas.my.id`

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
      // Buat canvas dari card
      const card = cardRef.current
      if (!card) return

      // Gunakan html2canvas via dynamic import atau fallback screenshot manual
      // Karena tidak ada html2canvas, kita buat SVG lalu download sebagai PNG
      const svgContent = generateCardSVG(score, type)
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lamarcerdas-hasil.svg'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function generateCardSVG(score, type) {
    const color = score ? scoreColor(score) : '#25D366'
    const label = score ? scoreLabel(score) : 'Review selesai!'
    const title = type === 'ats' ? 'ATS Score Checker' : 'CV Review'

    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f0d"/>
      <stop offset="100%" stop-color="#0f1f14"/>
    </linearGradient>
    <linearGradient id="gr" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#25D366"/>
      <stop offset="100%" stop-color="#128C7E"/>
    </linearGradient>
  </defs>
  <rect width="400" height="220" rx="20" fill="url(#bg)"/>
  <rect x="0" y="0" width="400" height="5" rx="2" fill="url(#gr)"/>
  <!-- Logo area -->
  <rect x="20" y="20" width="32" height="32" rx="8" fill="url(#gr)"/>
  <text x="36" y="41" text-anchor="middle" font-size="16" fill="white">✦</text>
  <text x="62" y="40" font-family="Arial, sans-serif" font-weight="800" font-size="15" fill="white">LamarCerdas</text>
  <text x="62" y="54" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.4)">${title}</text>
  ${score ? `
  <!-- Score circle -->
  <circle cx="200" cy="118" r="52" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="8"/>
  <circle cx="200" cy="118" r="52" fill="none" stroke="${color}" stroke-width="8"
    stroke-dasharray="${(score / 100) * 326.7} 326.7"
    stroke-linecap="round"
    transform="rotate(-90 200 118)"/>
  <text x="200" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="32" fill="white">${score}</text>
  <text x="200" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.4)">/100</text>
  <text x="200" y="148" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="${color}">${label}</text>
  ` : `
  <text x="200" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="40">✅</text>
  <text x="200" y="148" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="white">${label}</text>
  `}
  <!-- Bottom -->
  <text x="200" y="192" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)">lamarcerdas.my.id · AI Career Coach Gratis</text>
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
        background: '#111b13',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 36px',
        border: '1px solid rgba(37,211,102,0.15)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>Bagikan hasil & ajak teman 🎉</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 20 }}>Share ke teman — siapa tahu mereka juga butuh Diah Anna!</div>

        {/* Preview card */}
        <div ref={cardRef} style={{
          background: 'linear-gradient(135deg, #0a0f0d, #0f1f14)',
          border: '1px solid rgba(37,211,102,0.2)',
          borderRadius: 16,
          padding: '18px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #25D366, #34B7F1)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>LamarCerdas</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
                {type === 'ats' ? 'ATS Score Checker' : 'CV Review'} · lamarcerdas.my.id
              </div>
            </div>
            <div style={{ fontSize: '1.4rem' }}>{type === 'ats' ? '🎯' : '📄'}</div>
          </div>

          {score ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Score ring visual */}
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
                  <circle cx="36" cy="36" r="28" fill="none" stroke={scoreColor(score)} strokeWidth="6"
                    strokeDasharray={`${(score/100)*175.9} 175.9`}
                    strokeLinecap="round"
                    transform="rotate(-90 36 36)"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>{score}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>/100</span>
                </div>
              </div>
              <div>
                <div style={{ color: scoreColor(score), fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{scoreLabel(score)}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                  ATS Score CV saya<br/>setelah dicek Diah Anna
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#25D366', fontWeight: 700, fontSize: '0.88rem' }}>
              ✅ CV Review selesai — dapat feedback lengkap dari Diah Anna!
            </div>
          )}
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={() => navigator.share({ title: 'LamarCerdas', text: shareText }).catch(() => {})} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff',
              fontWeight: 700, fontSize: '0.9rem',
              padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
            }}>
              <span style={{ fontSize: '1.1rem' }}>↗️</span> Bagikan via...
            </button>
          )}
          <button onClick={handleWA} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: navigator?.share ? 'rgba(37,211,102,0.1)' : '#25D366',
            border: navigator?.share ? '1px solid rgba(37,211,102,0.3)' : 'none',
            color: navigator?.share ? '#25D366' : '#fff',
            fontWeight: 700, fontSize: '0.9rem',
            padding: '13px', borderRadius: 12, cursor: 'pointer',
          }}>
            <span style={{ fontSize: '1.1rem' }}>💬</span> WhatsApp
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCopy} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'rgba(255,255,255,0.07)', color: copied ? '#25D366' : 'rgba(255,255,255,0.7)',
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
