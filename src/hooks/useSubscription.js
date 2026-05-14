import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LIMITS = {
  free: {
    cv_review: 1,
    ats_checker: 1,
    diah_anna: 1,
    mock_interview: 0,
  },
  starter: {
    cv_review: 5,
    ats_checker: 5,
    diah_anna: 5,
    mock_interview: 0,
  },
  pro: {
    cv_review: 5,
    ats_checker: 5,
    diah_anna: 999,
    mock_interview: 999,
  },
}

export function useSubscription(userId) {
  const [plan, setPlan] = useState('free')
  const [usage, setUsage] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchData()
  }, [userId])

  const fetchData = async () => {
    setLoading(true)

    // Get active subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const currentPlan = sub?.plan || 'free'
    setPlan(currentPlan)

    // Get usage this month (for starter/pro) or all time (for free)
    const monthYear = new Date().toISOString().slice(0, 7)
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('feature')
      .eq('user_id', userId)
      .eq('month_year', monthYear)

    // Also get all-time usage for free plan
    const { data: allTimeUsage } = await supabase
      .from('usage_tracking')
      .select('feature')
      .eq('user_id', userId)

    const countByFeature = (data) => {
      const counts = {}
      data?.forEach(({ feature }) => {
        counts[feature] = (counts[feature] || 0) + 1
      })
      return counts
    }

    setUsage(currentPlan === 'free' ? countByFeature(allTimeUsage) : countByFeature(usageData))
    setLoading(false)
  }

  const canUse = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const used = usage[feature] || 0
    return used < limit
  }

  const getRemainingUses = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const used = usage[feature] || 0
    return Math.max(0, limit - used)
  }

  const trackUsage = async (feature) => {
  if (!userId) return
  
  const monthYear = new Date().toISOString().slice(0, 7)
  const { data, error } = await supabase.from('usage_tracking').insert({
    user_id: userId,
    feature,
    month_year: monthYear,
  })
  
  await fetchData()
}

  return { plan, usage, loading, canUse, getRemainingUses, trackUsage }
}
