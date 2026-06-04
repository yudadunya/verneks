import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, pushToken } = req.body
  if (!userId || !pushToken) return res.status(400).json({ error: 'Missing userId or pushToken' })

  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ push_token: pushToken })
      .eq('id', userId)

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[save-push-token] error:', error)
    return res.status(500).json({ error: error.message })
  }
}
