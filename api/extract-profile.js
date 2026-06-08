// career-memory-engine-v3.js
import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, messages } = req.body
  if (!userId || !messages?.length) return res.status(400).json({ error: 'Missing data' })

  const userMsgCount = messages.filter(m => m.role === 'user').length
  if (userMsgCount < 3) return res.status(200).json({ skipped: true, reason: 'too_short' })

  try {
    // ── Load existing profile ──
    const { data: existingProfile } = await supabase
      .from('user_career_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const existingContext = existingProfile?.summary
      ? `\nPROFIL SEBELUMNYA:\n${JSON.stringify({
          nama: existingProfile.nama,
          posisi_saat_ini: existingProfile.posisi_saat_ini,
          target_posisi: existingProfile.target_posisi,
          industri: existingProfile.industri,
          lama_pengalaman: existingProfile.lama_pengalaman,
          skill_utama: existingProfile.skill_utama,
          target_gaji: existingProfile.target_gaji,
          perusahaan_impian: existingProfile.perusahaan_impian,
          motivasi: existingProfile.motivasi,
          hambatan: existingProfile.hambatan,
          summary: existingProfile.summary,
          career_dna: existingProfile.career_dna,
        }, null, 2)}`
      : ''

    const convoText = messages
      .slice(-30)
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content}`)
      .join('\n')

    // ── Career Memory Engine V3 prompt ──
    const systemPrompt = `Kamu adalah Career Memory Engine V3 milik LamarCerdas.

Baca percakapan antara user dan Diah Anna (career coach AI), lalu ekstrak dan analisis semua informasi karir user.

Kembalikan HANYA JSON VALID, tidak ada teks lain, tidak ada backtick, tidak ada preamble.

{
  "profile": {
    "nama": "nama user jika ada, null jika tidak",
    "usia": "usia jika ada, null jika tidak",
    "domisili": "kota tempat tinggal jika ada, null jika tidak",
    "pendidikan": "jenjang pendidikan terakhir jika ada, null jika tidak",
    "jurusan": "jurusan jika ada, null jika tidak",
    "posisi_saat_ini": "jabatan saat ini atau 'fresh grad' jika baru lulus, null jika tidak ada",
    "perusahaan": "nama perusahaan saat ini jika ada, null jika tidak",
    "industri": "industri saat ini jika ada, null jika tidak",
    "lama_pengalaman": "total pengalaman kerja jika ada, null jika tidak",
    "skill_utama": ["skill1", "skill2"] atau null,
    "gaji_sekarang": "gaji saat ini jika disebutkan, null jika tidak",
    "target_posisi": "posisi yang dituju jika ada, null jika tidak",
    "target_industri": "industri yang dituju jika ada, null jika tidak",
    "target_gaji": "target gaji jika disebutkan, null jika tidak",
    "perusahaan_impian": "perusahaan impian jika disebutkan, null jika tidak",
    "timeline_karir": "kapan ingin mencapai goal jika disebutkan, null jika tidak",
    "tantangan_karir": "tantangan utama yang sedang dihadapi, null jika tidak",
    "motivasi": "motivasi atau goals jangka panjang jika ada, null jika tidak",
    "progress_lamaran": "update lamaran aktif jika ada, null jika tidak",
    "hambatan": "hambatan atau kekhawatiran jika ada, null jika tidak",
    "gaya_kerja": "preferensi kerja (remote/hybrid/dll) jika ada, null jika tidak",
    "emotional_state": "kondisi emosional saat ini dalam 1-2 kata (positif/semangat/bingung/khawatir/frustasi/optimis/lelah/excited), null jika tidak jelas",
    "summary": "2-3 paragraf narasi briefing untuk career coach: siapa user ini, di mana posisinya sekarang, apa yang dia mau, tantangan utama, dan aspek penting lain untuk coaching. Pakai bahasa Indonesia natural.",
    "topik_dibahas": ["topik1", "topik2"]
  },
  "career_dna": {
    "ambisi": "1 kalimat tentang ambisi karir user berdasarkan percakapan",
    "gaya_komunikasi": "direct/reflective/ekspresif/analitis berdasarkan cara user bicara",
    "kekhawatiran_utama": "kekhawatiran terbesar yang tersirat dari percakapan",
    "preferensi_industri": ["industri1", "industri2"],
    "nilai_kerja": "hal yang paling penting bagi user dalam bekerja (growth/stabilitas/impact/kreativitas/dll)"
  },
  "genome_scores": {
    "analytical": 0,
    "leadership": 0,
    "builder": 0,
    "creator": 0,
    "communication": 0,
    "risk_taking": 0
  },
  "growth_state": {
    "career_stage": "Career Explorer",
    "progress_percent": 0,
    "current_focus": "apa yang sedang difokuskan user sekarang",
    "next_milestone": "milestone karir berikutnya yang realistis",
    "streak_estimate": 0
  },
  "next_action": {
    "title": "1 aksi konkret yang paling penting dilakukan user sekarang",
    "description": "penjelasan singkat kenapa aksi ini penting dan bagaimana melakukannya",
    "estimated_days": 7
  }
}

ATURAN genome_scores (nilai 0-100, berdasarkan sinyal percakapan):
- analytical: suka data, logika, riset, problem solving
- leadership: cerita memimpin, inisiatif, punya tim, visioner
- builder: eksekutor, suka bikin sesuatu, teknis, detail
- creator: kreatif, inovatif, suka ide baru, estetika
- communication: artikulatif, suka presentasi, jaringan, persuasi
- risk_taking: berani ambil keputusan besar, entrepreneurial, toleran ketidakpastian
Kalau belum cukup sinyal untuk dimensi tertentu, nilai 0.

ATURAN career_stage (pilih SATU):
- Career Explorer: baru mulai, masih mencari arah, fresh grad atau < 2 tahun
- Career Builder: sudah punya arah, sedang membangun skill/pengalaman, 2-5 tahun
- Career Professional: sudah establish, sedang scale up karir, 5-10 tahun
- Career Expert: spesialis, diakui di bidangnya, > 10 tahun atau sudah senior
- Career Leader: memimpin tim/organisasi, punya influence besar

ATURAN progress_percent: estimasi seberapa jauh user dari target karir mereka (0-100).
${existingContext}`

    const raw = await generateText({
      system: systemPrompt,
      prompt: `Percakapan:\n${convoText}`,
      maxTokens: 1500,
      tier: 'smart',
    })

    let memory
    try {
      const clean = raw.trim().replace(/```json/g, '').replace(/```/g, '').trim()
      memory = JSON.parse(clean)
    } catch (e) {
      console.error('[memory-engine-v3] parse failed:', raw?.slice(0, 300))
      return res.status(200).json({ skipped: true, reason: 'parse_failed' })
    }

    const p = memory.profile || {}

    // ── Merge dengan data lama — jangan overwrite dengan null ──
    const mergeVal = (newVal, oldVal) => (newVal !== null && newVal !== undefined) ? newVal : (oldVal ?? null)

    // ── 1. Upsert user_career_profiles ──
    await supabase.from('user_career_profiles').upsert({
      user_id:           userId,
      nama:              mergeVal(p.nama, existingProfile?.nama),
      usia:              mergeVal(p.usia, existingProfile?.usia),
      domisili:          mergeVal(p.domisili, existingProfile?.domisili),
      pendidikan:        mergeVal(p.pendidikan, existingProfile?.pendidikan),
      jurusan:           mergeVal(p.jurusan, existingProfile?.jurusan),
      posisi_saat_ini:   mergeVal(p.posisi_saat_ini, existingProfile?.posisi_saat_ini),
      perusahaan:        mergeVal(p.perusahaan, existingProfile?.perusahaan),
      industri:          mergeVal(p.industri, existingProfile?.industri),
      lama_pengalaman:   mergeVal(p.lama_pengalaman, existingProfile?.lama_pengalaman),
      skill_utama:       [...new Set([...(existingProfile?.skill_utama || []), ...(p.skill_utama || [])])].slice(0, 15),
      gaji_sekarang:     mergeVal(p.gaji_sekarang, existingProfile?.gaji_sekarang),
      target_posisi:     mergeVal(p.target_posisi, existingProfile?.target_posisi),
      target_industri:   mergeVal(p.target_industri, existingProfile?.target_industri),
      target_gaji:       mergeVal(p.target_gaji, existingProfile?.target_gaji),
      perusahaan_impian: mergeVal(p.perusahaan_impian, existingProfile?.perusahaan_impian),
      timeline_karir:    mergeVal(p.timeline_karir, existingProfile?.timeline_karir),
      hambatan:          mergeVal(p.tantangan_karir, existingProfile?.hambatan),
      motivasi:          mergeVal(p.motivasi, existingProfile?.motivasi),
      progress_lamaran:  mergeVal(p.progress_lamaran, existingProfile?.progress_lamaran),
      hambatan:          mergeVal(p.hambatan, existingProfile?.hambatan),
      gaya_kerja:        mergeVal(p.gaya_kerja, existingProfile?.gaya_kerja),
      emotional_state:   mergeVal(p.emotional_state, existingProfile?.emotional_state),
      summary:           p.summary || existingProfile?.summary,
      career_dna:        memory.career_dna || existingProfile?.career_dna,
      topik_dibahas:     [...new Set([...(existingProfile?.topik_dibahas || []), ...(p.topik_dibahas || [])])].slice(0, 30),
      sesi_count: (existingProfile?.sesi_count || 0) + 1,
      profile_completeness: (() => {
        const fields = [p.nama, p.posisi_saat_ini, p.target_posisi, p.industri,
          p.lama_pengalaman, p.target_gaji, p.motivasi, p.tantangan_karir,
          p.hambatan, p.skill_utama?.length > 0]
        const filled = fields.filter(Boolean).length
        return Math.round((filled / fields.length) * 100)
      })(),
      genome_updated_at: new Date().toISOString(),
      last_updated:      new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // ── 2. Upsert user_genome_scores — merge, ambil nilai tertinggi ──
    const gs = memory.genome_scores || {}
    const { data: existingGenome } = await supabase
      .from('user_genome_scores').select('*').eq('user_id', userId).maybeSingle()

    const mergeScore = (newVal, oldVal) => {
      const n = newVal || 0
      const o = oldVal || 0
      // Kalau nilai baru 0 (tidak cukup sinyal), pertahankan nilai lama
      // Kalau nilai baru > 0, ambil rata-rata berbobot (70% baru, 30% lama)
      if (n === 0) return o
      if (o === 0) return n
      return Math.round(n * 0.7 + o * 0.3)
    }

    await supabase.from('user_genome_scores').upsert({
      user_id:       userId,
      analytical:    mergeScore(gs.analytical,    existingGenome?.analytical),
      leadership:    mergeScore(gs.leadership,    existingGenome?.leadership),
      builder:       mergeScore(gs.builder,       existingGenome?.builder),
      creator:       mergeScore(gs.creator,       existingGenome?.creator),
      communication: mergeScore(gs.communication, existingGenome?.communication),
      risk_taking:   mergeScore(gs.risk_taking,   existingGenome?.risk_taking),
      top_strength:  memory.profile?.career_dna ? Object.entries(gs).sort((a,b) => b[1]-a[1])[0]?.[0] || existingGenome?.top_strength : existingGenome?.top_strength,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // ── 3. Upsert user_growth_state ──
    const gw = memory.growth_state || {}
    const { data: existingGrowth } = await supabase
      .from('user_growth_state').select('*').eq('user_id', userId).maybeSingle()

    await supabase.from('user_growth_state').upsert({
      user_id:         userId,
      career_stage:    gw.career_stage    || existingGrowth?.career_stage    || 'Career Explorer',
      progress_percent:gw.progress_percent || existingGrowth?.progress_percent || 0,
      current_focus:   gw.current_focus   || existingGrowth?.current_focus,
      next_milestone:  gw.next_milestone  || existingGrowth?.next_milestone,
      streak_days:     (existingGrowth?.streak_days || 0) + 1,
      gps_steps:       existingGrowth?.gps_steps || existingProfile?.gps_steps || [],
      last_activity:   new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // ── 4. Insert next action (hanya kalau ada) ──
    if (memory.next_action?.title) {
      await supabase.from('user_next_actions').insert({
        user_id:        userId,
        title:          memory.next_action.title,
        description:    memory.next_action.description,
        estimated_days: memory.next_action.estimated_days || 7,
        is_done:        false,
        created_at:     new Date().toISOString(),
      })
    }

    // ── 5. Log career event ──
    await supabase.from('career_events').insert({
      user_id:       userId,
      event_type:    'genome_updated',
      event_payload: {
        stage:    gw.career_stage,
        progress: gw.progress_percent,
      },
      created_at: new Date().toISOString(),
    })

    return res.status(200).json({ success: true, version: 'v3' })

  } catch (error) {
    console.error('[career-memory-engine-v3]', error)
    return res.status(500).json({ error: error.message })
  }
}
