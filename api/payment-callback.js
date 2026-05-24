import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const notification = req.body

  // Verify signature Midtrans
  const hash = crypto
    .createHash('sha512')
    .update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest('hex')

  if (hash !== notification.signature_key) {
    return res.status(403).json({ error: 'Invalid signature' })
  }

  const { order_id, transaction_status, fraud_status } = notification

  // Parse order_id: LC-STARTER-userid-timestamp
  const parts = order_id.split('-')
  const plan = parts[1].toLowerCase() // starter, pro, platinum

  const isSuccess = 
    (transaction_status === 'capture' && fraud_status === 'accept') ||
    transaction_status === 'settlement'

  if (!isSuccess) {
    return res.status(200).json({ status: 'not success' })
  }

  try {
    // Cari user berdasarkan order_id
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('midtrans_order_id', order_id)
      .single()

    if (!existingSub) {
      return res.status(200).json({ status: 'order not found' })
    }

    const userId = existingSub.user_id

    // Hitung expires_at (30 hari)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Update subscription
    await supabase
      .from('subscriptions')
      .update({
        plan: plan,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq('midtrans_order_id', order_id)

    // Kirim WA selamat datang ke paket baru
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('phone_wa')
      .eq('id', userId)
      .single()

    if (profile?.phone_wa) {
      const planNames = {
        starter: 'Starter',
        pro: 'Pro',
        platinum: 'Platinum'
      }

      const welcomeMsg = `Yeay, pembayaran berhasil! 🎉\n\nSelamat datang di paket ${planNames[plan]} LamarCerdas!\n\nSaya Diah Anna siap bantu karir kamu sekarang 💪\n\nMau mulai dari mana dulu?`

      await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': process.env.FONNTE_TOKEN },
        body: new URLSearchParams({
          target: profile.phone_wa,
          message: welcomeMsg,
        }),
      })
    }

    return res.status(200).json({ status: 'ok' })

  } catch (error) {
    console.error('Callback error:', error)
    return res.status(500).json({ error: error.message })
  }
}
