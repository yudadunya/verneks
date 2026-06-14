import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const FEATURE_LIMITS = {
  free: { chat: 15, 'cv-review': 1, ats: 1, coach: 999, interview: 1, 'cv-maker': 1 },
  premium: { chat: 999, 'cv-review': 999, ats: 999, coach: 999, interview: 999, 'cv-maker': 999 },
}

const FEATURE_LABELS = {
  chat: 'chat harian',
  'cv-review': 'CV Review',
  ats: 'ATS Checker',
  interview: 'Mock Interview',
  'cv-maker': 'CV Maker',
}

function getAuthHeader(req) {
  return req.headers.authorization || req.headers.Authorization || ''
}

function getBearerToken(req) {
  const header = getAuthHeader(req)
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

function getWindowStart(feature) {
  const now = new Date()
  if (feature === 'chat') {
    now.setHours(0, 0, 0, 0)
    return now.toISOString()
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function getLimitMessage(feature) {
  if (feature === 'chat') {
    return 'Kuota chat harian Free kamu sudah habis. Coba lagi besok atau upgrade ke Premium.'
  }
  return `Kuota ${FEATURE_LABELS[feature] || feature} untuk paket Free kamu sudah habis bulan ini.`
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req)
  if (!token) {
    return { error: 'Sesi login tidak ditemukan. Silakan login ulang.', status: 401 }
  }

  const { data, error } = await supabaseAuth.auth.getUser(token)
  if (error || !data?.user) {
    return { error: 'Sesi login tidak valid. Silakan login ulang.', status: 401 }
  }

  return { user: data.user, token }
}

export async function getUserPlan(userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[access] getUserPlan error:', error.message)
    return 'free'
  }

  const expired = data?.expires_at && new Date(data.expires_at) < new Date()
  if (data?.status === 'active' && data?.plan === 'premium' && !expired) return 'premium'
  return 'free'
}

export async function getAccessContext(req) {
  const auth = await getAuthenticatedUser(req)
  if (auth.error) return auth

  const userId = auth.user.id
  const plan = await getUserPlan(userId)
  return { user: auth.user, userId, plan, token: auth.token }
}

export async function ensureFeatureAccess(req, feature, { premiumOnly = false } = {}) {
  const context = await getAccessContext(req)
  if (context.error) return context

  if (premiumOnly && context.plan !== 'premium') {
    return { error: 'Fitur ini hanya tersedia untuk pengguna Premium.', status: 403 }
  }

  const limit = FEATURE_LIMITS[context.plan]?.[feature] ?? 0
  if (limit === 0) {
    return { error: 'Fitur ini tidak tersedia untuk paket akun kamu.', status: 403 }
  }

  if (limit >= 999) return { ok: true, ...context }

  const { count, error } = await supabaseAdmin
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', context.userId)
    .eq('feature', feature)
    .gte('created_at', getWindowStart(feature))

  if (error) {
    console.error('[access] ensureFeatureAccess usage error:', error.message)
    return { error: 'Gagal memeriksa kuota akun. Coba lagi sebentar lagi.', status: 500 }
  }

  if ((count ?? 0) >= limit) {
    return { error: getLimitMessage(feature), status: 403 }
  }

  return { ok: true, ...context }
}

export async function recordFeatureUsage(userId, feature) {
  const { error } = await supabaseAdmin
    .from('usage_logs')
    .insert({ user_id: userId, feature })

  if (error) {
    console.error('[access] recordFeatureUsage error:', error.message)
  }
}
