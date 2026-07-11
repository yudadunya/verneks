// public/firebase-messaging-sw.js
// Service Worker untuk handle Firebase push notifications
// File ini harus di /public folder

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: 'AIzaSyAVP1_bVJN5bmZFGpKo3dXth-b7aj1CX94',
  authDomain: 'verneks-notif.firebaseapp.com',
  projectId: 'verneks-notif',
  storageBucket: 'verneks-notif.firebasestorage.app',
  messagingSenderId: '327640011095',
  appId: '1:327640011095:web:7d3c08ad62d3ad425c2e12',
  measurementId: 'G-1HWTF155KZ'
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

// Handle push notification saat app tutup
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message:', payload)

  const { notification, data } = payload
  const notificationTitle = notification?.title || 'Diah Anna'
  const notificationOptions = {
    body: notification?.body || 'Ada pesan untukmu',
    icon: 'https://verneks.my.id/icon-192x192.png',
    badge: 'https://verneks.my.id/badge-72x72.png',
    tag: data?.type || 'default',
    data: data || {},
    click_action: 'https://verneks.my.id/dashboard'
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event.notification)
  event.notification.close()
  
  // Buka tab/window verneks
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === 'https://verneks.my.id/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://verneks.my.id/dashboard')
      }
    })
  )
})
