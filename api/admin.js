import { createClient } from '@supabase/supabase-js'

// KEAMANAN: Service Role Key HANYA hidup di server (env var tanpa prefix VITE_).
// JANGAN PERNAH expose endpoint ini tanpa cek password di setiap request.
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { password, action, count } = req.body

  // Verifikasi password di SETIAP request — bukan sekali lalu "authed" selamanya.
  // ADMIN_PASSWORD (tanpa prefix VITE_) — hanya ada di server, tidak pernah masuk ke bundle JS.
  if (!process.env.ADMIN_PASSWORD) {
    console.error('[admin] ADMIN_PASSWORD env var belum diset!')
    return res.status(500).json({ error: 'Admin belum dikonfigurasi.' })
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password salah.' })
  }

  try {
    if (action === 'list') {
      const { data, error } = await supabase
        .from('redeem_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return res.status(200).json({ codes: data || [] })
    }

    if (action === 'generate') {
      const n = Math.min(Math.max(Number(count) || 1, 1), 20) // batasi 1-20 sekali generate
      const newCodes = Array.from({ length: n }, () => ({
        code: generateCode(),
        created_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('redeem_codes').insert(newCodes)
      if (error) throw error

      const { data } = await supabase
        .from('redeem_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      return res.status(200).json({ codes: data || [] })
    }

    return res.status(400).json({ error: 'Action tidak valid.' })
  } catch (error) {
    console.error('[admin] error:', error)
    return res.status(500).json({ error: 'Terjadi kesalahan server.' })
  }
}
