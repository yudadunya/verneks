// api/lib/firebase-admin.js
// Firebase Admin SDK untuk send push notifications
import admin from 'firebase-admin'

// Initialize Firebase Admin (gunakan service account key)
if (!admin.apps.length) {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID || 'verneks-notif',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'verneks-notif'
  })
}

/**
 * Send push notification ke device user
 * @param {string} fcmToken - FCM token dari user browser
 * @param {string} title - Judul notifikasi
 * @param {string} body - Isi notifikasi
 * @param {object} data - Custom data (optional)
 */
export async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    return { error: 'FCM token missing' }
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      webpush: {
        fcmOptions: {
          link: 'https://verneks.my.id/dashboard'
        },
        notification: {
          title,
          body,
          icon: 'https://verneks.my.id/icon-192x192.png',
          badge: 'https://verneks.my.id/badge-72x72.png',
          click_action: 'https://verneks.my.id/dashboard'
        }
      }
    }

    const response = await admin.messaging().send(message, false, { tokens: [fcmToken] })
    console.log('[sendPushNotification] Success:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[sendPushNotification] Error:', error)
    return { error: error.message }
  }
}

/**
 * Send push ke multiple tokens (bulk)
 */
export async function sendPushToMultiple(fcmTokens, title, body, data = {}) {
  if (!fcmTokens || fcmTokens.length === 0) {
    return { error: 'No FCM tokens provided' }
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      webpush: {
        fcmOptions: {
          link: 'https://verneks.my.id/dashboard'
        },
        notification: {
          title,
          body,
          icon: 'https://verneks.my.id/icon-192x192.png',
          badge: 'https://verneks.my.id/badge-72x72.png',
          click_action: 'https://verneks.my.id/dashboard'
        }
      }
    }

    const response = await admin.messaging().sendMulticast({
      ...message,
      tokens: fcmTokens
    })

    console.log(`[sendPushToMultiple] Sent: ${response.successCount}, Failed: ${response.failureCount}`)
    return { 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    }
  } catch (error) {
    console.error('[sendPushToMultiple] Error:', error)
    return { error: error.message }
  }
}
