/**
 * persuade.js — Sistem persuasi personal Diah Anna
 * Dipanggil saat user free kena paywall — generate pesan persuasi
 * yang dipersonalisasi berdasarkan profil user, situasi, dan psikologi konversi.
 */
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Harga paket untuk referensi konteks
const PLANS = {
  starter: { price: 'Rp 49.000/bulan', features: 'CV Review 5x, ATS Checker 5x, CV Maker 5x' },
  pro:     { price: 'Rp 199.000/bulan', features: 'semua fitur Starter + Mock Interview 30x, priority response' },
}

// Fitur apa yang di-unlock oleh plan apa
const FEATURE_PLAN = {
  'cv-review': 'starter',
  'ats':       'starter',
  'cv-maker':  'starter',
  'interview': 'pro',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, feature, trigger, coachHistory = [] } = req.body
  // trigger: 'locked' (plan tidak support) | 'exhausted' (kuota habis)

  // ── Load profil user ──
  let profile = null
  if (userId) {
    try {
      const { data } = await supabase
        .from('user_career_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      profile = data
    } catch (e) {
      console.error('[persuade] load profile error:', e.message)
    }
  }

  // ── Bangun konteks untuk AI ──
  const featureLabels = {
    'cv-review': 'CV Review',
    'ats':       'ATS Checker',
    'cv-maker':  'CV Maker AI',
    'interview': 'Mock Interview',
  }

  const targetPlan = FEATURE_PLAN[feature] || 'starter'
  const planInfo = PLANS[targetPlan]

  // Konteks percakapan terakhir (jika ada)
  const recentChat = coachHistory.slice(-6)
    .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content.slice(0, 150)}`)
    .join('\n')

  // Bangun profil context
  const profileCtx = []
  if (profile?.nama)             profileCtx.push(`Nama: ${profile.nama}`)
  if (profile?.posisi_saat_ini)  profileCtx.push(`Posisi: ${profile.posisi_saat_ini}`)
  if (profile?.target_posisi)    profileCtx.push(`Target: ${profile.target_posisi}`)
  if (profile?.perusahaan_impian)profileCtx.push(`Impian: ${profile.perusahaan_impian}`)
  if (profile?.tantangan_karir)  profileCtx.push(`Tantangan: ${profile.tantangan_karir}`)
  if (profile?.timeline_karir)   profileCtx.push(`Timeline: ${profile.timeline_karir}`)
  if (profile?.progress_lamaran) profileCtx.push(`Progress: ${profile.progress_lamaran}`)
  if (profile?.motivasi)         profileCtx.push(`Motivasi: ${profile.motivasi}`)
  if (profile?.hambatan)         profileCtx.push(`Hambatan: ${profile.hambatan}`)
  if (profile?.sesi_count)       profileCtx.push(`Sudah ngobrol: ${profile.sesi_count} sesi`)

  const systemPrompt = `Kamu adalah Diah Anna, AI Career Coach yang hangat, empathetic, dan sangat persuasif.

Tugasmu sekarang: tulis 1 pesan persuasi untuk mengajak user free upgrade ke paket berbayar. Pesan ini muncul saat mereka mencoba akses fitur yang belum tersedia di plan mereka.

FITUR YANG DICOBA: ${featureLabels[feature] || feature}
SITUASI: ${trigger === 'exhausted' ? 'Kuota user sudah habis (mereka sudah pernah pakai fitur ini!)' : 'Fitur ini belum ada di plan free mereka'}
PLAN YANG DIREKOMENDASIKAN: ${targetPlan === 'pro' ? 'Pro' : 'Starter'} (${planInfo.price})

${profileCtx.length > 0 ? `PROFIL USER:\n${profileCtx.map(p => `• ${p}`).join('\n')}` : 'PROFIL: Belum diketahui (user baru)'}

${recentChat ? `KONTEKS PERCAKAPAN TERAKHIR:\n${recentChat}` : ''}

INSTRUKSI MENULIS PESAN:

1. PERSONALISASI TINGGI:
   - Kalau tahu nama user, sebut namanya
   - Kalau tahu target/situasi, hubungkan langsung dengan benefit fitur ini
   - Kalau user sudah pernah pakai (exhausted), acknowledge itu — mereka sudah terbukti serius
   - Kalau tahu timeline ("mau apply bulan depan"), ciptakan urgensi yang relevan

2. STRUKTUR EMOSIONAL (gunakan urutan ini):
   a) Acknowledgment empatik (1 kalimat) — validasi situasi/usaha mereka
   b) Pain point spesifik — tunjukkan apa yang mereka KEHILANGAN tanpa fitur ini (konkret, bukan abstrak)
   c) Social proof atau data — 1 fakta/cerita yang meyakinkan
   d) Tawaran/CTA — natural, tidak pushy, tapi jelas

3. TEKNIK PERSUASI yang boleh dipakai:
   - Loss aversion: "Sayang banget kalau CV bagus kamu dikalahkan format yang salah"
   - Anchoring: bandingkan harga dengan sesuatu yang lebih murah (kopi, parkir)
   - Spesifisitas: angka lebih meyakinkan dari kata sifat ("rata-rata naik 28 poin" bukan "jauh lebih baik")
   - Reciprocity: Diah Anna sudah kasih banyak gratis, ini langkah natural selanjutnya
   - Urgency personal: bukan deadline palsu, tapi dikaitkan dengan situasi NYATA user

4. GAYA PENULISAN:
   - Bahasa: natural Indonesia + sedikit Inggris, seperti ngobrol dengan kakak senior
   - Panjang: 3-4 paragraf pendek, MAKSIMAL 120 kata
   - Emoji: 1-2 saja, jangan berlebihan
   - JANGAN: jual terlalu keras, pakai kata "UPGRADE SEKARANG!!!", atau terdengar seperti iklan
   - JANGAN: ulangi kata "upgrade" lebih dari 2x

5. AKHIRI dengan pertanyaan atau CTA yang ringan — kasih 2 pilihan: lanjut ke pricing, atau lanjut ngobrol

Kembalikan HANYA teks pesan, tidak ada JSON, tidak ada label, tidak ada preamble.`

  try {
    const message = await generateText({
      system: systemPrompt,
      prompt: `Tulis pesan persuasi untuk user ini yang mau akses fitur ${featureLabels[feature]}.`,
      maxTokens: 250,
      tier: 'fast',
    })

    return res.status(200).json({ message: message.trim() })

  } catch (error) {
    console.error('[persuade] error:', error)
    // Fallback ke pesan statis yang sudah ada jika AI gagal
    return res.status(200).json({ message: null, fallback: true })
  }
}
