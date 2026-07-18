// public/sw.js
// PENTING: vite-plugin-pwa TIDAK terpasang di project ini (vite.config.js
// tidak punya plugin itu) — jadi file ini BUKAN fallback sementara, ini
// yang benar-benar jalan di production. Komentar lama yang bilang "akan
// ditimpa vite-plugin-pwa" sudah tidak akurat, dihapus.

const CACHE = 'lamarcerdas-v4' // dinaikkan dari v3 supaya cache lama di browser user ke-invalidate

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // KRITIS: JANGAN pernah intercept request ke domain lain (Supabase auth,
  // Firebase, CDN, dll). Sebelumnya SW ini cuma skip '/api/' milik sendiri,
  // tapi tetap mencoba cache-first / offline-fallback untuk SEMUA request
  // cross-origin lain — termasuk panggilan auth/refresh-token Supabase.
  // Itu bisa bikin sesi login gagal aneh karena kena logic cache/offline SW
  // yang tidak seharusnya menyentuh request auth sama sekali.
  if (url.origin !== self.location.origin) return

  // API sendiri — selalu network
  if (url.pathname.startsWith('/api/')) return

  // Navigasi SPA — network dulu, fallback ke index.html kalau offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Aset statis situs sendiri — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      }).catch(() => new Response('', { status: 408, statusText: 'Offline' }))
    })
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
