import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { otp, userId, phone } = req.body

  if (!otp || !userId) {
    return res.status(400).json({ error: 'OTP dan user ID diperlukan.' })
  }

  // Cari OTP yang valid
  const { data: otpData, error } = await supabase
    .from('otp_verification')
    .select('*')
    .eq('user_id', userId)
    .eq('otp_code', otp)
    .eq('verified', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !otpData) {
    return res.status(400).json({ error: 'Kode OTP salah atau sudah expired.' })
  }

  // Mark OTP sebagai verified
  await supabase
    .from('otp_verification')
    .update({ verified: true })
    .eq('id', otpData.id)

  // Simpan nomor WA ke user_profiles
  await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      phone_wa: otpData.phone_wa,
      phone_verified: true,
    })

  return res.status(200).json({ success: true })
}
