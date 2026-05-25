import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const LIMITS = {
  free:    { 'cv-review': 1,  ats: 1,  coach: 999, interview: 0,  'cv-maker': 1  },
  starter: { 'cv-review': 5,  ats: 5,  coach: 999, interview: 0,  'cv-maker': 5  },
  pro:     { 'cv-review': 20, ats: 20, coach: 999, interview: 20, 'cv-maker': 20 },
}

export const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro ⭐' }

export const FEATURE_LABEL = {
  'cv-review': 'CV Review',
  ats:         'ATS Checker',
  coach:       'Career Coach',
  interview:   'Mock Interview',
  'cv-maker':  'CV Maker',
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
      const { data } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data?.plan && LIMITS[data.plan]) setPlan(data.plan)
    } catch {}
    setLoading(false)
  }

  // Cek usage langsung ke DB — dipanggil saat user klik fitur
  const checkUsage = async (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    if (limit === 0) return false
    if (limit >= 999) return true   // unlimited (coach)
    try {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('created_at', plan === 'free' ? '2000-01-01' : monthStart)   // free = all-time
      return (count ?? 0) < limit
    } catch {
      return true   // kalau error, biarkan lewat daripada block user
    }
  }

  // Log usage ke DB
  const logUsage = (feature) => {
    if (!userId) return
    supabase.from('usage_logs').insert({ user_id: userId, feature }).then(() => {})
  }

  return { plan, loading, checkUsage, logUsage, fetchPlan }
}
