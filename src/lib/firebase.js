// src/lib/firebase.js
// Firebase client-side setup untuk push notifications
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyAVP1_bVJN5bmZFGpKo3dXth-b7aj1CX94',
  authDomain: 'verneks-notif.firebaseapp.com',
  projectId: 'verneks-notif',
  storageBucket: 'verneks-notif.firebasestorage.app',
  messagingSenderId: '327640011095',
  appId: '1:327640011095:web:7d3c08ad62d3ad425c2e12',
  measurementId: 'G-1HWTF155KZ'
}

const VAPID_KEY = 'BJYOyg5HLHhnsFm2UvhNxuytAspvB4PQJHzvvnQGg74mz1oDDteI0qirJPuXJ6KJYCR4A72rTxQUFA7LZKIzPfQ'

const app = initializeApp(firebaseConfig)
export const messaging = getMessaging(app)

/**
 * Request permission & get FCM token dari user browser
 * Simpan token ke Supabase untuk kirim push nanti
 */
export async function requestNotificationPermission(userId) {
  try {
    // Cek browser support
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker tidak didukung')
      return null
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('User denied notification permission')
      return null
    }

    // Get FCM token
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (!token) {
      console.warn('Gagal mendapat FCM token')
      return null
    }

    console.log('FCM Token:', token)

    // Simpan token ke Supabase
    if (userId) {
      await fetch('/api/utils?action=save-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token })
      })
    }

    return token
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return null
  }
}

/**
 * Listen for incoming messages
 * Dipanggil saat app aktif
 */
export function listenForMessages(onMessageCallback) {
  onMessage(messaging, (payload) => {
    console.log('Message received:', payload)
    
    const { notification, data } = payload
    
    if (onMessageCallback) {
      onMessageCallback({
        title: notification?.title,
        body: notification?.body,
        data: data
      })
    }

    // Tampilkan notification UI custom kalau perlu
    if (notification) {
      // Bisa show toast, modal, atau custom notification
      console.log(`Notifikasi: ${notification.title} - ${notification.body}`)
    }
  })
}

/**
 * Register service worker untuk handle push saat app tutup
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('Service Worker registered for push notifications')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}
