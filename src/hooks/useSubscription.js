import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const LIMITS = {
  free:    { 'cv-review': 1,  ats: 1,  coach: 999, interview: 0,  'cv-maker': 1  },
  starter: { 'cv-review': 5,  ats: 5,  coach: 999, interview: 0,  'cv-maker': 5  },
  pro:     { 'cv-review': 30, ats: 30, coach: 999, interview: 30, 'cv-maker': 30 },
}

export const PLAN_LABEL  = { free: 'Free', starter: 'Starter', pro: 'Pro ⭐' }

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
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() // pakai maybeSingle() bukan single() agar tidak throw kalau kosong
      if (error) console.error('[useSubscription] fetchPlan error:', error.message)
      if (data?.plan && LIMITS[data.plan]) setPlan(data.plan)
      else setPlan('free') // default free kalau tidak ada subscription
    } catch (e) {
      console.error('[useSubscription] fetchPlan exception:', e)
      setPlan('free')
    }
    setLoading(false)
  }

  // Cek usage langsung ke DB
  const checkUsage = async (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    if (limit === 0) return false       // fitur tidak ada di plan ini
    if (limit >= 999) return true       // unlimited

    if (!userId) return false

    try {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const since = plan === 'free' ? '2000-01-01T00:00:00Z' : monthStart

      const { count, error } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('created_at', since)

      if (error) {
        console.error('[useSubscription] checkUsage error:', error.message)
        // Jika tabel tidak ada atau error RLS — BLOCK, jangan biarkan lewat
        return false
      }

      const used = count ?? 0
      console.log(`[usage] ${feature}: ${used}/${limit}`)
      return used < limit

    } catch (e) {
      console.error('[useSubscription] checkUsage exception:', e)
      return false // BLOCK kalau error, bukan biarkan lewat
    }
  }

  // Log usage ke DB
  const logUsage = async (feature) => {
    if (!userId) return
    const { error } = await supabase
      .from('usage_logs')
      .insert({ user_id: userId, feature })
    if (error) console.error('[useSubscription] logUsage error:', error.message)
  }

  return { plan, loading, checkUsage, logUsage, fetchPlan }
}
