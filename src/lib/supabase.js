import { createClient } from '@supabase/supabase-js'

// ── GUARD: buang token auth di URL yang SUDAH EXPIRED, SEBELUM Supabase
// client dibuat. ──────────────────────────────────────────────────────────
// Kalau ada #access_token=...&expires_at=... di URL (dari magic link, reset
// password, atau redirect OAuth) dan expires_at itu sudah lewat, Supabase
// (detectSessionInUrl:true) TETAP akan mencoba pakai token itu untuk panggil
// /auth/v1/user → gagal 403 → _initialize() Supabase berhenti di situ dan
// TIDAK lanjut cek sesi valid yang mungkin ada di localStorage (lihat source
// gotrue-js: begitu implicit-grant callback terdeteksi & gagal, dia return
// early, tidak fallback ke _recoverAndRefresh()). Efeknya: sesi kelihatan
// "hilang" meski link basi itu bukan sesi utama yang dipakai.
//
// Penyebab paling umum link basi ini nyangkut di URL: shortcut "Add to Home
// Screen"/PWA yang sempat dibuat SAAT tab masih menampilkan link callback
// (sebelum sempat dibersihkan) — jadi ikon itu bisa saja selalu membuka URL
// lama itu lagi. Guard ini bikin percobaan mati itu di-skip dari awal,
// supaya Supabase langsung lanjut ke jalur normal (cek localStorage).
if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
  try {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const expiresAt = Number(params.get('expires_at')) // unix seconds
    const nowSec = Math.floor(Date.now() / 1000)

    if (expiresAt && expiresAt < nowSec) {
      console.warn(
        `[supabase] Token auth di URL sudah expired ${nowSec - expiresAt}s lalu — ` +
        `dibuang sebelum diproses Supabase (kemungkinan link/shortcut lama).`
      )
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  } catch (e) {
    console.warn('[supabase] Gagal cek token expired di URL:', e)
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Eksplisit (bukan andalkan default) supaya user TETAP LOGIN sampai dia
// logout manual — sesi disimpan di localStorage & token di-refresh otomatis
// di background, tidak pernah expired diam-diam selama browser tidak
// menghapus storage-nya.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
})

// Auth helpers
export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://verneks.my.id/dashboard'
    }
  })
  return { data, error }
}
