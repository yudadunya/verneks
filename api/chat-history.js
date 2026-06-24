// api/chat-history.js
// GET  → load history (hari ini + N hari sebelumnya)
// POST → save/upsert history hari ini
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { userId, date, messages, daysBack = 7 } = req.method === 'GET'
    ? req.query
    : req.body

  if (!userId) return res.status(400).json({ error: 'userId required' })

  // ── GET: load history ──────────────────────────────────────
  if (req.method === 'GET') {
    const today = new Date().toISOString().slice(0, 10)

    // Ambil hari ini + N hari sebelumnya (untuk tombol "percakapan sebelumnya")
    const { data, error } = await supabase
      .from('user_chat_history')
      .select('session_date, messages')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(Number(daysBack))

    if (error) return res.status(500).json({ error: error.message })

    // Pisah: hari ini vs sebelumnya
    const todayRow  = data?.find(r => r.session_date === today)
    const prevRows  = data?.filter(r => r.session_date !== today) || []

    return res.status(200).json({
      today:    todayRow?.messages || [],
      previous: prevRows.map(r => ({
        date:     r.session_date,
        messages: r.messages,
      })),
    })
  }

  // ── POST: upsert history hari ini ─────────────────────────
  if (req.method === 'POST') {
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' })
    }

    const sessionDate = date || new Date().toISOString().slice(0, 10)

    // UPSERT: kalau baris hari ini sudah ada → update, kalau belum → insert
    const { error } = await supabase
      .from('user_chat_history')
      .upsert({
        user_id:      userId,
        session_date: sessionDate,
        messages:     messages.slice(-100), // max 100 pesan per hari
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id,session_date' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
