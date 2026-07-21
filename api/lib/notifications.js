// api/lib/notifications.js
// Unified notifications service — Email + Push notifications
// Menggabungkan: email.js + firebase-admin.js

import nodemailer from 'nodemailer'
import admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'

// ────── NODEMAILER SETUP ──────────────────────────────────────────────────
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
})

// ────── FIREBASE ADMIN SETUP ──────────────────────────────────────────────
// PENTING: seluruh blok ini dibungkus try/catch, termasuk pengecekan
// admin.apps.length. Kalau tidak, error apapun di sini (termasuk
// ketidakcocokan import CJS/ESM firebase-admin) akan CRASH TOTAL proses
// Node — dan karena file ini di-import di level atas oleh api/cron/jobs.js,
// itu bikin SELURUH cron job (weekly-review, send-chat-reminders, dst) ikut
// mati, bukan cuma fitur push notification-nya saja.
let firebaseAdminReady = false
try {
  if (!admin.apps?.length) {
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
  firebaseAdminReady = true
} catch (e) {
  console.warn('[notifications] Firebase Admin init gagal/skip:', e.message)
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ═════════════════════════════════════════════════════════════════════════
// EMAIL FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Send chat reminder email (2 hari tidak chat)
 */
export async function sendChatReminderEmail(userEmail, userName, pendingStepTitle) {
  if (!userEmail) return { error: 'Email not found' }

  const firstName = userName?.split(' ')[0] || 'Teman'
  const stepLine = pendingStepTitle
    ? `Langkah selanjutnya yang masih menunggu di roadmap kamu: <strong>${pendingStepTitle}</strong>.`
    : 'Kesuksesan karier dibangun dari konsistensi kecil setiap hari. Jangan biarkan ritmemu hilang — satu percakapan hari ini bisa mengubah arah perjalananmu.'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; line-height: 1.6; color: #333; }
        .message { background-color: #f9f9f9; border-left: 4px solid #25D366; padding: 15px; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-button { background-color: #25D366; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 Halo, ${firstName}!</h1>
        </div>
        <div class="content">
          <p>Aku perhatiin kalau kita sudah 2 hari tidak ngobrol.</p>
          
          <div class="message">
            <p><strong>Momentum itu penting, ${firstName}.</strong></p>
            <p>${stepLine}</p>
          </div>

          <p>Target kariermu masih di depan. Aku di sini siap membantu kamu melangkah lebih dekat.</p>

          <div class="cta">
            <a href="https://verneks.my.id/chat" class="cta-button">💬 Tanya Diah Anna Sekarang</a>
          </div>

          <p style="color: #666; font-size: 14px;">Atau buka Verneks dan mulai ngobrol dengan Diah Anna kapan saja.</p>
        </div>
        <div class="footer">
          <p>Email ini dikirim dari Diah Anna, AI Career Mentor Verneks</p>
          <p>© 2024 Verneks. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await emailTransporter.sendMail({
      from: `"Diah Anna - Verneks" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `${firstName}, mari kita lanjutkan perjalanan karier kamu 🚀`,
      html: htmlContent,
    })
    return { success: true }
  } catch (error) {
    console.error('[sendChatReminderEmail]', error)
    return { error: error.message }
  }
}

/**
 * Send weekly review email
 */
export async function sendWeeklyReviewEmail(userEmail, userName, reviewText) {
  if (!userEmail || !reviewText) return { error: 'Email or review text missing' }

  const firstName = userName?.split(' ')[0] || 'Teman'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5, #06B6D4); color: #fff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 20px; line-height: 1.7; color: #333; }
        .review-section { background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.05)); border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .review-section h3 { margin: 0 0 12px 0; color: #4F46E5; font-size: 16px; }
        .review-text { color: #333; font-size: 15px; line-height: 1.8; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-button { background-color: #25D366; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Weekly Review Minggu Ini</h1>
          <p>Catatan personal dari Diah Anna untuk ${firstName}</p>
        </div>
        <div class="content">
          <p>Halo ${firstName},</p>
          
          <p>Minggu ini sudah berjalan dengan langkah-langkah penting menuju target kariermu. Berikut adalah refleksi mingguan dari aku:</p>

          <div class="review-section">
            <h3>💬 Catatan Diah Anna</h3>
            <div class="review-text">${reviewText.replace(/\n/g, '<br>')}</div>
          </div>

          <p>Terus pertahankan momentum ini, ${firstName}. Setiap langkah kecil hari ini adalah bagian dari kesuksesan besar di masa depan.</p>

          <div class="cta">
            <a href="https://verneks.my.id/dashboard" class="cta-button">📊 Lihat Dashboard Lengkap</a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">Buka Verneks untuk melihat progress detail, milestones yang sudah dicapai, dan roadmap selengkapnya.</p>
        </div>
        <div class="footer">
          <p>Email ini adalah review mingguan personal dari Diah Anna, AI Career Mentor Verneks</p>
          <p>© 2024 Verneks. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await emailTransporter.sendMail({
      from: `"Diah Anna - Verneks" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `📝 Weekly Review: Refleksi Minggu Ini dari Diah Anna`,
      html: htmlContent,
    })
    return { success: true }
  } catch (error) {
    console.error('[sendWeeklyReviewEmail]', error)
    return { error: error.message }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATION FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Send push notification ke single device
 */
export async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) return { error: 'FCM token missing' }
  if (!firebaseAdminReady) return { error: 'Firebase Admin belum siap (config/env belum lengkap)' }

  try {
    const message = {
      notification: { title, body },
      data: { ...data, timestamp: new Date().toISOString() },
      webpush: {
        fcmOptions: { link: 'https://verneks.my.id/dashboard' },
        notification: {
          title, body,
          icon: 'https://verneks.my.id/icon-192x192.png',
          badge: 'https://verneks.my.id/badge-72x72.png',
          click_action: 'https://verneks.my.id/dashboard'
        }
      }
    }

    const response = await admin.messaging().send(message)
    console.log('[sendPushNotification] Success:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[sendPushNotification]', error)
    return { error: error.message }
  }
}

/**
 * Send chat reminder push
 */
export async function sendChatReminderPush(fcmToken, userName, pendingStepTitle) {
  const firstName = userName?.split(' ')[0] || 'Teman'
  return sendPushNotification(
    fcmToken,
    '💬 Halo ' + firstName,
    pendingStepTitle
      ? `Langkah "${pendingStepTitle}" masih menunggu kamu. Yuk lanjutkan!`
      : 'Kita sudah 2 hari tidak ngobrol. Mari lanjutkan perjalanan karier kamu!',
    { type: 'chat-reminder', action: 'open-chat' }
  )
}

/**
 * Send onboarding nudge email — user sudah selesai Discovery (Career DNA
 * jadi) tapi belum mulai chat coaching pertama dalam ~24 jam.
 */
export async function sendOnboardingNudgeEmail(userEmail, userName) {
  if (!userEmail) return { error: 'Email not found' }
  const firstName = userName?.split(' ')[0] || 'Teman'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .content { padding: 30px 20px; line-height: 1.6; color: #333; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-button { background-color: #25D366; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🧬 Career DNA kamu udah siap, ${firstName}!</h1></div>
        <div class="content">
          <p>Kemarin kamu sudah cerita ke Diah Anna dan Career DNA kamu sudah jadi — tapi kelihatannya belum sempat lanjut ngobrol lagi.</p>
          <p>Roadmap dan langkah-langkah konkret buat kariermu udah nunggu di sana. Yuk lanjutkan sekarang, mumpung momentumnya masih ada.</p>
          <div class="cta">
            <a href="https://verneks.my.id/chat" class="cta-button">💬 Lanjut Ngobrol dengan Diah Anna</a>
          </div>
        </div>
        <div class="footer">
          <p>Email ini dikirim dari Diah Anna, AI Career Mentor Verneks</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await emailTransporter.sendMail({
      from: `"Diah Anna - Verneks" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `${firstName}, Career DNA kamu udah siap 🧬`,
      html: htmlContent,
    })
    return { success: true }
  } catch (error) {
    console.error('[sendOnboardingNudgeEmail]', error)
    return { error: error.message }
  }
}

export async function sendOnboardingNudgePush(fcmToken, userName) {
  const firstName = userName?.split(' ')[0] || 'Teman'
  return sendPushNotification(
    fcmToken,
    '🧬 Career DNA kamu udah siap!',
    `${firstName}, yuk lanjut ngobrol sama Diah Anna buat mulai langkah pertama roadmap kamu.`,
    { type: 'onboarding-nudge', action: 'open-chat' }
  )
}

export async function notifyOnboardingNudge(userEmail, fcmToken, userName) {
  const results = {}
  if (userEmail) results.email = await sendOnboardingNudgeEmail(userEmail, userName)
  if (fcmToken) results.push = await sendOnboardingNudgePush(fcmToken, userName)
  return results
}

/**
 * Send instant push saat user checklist 1 langkah GPS roadmap selesai
 */
export async function sendMilestoneCompletePush(fcmToken, userName, stepTitle) {
  const firstName = userName?.split(' ')[0] || 'Teman'
  return sendPushNotification(
    fcmToken,
    `🎉 Mantap, ${firstName}!`,
    stepTitle ? `Langkah "${stepTitle}" udah kamu selesaikan. Yuk lanjut ke langkah berikutnya!` : 'Satu langkah lagi selesai. Yuk lanjut ke langkah berikutnya!',
    { type: 'milestone-complete', action: 'open-journey' }
  )
}

/**
 * Send weekly review push
 */
export async function sendWeeklyReviewPush(fcmToken, userName) {
  const firstName = userName?.split(' ')[0] || 'Teman'
  return sendPushNotification(
    fcmToken,
    '📝 Weekly Review Minggu Ini',
    `${firstName}, ada catatan refleksi mingguan dari Diah Anna untukmu!`,
    { type: 'weekly-review', action: 'open-dashboard' }
  )
}

/**
 * Send push ke multiple devices
 */
export async function sendPushToMultiple(fcmTokens, title, body, data = {}) {
  if (!fcmTokens || fcmTokens.length === 0) {
    return { error: 'No FCM tokens provided' }
  }
  if (!firebaseAdminReady) return { error: 'Firebase Admin belum siap (config/env belum lengkap)' }

  try {
    const message = {
      notification: { title, body },
      data: { ...data, timestamp: new Date().toISOString() },
      webpush: {
        fcmOptions: { link: 'https://verneks.my.id/dashboard' },
        notification: {
          title, body,
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
    }
  } catch (error) {
    console.error('[sendPushToMultiple]', error)
    return { error: error.message }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// COMBINED FUNCTIONS (Email + Push)
// ═════════════════════════════════════════════════════════════════════════

/**
 * Send chat reminder via both email & push
 */
export async function notifyChatReminder(userEmail, fcmToken, userName, pendingStepTitle) {
  const results = {}

  // Send email
  if (userEmail) {
    results.email = await sendChatReminderEmail(userEmail, userName, pendingStepTitle)
  }

  // Send push
  if (fcmToken) {
    results.push = await sendChatReminderPush(fcmToken, userName, pendingStepTitle)
  }

  return results
}

/**
 * Send weekly review via both email & push
 */
export async function notifyWeeklyReview(userEmail, fcmToken, userName, reviewText) {
  const results = {}

  // Send email
  if (userEmail) {
    results.email = await sendWeeklyReviewEmail(userEmail, userName, reviewText)
  }

  // Send push
  if (fcmToken) {
    results.push = await sendWeeklyReviewPush(fcmToken, userName)
  }

  return results
}

/**
 * Get user FCM token dari database
 */
export async function getUserFcmToken(userId) {
  try {
    const { data, error } = await supabase
      .from('user_push_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data?.fcm_token || null
  } catch (error) {
    console.error('[getUserFcmToken]', error)
    return null
  }
}

/**
 * Save FCM token ke database
 */
export async function saveFcmToken(userId, fcmToken) {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        fcm_token: fcmToken,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('[saveFcmToken]', error)
    return { error: error.message }
  }
}
