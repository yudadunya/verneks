import { supabase } from './supabase'

export async function getActiveSubscription(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[subscription] getActiveSubscription error:', error.message)
    return null
  }

  if (!data?.plan) return null

  const expired = data.expires_at && new Date(data.expires_at) < new Date()
  if (data.status !== 'active' || expired) return null

  return data
}

export function isPremiumSubscription(subscription) {
  return !!subscription?.plan && subscription.plan !== 'free'
}
