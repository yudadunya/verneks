import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role key, bukan anon key
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const notification = req.body

  // Verify signature
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
  const plan = parts[1].toLowerCase() // starter atau pro
  const userIdPrefix = parts[2]

  const isSuccess = transaction_status === 'capture' && fraud_status === 'accept'
    || transaction_status === 'settlement'

  if (isSuccess) {
    // Cari user berdasarkan prefix ID
    const { data: users } = await supabase
      .from('subscriptions')
      .select('user_id')
      .ilike('midtrans_order_id', `LC-${plan.toUpperCase()}-${userIdPrefix}%`)
      .limit(1)

    // Hitung expires_at (30 hari)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Upsert subscription
    await supabase.from('subscriptions').upsert({
      midtrans_order_id: order_id,
      plan: plan,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      started_at: new Date().toISOString(),
    }, { onConflict: 'midtrans_order_id' })
  }

  return res.status(200).json({ status: 'ok' })
}
