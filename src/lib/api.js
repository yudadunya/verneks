import { supabase } from './supabase'

export async function getAuthHeaders(headers = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function postJson(url, body) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' })
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const text = await resp.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text.slice(0, 160))
  }

  if (!resp.ok || data.error) {
    throw new Error(data.error || `HTTP ${resp.status}`)
  }

  return data
}
