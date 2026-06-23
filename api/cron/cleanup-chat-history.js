// api/cron/cleanup-chat-history.js
// Hapus chat history > 3 hari setiap hari jam 03:00 UTC
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)

  const { error, count } = await supabase
    .from('user_chat_history')
    .delete({ count: 'exact' })
    .lt('session_date', cutoff)

  if (error) return res.status(500).json({ error: error.message })
  console.log(`[cleanup-chat-history] deleted ${count} rows older than ${cutoff}`)
  return res.status(200).json({ success: true, deleted: count, cutoff })
}
