/**
 * api/update-memory.js — Deep Memory + Recursive Profiling Engine
 *
 * Dipanggil HANYA saat:
 *   1. User tutup tab/browser (visibilitychange hidden / beforeunload)
 *   2. User logout manual
 *
 * Dua kondisi wajib terpenuhi sebelum write ke DB:
 *   A. Sesi punya minimal 3 pesan dari user
 *   B. Claude evaluate: ada hal baru yang ditemukan tentang user?
 *
 * Menggunakan navigator.sendBeacon dari client → tidak ada fetch async
 * yang di-kill browser. Endpoint ini harus respond cepat (< 10 detik).
 */
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, messages: sessionMsgs, trigger } = req.body

  // Guard: userId wajib ada
  if (!userId) return res.status(400).json({ error: 'userId required' })

  // Guard: minimal 3 pesan user di sesi ini (bukan sekadar greeting)
  const userMsgCount = (sessionMsgs || []).filter(m => m.role === 'user').length
  if (userMsgCount < 3) {
    return res.status(200).json({ skipped: true, reason: 'session_too_short' })
  }

  try {
    // ── Load existing memory & depth profile ──────────────────────────────
    const { data: existing } = await supabase
      .from('user_career_profiles')
      .select('nama, target_posisi, diah_anna_memory, user_depth_profile, depth_score, posisi_saat_ini, hambatan, motivasi')
      .eq('user_id', userId)
      .maybeSingle()

    const currentMemory      = existing?.diah_anna_memory    || null
    const currentDepthProfile = existing?.user_depth_profile || {}
    const currentDepthScore  = existing?.depth_score         || 0

    // ── Siapkan teks percakapan (max 20 pesan terakhir, hemat token) ──────
    const convoText = (sessionMsgs || [])
      .slice(-20)
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content || m.text || ''}`)
      .filter(line => line.length > 15)
      .join('\n')

    // ── STEP 1: Evaluasi — apakah ada hal baru? ───────────────────────────
    // Pakai model fast (Cerebras/DeepSeek) — hanya butuh jawaban Ya/Tidak
    const evalPrompt = `Kamu adalah evaluator memori Diah Anna.

MEMORI LAMA tentang user ini:
${currentMemory || '(belum ada memori sebelumnya — sesi pertama)'}

PROFIL MENDALAM SEBELUMNYA:
${JSON.stringify(currentDepthProfile, null, 1) || '(kosong)'}

PERCAKAPAN SESI INI:
${convoText}

TUGAS: Evaluasi apakah percakapan sesi ini mengandung MINIMAL SATU hal baru yang BELUM ada di memori lama.
"Hal baru" bisa berupa:
- Fakta baru tentang user (pekerjaan, target, situasi)
- Perubahan emosi atau mindset yang signifikan
- Keputusan atau rencana konkret yang baru diungkap
- Hambatan atau breakthrough baru
- Pola perilaku atau komunikasi baru yang terdeteksi

Jawab HANYA dengan satu kata: YA atau TIDAK`

    const evalResult = await generateText({
      system: 'Kamu evaluator ringkas. Jawab hanya YA atau TIDAK.',
      prompt: evalPrompt,
      maxTokens: 10,
      tier: 'fast',
      plan: 'free', // pakai free tier, ini cuma eval ringan
    })

    const hasNewInsight = evalResult.trim().toUpperCase().startsWith('Y')

    if (!hasNewInsight) {
      return res.status(200).json({ skipped: true, reason: 'no_new_insight' })
    }

    // ── STEP 2: Generate memory baru ─────────────────────────────────────
    // Pakai model smart — ini yang akan dibaca Diah Anna tiap sesi
    const memoryPrompt = `Kamu adalah memori jangka panjang Diah Anna, AI career companion Verneks.

DATA USER:
- Nama: ${existing?.nama || 'tidak diketahui'}
- Target: ${existing?.target_posisi || 'belum ditentukan'}
- Posisi sekarang: ${existing?.posisi_saat_ini || 'belum diketahui'}

MEMORI LAMA (gabungkan, jangan buang yang masih relevan):
${currentMemory || '(belum ada — ini pertama kali)'}

PERCAKAPAN SESI INI:
${convoText}

TUGAS: Tulis ulang memori Diah Anna tentang user ini.
Format: narasi bebas 150-200 kata, bahasa Indonesia natural.
Isi harus mencakup:
1. Siapa user ini secara manusiawi (bukan sekedar data CV)
2. Apa yang dia perjuangkan dan kenapa itu penting baginya
3. Pola komunikasi atau emosi yang khas dari user ini
4. Hal-hal yang sudah dibahas dan sudah ada progres
5. Hal baru dari sesi ini yang perlu diingat

PENTING:
- Ini bukan ringkasan chat — ini adalah "pengetahuan Diah Anna" tentang user
- Tulis seolah Diah Anna yang berbicara tentang user-nya
- Gabungkan insight lama + baru, buang yang sudah basi
- Jangan mulai dengan "User ini..." — langsung masuk ke narasi personal`

    const newMemory = await generateText({
      system: 'Kamu menulis memori personal AI career coach. Langsung tulis narasinya, tanpa preamble.',
      prompt: memoryPrompt,
      maxTokens: 350,
      tier: 'smart',
      plan: 'premium',
    })

    // ── STEP 3: Update depth profile (JSON terstruktur) ───────────────────
    const depthPrompt = `Kamu adalah analis pola perilaku user untuk AI career coach.

PROFIL MENDALAM SEBELUMNYA:
${JSON.stringify(currentDepthProfile)}

PERCAKAPAN SESI INI:
${convoText}

Update profil mendalam user ini. Kembalikan HANYA JSON valid:
{
  "interaction_patterns": {
    "preferred_time": "pagi/siang/malam/tidak_tahu",
    "avg_session_length": "pendek/medium/panjang",
    "response_style": "deskripsi singkat cara user berkomunikasi"
  },
  "emotional_triggers": {
    "motivators": ["hal yang membuat user semangat"],
    "blockers": ["hal yang membuat user ragu atau stuck"]
  },
  "coach_style_fit": "direct-challenger/nurturing-supporter/analytical-guide/creative-explorer",
  "recurring_themes": ["tema yang sering muncul lintas sesi"],
  "breakthroughs": ["insight atau keputusan penting yang pernah terjadi"],
  "last_emotional_state": "kondisi emosi terakhir user dalam 2-3 kata"
}

Gabungkan data lama dengan observasi baru. Pertahankan yang masih relevan.`

    const depthRaw = await generateText({
      system: 'Output HANYA JSON valid, tanpa markdown, tanpa preamble.',
      prompt: depthPrompt,
      maxTokens: 400,
      tier: 'fast',
      plan: 'free',
    })

    let newDepthProfile = currentDepthProfile
    try {
      const clean = depthRaw.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
      newDepthProfile = JSON.parse(clean)
    } catch {
      console.warn('[update-memory] depth profile parse failed, keep existing')
    }

    // ── STEP 4: Hitung depth_score baru ──────────────────────────────────
    // Naik +5 per sesi yang ada insight baru, max 100
    const newDepthScore = Math.min(100, currentDepthScore + 5)

    // ── STEP 5: Simpan ke Supabase ────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('user_career_profiles')
      .update({
        diah_anna_memory:   newMemory.trim(),
        user_depth_profile: newDepthProfile,
        depth_score:        newDepthScore,
        memory_updated_at:  new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    // ── STEP 6: Simpan session note ringkas (opsional, untuk weekly-review) ─
    try {
      const shortNote = await generateText({
        system: 'Buat 1 kalimat ringkasan sesi chat coaching. Langsung isinya, tanpa preamble.',
        prompt: `Percakapan:\n${convoText.slice(0, 1500)}`,
        maxTokens: 80,
        tier: 'fast',
        plan: 'free',
      })
      await supabase.from('user_session_notes').insert({
        user_id: userId,
        summary: shortNote.trim(),
      })
    } catch {
      // Session note gagal tidak boleh gagalkan proses utama
    }

    return res.status(200).json({
      success:    true,
      depthScore: newDepthScore,
      trigger:    trigger || 'unknown',
    })

  } catch (error) {
    console.error('[update-memory] error:', error.message)
    // Tetap return 200 — client pakai sendBeacon, tidak cek response
    return res.status(200).json({ error: error.message })
  }
}
