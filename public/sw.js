// public/sw.js
// ⚠️  FILE INI AKAN DITIMPA OTOMATIS oleh vite-plugin-pwa saat `npm run build`
// Ini hanya fallback untuk development / sebelum plugin terpasang.

const CACHE = 'lamarcerdas-v3'

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

  // Navigasi SPA — fallback ke index.html kalau offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Aset statis — cache first
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
