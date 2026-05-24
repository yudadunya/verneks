export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, userId } = req.body

  if (!phone || !userId) {
    return res.status(400).json({ error: 'Data tidak lengkap.' })
  }

  // Format nomor
  let formattedPhone = phone.replace(/\D/g, '')
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1)
  }
  if (!formattedPhone.startsWith('62')) {
    formattedPhone = '62' + formattedPhone
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  try {
    // Simpan OTP ke Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const { error: insertError } = await supabase.from('otp_verification').insert({
      user_id: userId,
      phone_wa: formattedPhone,
      otp_code: otp,
      verified: false,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('Supabase error:', insertError)
      return res.status(500).json({ error: 'Gagal simpan OTP: ' + insertError.message })
    }

    // Kirim via Fonnte
    const message = `Kode verifikasi LamarCerdas kamu:\n\n*${otp}*\n\nBerlaku 5 menit.`
    
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': process.env.FONNTE_TOKEN },
      body: new URLSearchParams({ target: formattedPhone, message }),
    })

    return res.status(200).json({ success: true })

  } catch (error) {
    console.error('Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
