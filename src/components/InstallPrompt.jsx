import { useEffect, useState } from 'react'

const DISMISS_KEY = 'lc_install_prompt_dismissed_at'
const DISMISS_COOLDOWN_DAYS = 7

function isStandaloneMode() {
  return (
    window.navigator.standalone === true || // iOS Safari
    window.matchMedia?.('(display-mode: standalone)').matches // Android/desktop PWA
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

function wasDismissedRecently() {
  const ts = localStorage.getItem(DISMISS_KEY)
  if (!ts) return false
  const days = (Date.now() - Number(ts)) / 86400000
  return days < DISMISS_COOLDOWN_DAYS
}

/**
 * Banner untuk mendorong user install PWA ("Add to Home Screen").
 *
 * KENAPA INI PENTING (bukan sekadar nice-to-have):
 * - Di iOS Safari, tab browser biasa kena batas localStorage 7 hari tanpa
 *   interaksi (kebijakan ITP Apple) — bikin user ke-logout sendiri.
 *   Setelah "Add to Home Screen", storage-nya terpisah dan TIDAK kena
 *   batas itu.
 * - Push notification di iOS HANYA BISA jalan kalau app sudah di-install
 *   ke Home Screen (iOS 16.4+). Dari tab Safari biasa, notifikasi tidak
 *   akan pernah muncul sama sekali di iOS.
 *
 * Di Android, browser sudah menyediakan event `beforeinstallprompt` yang
 * kita manfaatkan untuk tombol install native (lebih smooth daripada
 * instruksi manual).
 */
export default function InstallPrompt({ user }) {
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const [androidPromptEvent, setAndroidPromptEvent] = useState(null)
  const [showAndroidBanner, setShowAndroidBanner] = useState(false)

  useEffect(() => {
    if (!user) return // cuma tampil untuk user yang sudah login
    if (isStandaloneMode()) return // sudah di-install, tidak perlu nampilin apa-apa
    if (wasDismissedRecently()) return

    if (isIOS()) {
      setShowIOSBanner(true)
      return
    }

    // Android/Chrome: tunggu event beforeinstallprompt sebelum nampilin banner
    const handler = (e) => {
      e.preventDefault()
      setAndroidPromptEvent(e)
      setShowAndroidBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [user])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowIOSBanner(false)
    setShowAndroidBanner(false)
  }

  const handleAndroidInstall = async () => {
    if (!androidPromptEvent) return
    androidPromptEvent.prompt()
    await androidPromptEvent.userChoice
    setAndroidPromptEvent(null)
    setShowAndroidBanner(false)
  }

  if (!showIOSBanner && !showAndroidBanner) return null

  return (
    <div style={{
      position: 'fixed', bottom: 78, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)', maxWidth: 460,
      background: '#0d1710', border: '1px solid rgba(37,211,102,0.25)',
      borderRadius: 16, padding: '14px 16px', zIndex: 900,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>📲</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {showIOSBanner ? (
          <>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', marginBottom: 2 }}>
              Install Verneks biar tetap login
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.73rem', lineHeight: 1.5 }}>
              Tap ikon <strong>Share</strong> (kotak dengan panah ke atas) di Safari, lalu pilih <strong>"Add to Home Screen"</strong> — biar tidak logout sendiri & notifikasi Diah Anna bisa masuk.
            </div>
          </>
        ) : (
          <>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', marginBottom: 2 }}>
              Install Verneks ke HP kamu
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.73rem', lineHeight: 1.5 }}>
              Biar tetap login & notifikasi Diah Anna lebih lancar.
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {showAndroidBanner && (
          <button
            onClick={handleAndroidInstall}
            style={{
              background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '7px 14px',
              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
            fontSize: '0.72rem', cursor: 'pointer', padding: '4px 0',
          }}
        >
          Nanti aja
        </button>
      </div>
    </div>
  )
}
