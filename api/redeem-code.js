// api/redeem-code.js
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service role key — bisa bypass RLS
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, userId } = req.body
  if (!code || !userId) return res.status(400).json({ error: 'Missing code or userId' })

  const cleanCode = code.trim().toUpperCase()

  // 1. Cek kode ada & belum dipakai
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('redeem_codes')
    .select('code, used_by')
    .eq('code', cleanCode)
    .maybeSingle()

  if (fetchErr || !row) return res.status(404).json({ error: 'Kode tidak ditemukan' })
  if (row.used_by)      return res.status(409).json({ error: 'Kode sudah pernah digunakan' })

  // 2. Tandai kode sudah dipakai
  const { error: updateErr } = await supabaseAdmin
    .from('redeem_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', cleanCode)

  if (updateErr) return res.status(500).json({ error: 'Gagal memproses kode' })

  // 3. Insert subscription premium 30 hari
  const now    = new Date()
  const expiry = new Date(now)
  expiry.setDate(expiry.getDate() + 30)

  const { error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id:    userId,
      plan:       'premium',
      status:     'active',
      created_at: now.toISOString(),
      expires_at: expiry.toISOString(),
    }, { onConflict: 'user_id' })

  if (subErr) return res.status(500).json({ error: 'Gagal mengaktifkan premium' })

  return res.status(200).json({ success: true, expires_at: expiry.toISOString() })
}
