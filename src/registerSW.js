export function registerSW() {
  if (!('serviceWorker' in navigator)) return

  // Tunggu sampai halaman selesai load sepenuhnya
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('SW registered:', reg.scope)

      // Kalau ada update SW baru, langsung aktifkan tanpa perlu refresh manual
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // SW baru sudah siap — kirim pesan untuk skip waiting
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })

      // Reload halaman saat SW baru sudah take control
      // (agar user langsung dapat versi terbaru)
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
