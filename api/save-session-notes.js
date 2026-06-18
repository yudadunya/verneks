// api/save-session-notes.js
// Dipanggil otomatis di akhir setiap sesi chat (setelah user kirim >= 5 pesan)
// Menyimpan highlights, emotional state, dan action items dari sesi ini
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, messages, profile } = req.body
  if (!userId || !messages?.length) return res.status(400).json({ error: 'Missing data' })

  // Ambil 20 pesan terakhir untuk analisis
  const recentMessages = messages.slice(-20)
  const convoText = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${(m.content || m.text || '').slice(0, 300)}`)
    .join('\n')

  const prompt = `Kamu adalah sistem analisis percakapan coaching karier.

Analisis percakapan ini dan ekstrak informasi penting dalam JSON:

Profil user:
- Nama: ${profile?.nama || 'User'}
- Target: ${profile?.target_posisi || '-'}
- Readiness: ${profile?.career_readiness || 0}%

Percakapan:
${convoText}

Kembalikan JSON (tanpa backtick):
{
  "highlights": "1-2 kalimat insight terpenting dari sesi ini — apa yang paling bermakna dari percakapan ini",
  "emotional_state": "kondisi emosional user dalam 2-3 kata (contoh: optimis dan bersemangat / ragu dan khawatir / frustrasi tapi mau coba)",
  "topics_covered": ["topik1", "topik2", "topik3"],
  "action_items": ["aksi konkret yang disepakati atau direncanakan user — maksimal 3"],
  "progress_notes": "1 kalimat: apakah ada tanda kemajuan atau kemunduran dibanding sesi sebelumnya"
}`

  try {
    const raw = await generateText({
      system: 'Kembalikan HANYA JSON valid.',
      prompt,
      maxTokens: 400,
      tier: 'fast',
      plan: 'premium',
    })

    let notes
    try {
      const clean = raw.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()
      notes = JSON.parse(clean)
    } catch {
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    // Simpan ke user_session_notes
    await supabase.from('user_session_notes').insert({
      user_id:        userId,
      session_date:   new Date().toISOString().split('T')[0],
      highlights:     notes.highlights || null,
      emotional_state:notes.emotional_state || null,
      topics_covered: notes.topics_covered || [],
      action_items:   notes.action_items || [],
      progress_notes: notes.progress_notes || null,
    })

    // Update total_sessions di user_growth_state
    await supabase.from('user_growth_state')
      .update({
        last_session_date: new Date().toISOString().split('T')[0],
        total_sessions: supabase.rpc('increment', { row_id: userId }),
      })
      .eq('user_id', userId)

    return res.status(200).json({ success: true, notes })
  } catch (e) {
    console.error('[save-session-notes]', e)
    return res.status(500).json({ error: e.message })
  }
}
