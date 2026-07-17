import { useEffect, useState } from 'react'

const SEEN_MODAL_KEY = 'lc_install_modal_seen'

function isStandaloneMode() {
  return (
    window.navigator.standalone === true || // iOS Safari
    window.matchMedia?.('(display-mode: standalone)').matches // Android/desktop PWA
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * Alur:
 * 1. First login (belum pernah lihat modal & belum install) → modal PENUH,
 *    susah dilewatkan, jelasin kenapa penting (bukan cuma dekorasi).
 * 2. Setelah ditutup sekali (install atau "Nanti") → turun jadi BADGE KECIL
 *    PERMANEN mengambang, TIDAK hilang sampai user benar-benar install.
 *    Beda dari sebelumnya yang bisa di-dismiss 7 hari — badge ini memang
 *    didesain untuk terus "mengingatkan" tanpa mengganggu penuh.
 * 3. Begitu app sudah standalone (ke-install), komponen ini otomatis
 *    berhenti render sama sekali.
 */
export default function InstallPrompt({ user }) {
  const [installed, setInstalled]   = useState(isStandaloneMode())
  const [showModal, setShowModal]   = useState(false)
  const [androidEvent, setAndroidEvent] = useState(null)

  useEffect(() => {
    if (!user || installed) return

    const seenModal = localStorage.getItem(SEEN_MODAL_KEY) === '1'
    if (!seenModal) setShowModal(true)

    if (!isIOS()) {
      const handler = (e) => { e.preventDefault(); setAndroidEvent(e) }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [user, installed])

  // Kalau ternyata sudah standalone pas mount tapi state awal miss (edge case
  // display-mode berubah setelah install), re-check sesekali.
  useEffect(() => {
    const check = () => { if (isStandaloneMode()) setInstalled(true) }
    window.addEventListener('visibilitychange', check)
    return () => window.removeEventListener('visibilitychange', check)
  }, [])

  const closeModal = () => {
    localStorage.setItem(SEEN_MODAL_KEY, '1')
    setShowModal(false)
  }

  const handleAndroidInstall = async () => {
    if (!androidEvent) return
    androidEvent.prompt()
    const choice = await androidEvent.userChoice
    if (choice?.outcome === 'accepted') setInstalled(true)
    setAndroidEvent(null)
    closeModal()
  }

  if (!user || installed) return null

  return (
    <>
      {/* Badge kecil permanen — selalu ada selama belum install, klik untuk
          buka lagi instruksi lengkapnya */}
      {!showModal && (
        <button
          onClick={() => setShowModal(true)}
          style={{
            position: 'fixed', bottom: 78, right: 14, zIndex: 850,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg,#25D366,#128C7E)',
            color: '#fff', border: 'none', borderRadius: 999,
            padding: '9px 14px', fontSize: '0.75rem', fontWeight: 700,
            boxShadow: '0 4px 14px rgba(37,211,102,0.4)', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          📲 Install App
        </button>
      )}

      {showModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, backdropFilter: 'blur(3px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 'calc(100% - 40px)', maxWidth: 400,
            background: '#0d1710', border: '1px solid rgba(37,211,102,0.25)',
            borderRadius: 20, zIndex: 1001, padding: '24px 22px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            <div style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: 10 }}>📲</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', textAlign: 'center', marginBottom: 8 }}>
              Install Verneks ke HP kamu
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.83rem', lineHeight: 1.6, textAlign: 'center', marginBottom: 18 }}>
              Supaya kamu <strong>tidak logout sendiri</strong> dan supaya <strong>notifikasi Diah Anna bisa masuk</strong> ke HP kamu. Ini bukan opsional teknis — di iPhone, notifikasi memang cuma bisa jalan kalau sudah di-install.
            </div>

            {isIOS() ? (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ color: '#fff', fontSize: '0.8rem', lineHeight: 1.8 }}>
                  <div><strong>1.</strong> Tap ikon <strong>Share</strong> (kotak dengan panah ke atas) di bar bawah Safari</div>
                  <div><strong>2.</strong> Scroll & pilih <strong>"Add to Home Screen"</strong></div>
                  <div><strong>3.</strong> Tap <strong>"Add"</strong> di pojok kanan atas</div>
                </div>
              </div>
            ) : androidEvent ? (
              <button
                onClick={handleAndroidInstall}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 10 }}
              >
                Install Sekarang
              </button>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                Buka menu browser (⋮) → pilih <strong>"Add to Home screen"</strong> atau <strong>"Install app"</strong>
              </div>
            )}

            <button
              onClick={closeModal}
              style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', padding: '8px' }}
            >
              Nanti aja
            </button>
          </div>
        </>
      )}
    </>
  )
}
