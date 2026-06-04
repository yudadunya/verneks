// src/registerSW.js
// SW registration ditangani otomatis oleh vite-plugin-pwa (injectRegister: 'auto').
// File ini dipertahankan hanya untuk handle event update / notifikasi.
// JANGAN register ulang SW di sini — menyebabkan double registration.

export function registerSW() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    // Cukup listen controllerchange untuk reload saat ada SW baru
    // vite-plugin-pwa sudah handle register + skipWaiting + clientsClaim
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}
