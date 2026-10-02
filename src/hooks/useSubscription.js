import { supabase } from '../lib/supabase'

// Semua fitur Verneks GRATIS — tidak ada paket berbayar dan tidak ada kuota.
// Hook ini dipertahankan (dengan bentuk return yang sama) supaya komponen lama
// yang masih membacanya tidak error. 'premium' di sini hanya berarti
// "akses penuh"; tidak ada pembayaran, kedaluwarsa, atau batas pemakaian.
export const LIMITS = {
  free:    { chat: 999 },
  premium: { chat: 999 },
}

export const PLAN_LABEL = { free: 'Gratis', premium: 'Gratis' }

export function useSubscription(userId) {
  const plan = 'premium'

  const fetchPlan = async () => {}

  const getDaysRemaining = () => null

  // Selalu boleh chat. Pemakaian tetap dicatat (logUsage) hanya untuk statistik.
  const checkUsage = async () => true

  const getRemainingChat = async () => 999

  const logUsage = async (feature) => {
    if (!userId) return
    const { error } = await supabase
      .from('usage_logs')
      .insert({ user_id: userId, feature })
    if (error) console.error('[useSubscription] logUsage error:', error.message)
  }

  return {
    plan, loading: false, checkUsage, logUsage, fetchPlan, getRemainingChat,
    isExpired: false, expiresAt: null, getDaysRemaining,
  }
}
