// src/lib/firebase.js
// Firebase client-side setup untuk push notifications — ditulis ulang dari
// nol (bukan tambal-sulam), tetap pakai nama fungsi yang sama supaya tidak
// perlu ubah App.jsx / Profile.jsx lagi.
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

// TODO: GANTI dengan Web Push certificate BARU dari Firebase Console
// (Project Settings > Cloud Messaging > Web Push certificates > generate
// key pair baru). Ini satu-satunya variabel yang belum pernah benar-benar
// diganti dari semua percobaan sebelumnya.
const VAPID_KEY = 'BM1tJxYCQLK1zgHpabUjHY-JvyBHPOYlQzaQ7N_Gvfs7TzL60Pd48shzDwYQj_vnbMrOmgWapS3CgMJfXAARYZ0'

const app = initializeApp(firebaseConfig)
export const messaging = getMessaging(app)

let swRegistration = null

/**
 * Daftarkan service worker (public/firebase-messaging-sw.js). Dipanggil
 * sekali di awal, hasilnya disimpan supaya getToken() bisa pakai registrasi
 * yang sama persis — bukan biarkan Firebase mendaftarkan sendiri secara
 * implisit.
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[firebase] Service Worker tidak didukung browser ini')
    return null
  }
  try {
    swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    await navigator.serviceWorker.ready
    console.log('[firebase] Service Worker aktif untuk push notifications')
    return swRegistration
  } catch (err) {
    console.error('[firebase] Gagal registrasi Service Worker:', err)
    return null
  }
}

async function fetchAndSaveFcmToken(userId) {
  if (!swRegistration) {
    swRegistration = await navigator.serviceWorker.ready
  }
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  })
  if (!token) {
    console.warn('[firebase] getToken() tidak mengembalikan token')
    return null
  }
  console.log('[firebase] FCM Token:', token)
  if (userId) {
    try {
      await fetch('/api/utils?action=save-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token }),
      })
    } catch (err) {
      console.error('[firebase] Gagal simpan token ke server:', err)
    }
  }
  return token
}

/**
 * Dipanggil dari TOMBOL (gesture user asli) — boleh memicu prompt izin
 * browser kalau status masih 'default'.
 */
export async function requestNotificationPermission(userId) {
  try {
    if (!('serviceWorker' in navigator)) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[firebase] User menolak izin notifikasi')
      return null
    }
    return await fetchAndSaveFcmToken(userId)
  } catch (err) {
    console.error('[firebase] Error requestNotificationPermission:', err)
    return null
  }
}

/**
 * Dipanggil OTOMATIS tiap login (tanpa gesture) — HANYA jalan kalau izin
 * browser SUDAH 'granted' dari sebelumnya.
 */
export async function refreshFcmTokenIfGranted(userId) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null
    if (!('serviceWorker' in navigator)) return null
    return await fetchAndSaveFcmToken(userId)
  } catch (err) {
    console.error('[firebase] Error refreshFcmTokenIfGranted:', err)
    return null
  }
}

/**
 * Listener pesan saat app di foreground (tab sedang aktif/terbuka).
 */
export function listenForMessages(onMessageCallback) {
  onMessage(messaging, (payload) => {
    if (onMessageCallback) onMessageCallback(payload)
  })
}
