const CACHE = 'lamarcerdas-v2'

// Aset statis yang HARUS selalu ada di cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// === INSTALL: cache aset penting dulu ===
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// === ACTIVATE: bersihkan cache lama ===
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// === FETCH: strategi cerdas per tipe request ===
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // 1. API calls — selalu network, jangan pernah cache
  if (url.pathname.startsWith('/api/')) return

  // 2. Navigasi HTML (user buka halaman / SPA route) 
  //    → coba network dulu, kalau gagal serve /index.html dari cache
  //    Ini yang fix masalah "stuck di memuat" setelah install PWA!
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // 3. Aset statis (JS, CSS, gambar, font) → Cache-First
  //    Kalau ada di cache langsung pakai, kalau tidak fetch & simpan
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached

      return fetch(e.request)
        .then(res => {
          // Hanya cache response yang valid
          if (!res || res.status !== 200 || res.type === 'opaque') {
            return res
          }
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return res
        })
        .catch(() => {
          // Fallback gambar / aset yang tidak tersedia
          return new Response('', { status: 408, statusText: 'Offline' })
        })
    })
  )
})

// === MESSAGE: handle perintah dari app ===
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
