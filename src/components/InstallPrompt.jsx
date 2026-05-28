import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow]     = useState(false)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_dismissed') === '1'
  )

  useEffect(() => {
    if (dismissed) return

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — tidak ada beforeinstallprompt, deteksi manual
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isIos && !isStandalone) setShow(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const handleInstall = async () => {
    if (prompt) {
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', '1')
    setDismissed(true)
    setShow(false)
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  if (!show || dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 9999,
      background: '#fff',
      borderTop: '1px solid #e0e0e0',
      borderRadius: '16px 16px 0 0',
      padding: '16px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{ width: 36, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 14px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <img src="/icons/icon-72x72.png" alt="LamarCerdas" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111' }}>Install LamarCerdas</div>
          <div style={{ fontSize: '0.78rem', color: '#667781', marginTop: 2 }}>
            Akses lebih cepat langsung dari layar utama HP kamu 📲
          </div>
        </div>
      </div>

      {isIos && !prompt ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#2e7d32', marginBottom: 12 }}>
          Tap <strong>Share</strong> lalu pilih <strong>"Add to Home Screen"</strong>
        </div>
      ) : (
        <button
          onClick={handleInstall}
          style={{ width: '100%', padding: '13px', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 10 }}
        >
          📲 Install Sekarang
        </button>
      )}

      <button
        onClick={handleDismiss}
        style={{ width: '100%', padding: '10px', background: 'transparent', color: '#667781', fontWeight: 500, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
      >
        Nanti saja
      </button>
    </div>
  )
}
