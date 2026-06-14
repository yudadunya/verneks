import { getAccessContext, supabaseAdmin } from './lib/access.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const access = await getAccessContext(req)
  if (access.error) return res.status(access.status || 500).json({ error: access.error })

  const { code } = req.body
  const userId = access.userId
  if (!code) return res.status(400).json({ error: 'Kode redeem wajib diisi.' })

  const cleanCode = code.trim().toUpperCase()
  const now = new Date()

  // 1. Ambil lock kode secara atomik: hanya update jika belum pernah dipakai
  const { data: claimedCode, error: claimErr } = await supabaseAdmin
    .from('redeem_codes')
    .update({ used_by: userId, used_at: now.toISOString() })
    .eq('code', cleanCode)
    .is('used_by', null)
    .select('code')
    .maybeSingle()

  if (claimErr) {
    console.error('claimErr:', claimErr)
    return res.status(500).json({ error: 'Gagal memproses kode redeem.', detail: claimErr.message })
  }

  if (!claimedCode) {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('redeem_codes')
      .select('code, used_by')
      .eq('code', cleanCode)
      .maybeSingle()

    if (fetchErr) {
      console.error('fetchErr:', fetchErr)
      return res.status(500).json({ error: 'Gagal mengecek kode redeem.', detail: fetchErr.message })
    }

    if (!existing) return res.status(404).json({ error: 'Kode tidak ditemukan.' })
    return res.status(409).json({ error: 'Kode sudah pernah digunakan.' })
  }

  // 2. Extend premium dari expiry aktif saat ini, bukan selalu dari sekarang
  const { data: currentSub } = await supabaseAdmin
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  const baseDate = currentSub?.expires_at && new Date(currentSub.expires_at) > now
    ? new Date(currentSub.expires_at)
    : now

  const expiry = new Date(baseDate)
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

  if (subErr) {
    console.error('subErr:', JSON.stringify(subErr))
    await supabaseAdmin
      .from('redeem_codes')
      .update({ used_by: null, used_at: null })
      .eq('code', cleanCode)
      .eq('used_by', userId)

    return res.status(500).json({ error: 'Gagal mengaktifkan premium', detail: subErr.message })
  }

  return res.status(200).json({ success: true, expires_at: expiry.toISOString() })
}
