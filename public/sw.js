// public/sw.js
// ⚠️  FILE INI AKAN DITIMPA OTOMATIS oleh vite-plugin-pwa saat `npm run build`
// Ini hanya fallback untuk development / sebelum plugin terpasang.

// FIX: Bump versi setiap deploy baru agar SW lama otomatis terganti
// Versi lama (v3) bikin user stuck karena JS bundle lama ter-cache
const CACHE = 'lamarcerdas-v4'

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

  // API — selalu network
  if (url.pathname.startsWith('/api/')) return

  // Navigasi SPA — network-first, fallback ke index.html kalau offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // JS/CSS Vite bundles (punya hash di nama file, aman di-cache lama)
  // tapi index.html dan manifest TIDAK boleh cache-first (selalu ambil terbaru)
  const isHashedAsset = /\.(js|css)\?v=/.test(url.search) ||
                        /\/assets\/[^/]+-[a-f0-9]{8}\.(js|css)$/.test(url.pathname)

  if (isHashedAsset) {
    // Cache-first untuk hashed assets — aman karena nama file berubah tiap build
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
    return
  }

  // Gambar publik (diah-anna.png, icons) — cache-first ok
  if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)) {
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
    return
  }

  // Semua lainnya (termasuk index.html, manifest.json) — network-first
  // FIX UTAMA: index.html yang stale = JS bundle lama = bug lama tetap ada
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || new Response('', { status: 408, statusText: 'Offline' }))
      )
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
