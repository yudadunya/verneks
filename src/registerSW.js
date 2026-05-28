// src/registerSW.js
// File ini TETAP dipakai — tapi sekarang hanya untuk handle notifikasi update.
// SW-nya sendiri di-generate otomatis oleh vite-plugin-pwa saat build.

export function registerSW() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      console.log('SW registered:', reg.scope)

      // Cek update setiap 60 detik — user tidak perlu refresh manual
      setInterval(() => reg.update(), 60 * 1000)

      // Kalau ada SW baru yang waiting, langsung aktivasi
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // SW baru siap — skip waiting langsung tanpa nunggu tab ditutup
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })

      // Setelah SW baru take control, reload halaman biar user dapat versi terbaru
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })

    } catch (err) {
      console.error('SW registration failed:', err)
    }
  })
}
