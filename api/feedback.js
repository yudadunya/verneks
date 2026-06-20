import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      userId,
      messageId, // ID dari career_coach_messages
      conversationId,
      feedbackType, // 'thumbs_up', 'thumbs_down', 'explicit'
      feedbackText,
      featureType,
      promptVersion
    } = req.body

    if (!userId || !messageId || !feedbackType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // ── UPDATE existing message di career_coach_messages ──
    // Tidak perlu insert baru — cukup update kolom feedback
    const { error: updateError } = await supabaseAdmin
      .from('career_coach_messages')
      .update({
        feedback_type: feedbackType,
        feedback_text: feedbackText,
        feature_type: featureType,
        conversation_id: conversationId,
        prompt_version: promptVersion
      })
      .eq('id', messageId)
      .eq('user_id', userId) // security: pastikan user own the message

    if (updateError) throw updateError

    // ── Simpan ke mentor_memory kalau feedback eksplisit ──
    // AI bisa belajar dari feedback ini di masa depan
    if (feedbackType === 'explicit' && feedbackText) {
      await supabaseAdmin
        .from('mentor_memory')
        .insert({
          user_id: userId,
          memory_type: 'user_feedback',
          memory_category: featureType,
          content: feedbackText,
          importance: feedbackType === 'thumbs_down' ? 8 : 5,
          metadata: {
            message_id: messageId,
            conversation_id: conversationId,
            feature_type: featureType
          }
        })
    }

    // ── Check threshold untuk trigger analysis ──
    await checkImprovementTrigger(featureType)

    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('[feedback] error:', e.message)
    return res.status(500).json({ error: 'Gagal menyimpan feedback' })
  }
}

async function checkImprovementTrigger(featureType) {
  try {
    // Hitung feedback negatif 7 hari terakhir dari career_coach_messages
    const { count } = await supabaseAdmin
      .from('career_coach_messages')
      .select('*', { count: 'exact', head: true })
      .eq('feature_type', featureType)
      .eq('feedback_type', 'thumbs_down')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Trigger kalau >= 10 thumbs down dalam 7 hari
    if (count >= 10) {
      setTimeout(() => {
        fetch(`${process.env.VERCEL_URL}/api/analyze-patterns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureType, triggerSource: 'feedback_threshold' })
        }).catch(() => {})
      }, 1000)
    }
  } catch (e) {
    console.error('[trigger] error:', e.message)
  }
}
