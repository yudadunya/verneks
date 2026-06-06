import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Free = 15 chat/hari + fitur masing-masing 1x/bulan, Premium = unlimited semua
export const LIMITS = {
  free:    { chat: 15, 'cv-review': 1, ats: 1, coach: 999, interview: 1, 'cv-maker': 1 },
  premium: { chat: 999, 'cv-review': 999, ats: 999, coach: 999, interview: 999, 'cv-maker': 999 },
}

export const PLAN_LABEL  = { free: 'Free', premium: 'Premium ⭐' }

export const FEATURE_LABEL = {
  'cv-review': 'CV Review',
  ats:         'ATS Checker',
  coach:       'Career Coach',
  interview:   'Mock Interview',
  'cv-maker':  'CV Maker',
  chat:        'Chat',
}

export function useSubscription(userId) {
  const [plan, setPlan]       = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchPlan()
  }, [userId])

  const fetchPlan = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) console.error('[useSubscription] fetchPlan error:', error.message)
      if (data?.plan && LIMITS[data.plan]) setPlan(data.plan)
      else setPlan('free')
    } catch (e) {
      console.error('[useSubscription] fetchPlan exception:', e)
      setPlan('free')
    }
    setLoading(false)
  }

  // Cek usage — chat: limit harian, fitur (cv-review/ats/interview/cv-maker): limit bulanan
  const checkUsage = async (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    if (limit === 0) return false
    if (limit >= 999) return true

    if (!userId) return false

    try {
      let since
      if (feature === 'chat') {
        // Chat: reset harian
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        since = today.toISOString()
      } else {
        // Fitur: reset bulanan
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        since = monthStart.toISOString()
      }

      const { count, error } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('created_at', since)

      if (error) {
        console.error('[useSubscription] checkUsage error:', error.message)
        return false
      }

      const used = count ?? 0
      const resetLabel = feature === 'chat' ? 'hari ini' : 'bulan ini'
      console.log(`[usage] ${feature}: ${used}/${limit} (${resetLabel})`)
      return used < limit

    } catch (e) {
      console.error('[useSubscription] checkUsage exception:', e)
      return false
    }
  }

  // Cek berapa sisa chat hari ini (untuk UI badge)
  const getRemainingChat = async () => {
    if (plan === 'premium') return 999
    if (!userId) return LIMITS.free.chat

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', 'chat')
        .gte('created_at', today.toISOString())
      return Math.max(0, LIMITS.free.chat - (count ?? 0))
    } catch {
      return LIMITS.free.chat
    }
  }

  const logUsage = async (feature) => {
    if (!userId) return
    const { error } = await supabase
      .from('usage_logs')
      .insert({ user_id: userId, feature })
    if (error) console.error('[useSubscription] logUsage error:', error.message)
  }

  return { plan, loading, checkUsage, logUsage, fetchPlan, getRemainingChat }
}
