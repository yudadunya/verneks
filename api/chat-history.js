// api/chat-history.js
// GET  → load history hari ini
// POST → save/upsert history hari ini
//
// Menggunakan service role key untuk bypass RLS
// Fallback: kalau service role tidak ada, pakai anon key
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey     = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

// Pakai service role supaya bypass RLS sepenuhnya
const supabase = createClient(supabaseUrl, serviceKey || anonKey)

export default async function handler(req, res) {
  // Allow CORS untuk sendBeacon
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // Parse body — sendBeacon kirim sebagai text/plain kadang
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }

    // Parse query params — req.query kadang kosong di Vercel, fallback ke URL manual
    let query = req.query || {}
    if (!query.userId && req.url) {
      const urlObj = new URL(req.url, 'https://verneks.my.id')
      query = Object.fromEntries(urlObj.searchParams.entries())
    }

    const isGet   = req.method === 'GET'
    const userId  = isGet ? query.userId   : body?.userId
    const date    = isGet ? query.date     : body?.date
    const messages = isGet ? null          : body?.messages

    const daysBack = isGet ? (query.daysBack || 1) : null

    if (!userId) return res.status(400).json({ error: 'userId required' })

    // ── GET: load history hari ini ──────────────────────────
    if (isGet) {
      const today = new Date().toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('user_chat_history')
        .select('session_date, messages')
        .eq('user_id', userId)
        .eq('session_date', today)
        .maybeSingle()

      if (error) {
        console.error('[chat-history GET] error:', error.message, error.code)
        return res.status(500).json({ error: error.message, code: error.code })
      }

      return res.status(200).json({
        today: data?.messages || [],
      })
    }

    // ── POST: upsert history hari ini ──────────────────────
    if (req.method === 'POST') {
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' })
      }

      const sessionDate = date || new Date().toISOString().slice(0, 10)

      const { error } = await supabase
        .from('user_chat_history')
        .upsert({
          user_id:      userId,
          session_date: sessionDate,
          messages:     messages.slice(-50),
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'user_id,session_date' })

      if (error) {
        console.error('[chat-history POST] error:', error.message, error.code, error.details)
        return res.status(500).json({ error: error.message, code: error.code })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (err) {
    console.error('[chat-history] unexpected error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
