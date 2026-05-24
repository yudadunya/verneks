import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const LIMITS = {
  free: {
    cv_review:      1,
    ats_checker:    1,
    diah_anna:      1,
    mock_interview: 0,
    cv_maker:       1,
  },
  starter: {
    cv_review:      5,
    ats_checker:    5,
    diah_anna:      5,
    mock_interview: 0,
    cv_maker:       5,
  },
  pro: {
    cv_review:      20,
    ats_checker:    20,
    diah_anna:      20,
    mock_interview: 20,
    cv_maker:       20,
  },
  platinum: {
    cv_review:      999,
    ats_checker:    999,
    diah_anna:      999,
    mock_interview: 999,
    cv_maker:       999,
  },
}

export const FEATURE_LABEL = {
  cv_review:      'CV Review',
  ats_checker:    'ATS Checker',
  diah_anna:      'Career Coach',
  mock_interview: 'Mock Interview',
  cv_maker:       'CV Maker',
}

export function useSubscription(userId) {
  const [plan, setPlan]     = useState('free')
  const [usage, setUsage]   = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchData()
  }, [userId])

  const fetchData = async () => {
    setLoading(true)

    // 1. Cek subscription aktif
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

    // 2. Hitung usage
    // Free: all-time (jatah sekali seumur hidup per fitur)
    // Berbayar: bulan ini saja
    const monthYear = new Date().toISOString().slice(0, 7)

    const query = supabase
      .from('usage_tracking')
      .select('feature')
      .eq('user_id', userId)

    const { data: usageRows } = currentPlan === 'free'
      ? await query                                    // all-time untuk free
      : await query.eq('month_year', monthYear)        // bulanan untuk berbayar

    const counts = {}
    usageRows?.forEach(({ feature }) => {
      counts[feature] = (counts[feature] || 0) + 1
    })

    setUsage(counts)
    setLoading(false)
  }

  // canUse: true jika user masih punya sisa kuota
  const canUse = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const used  = usage[feature] || 0
    return used < limit
  }

  const getRemainingUses = (feature) => {
    const limit = LIMITS[plan]?.[feature] ?? 0
    const used  = usage[feature] || 0
    return Math.max(0, limit - used)
  }

  // trackUsage: insert row usage → lalu refresh state
  const trackUsage = async (feature) => {
    if (!userId) return
    const monthYear = new Date().toISOString().slice(0, 7)
    await supabase.from('usage_tracking').insert({
      user_id: userId,
      feature,
      month_year: monthYear,
    })
    // Update local state langsung (optimistic) tanpa re-fetch biar cepat
    setUsage(prev => ({ ...prev, [feature]: (prev[feature] || 0) + 1 }))
    // Tetap re-fetch di background untuk sinkronisasi
    fetchData()
  }

  return { plan, usage, loading, canUse, getRemainingUses, trackUsage, fetchData }
}
