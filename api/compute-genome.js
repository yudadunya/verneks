// api/compute-genome.js
// Hitung Career Genome dari percakapan Discovery — tanpa auth, tanpa DB save
import { generateText } from './lib/ai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' })

  const userCount = messages.filter(m => m.role === 'user').length
  if (userCount < 4) return res.status(400).json({ error: 'Too few messages' })

  const convoText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.text || m.content || ''}`)
    .join('\n')

  const prompt = `Analisis percakapan Career Discovery ini dan kembalikan JSON VALID, tanpa backtick, tanpa teks lain:

{
  "profile_preview": {
    "nama": "nama user jika disebutkan, null jika tidak",
    "target_posisi": "target posisi user jika disebutkan, null jika tidak",
    "posisi_saat_ini": "posisi saat ini jika disebutkan, null jika tidak",
    "industri": "industri yang diminati jika disebutkan, null jika tidak",
    "hambatan_utama": "hambatan terbesar dalam 1 kalimat, null jika tidak jelas"
  },
  "genome_scores": {
    "analytical": 0,
    "leadership": 0,
    "builder": 0,
    "creator": 0,
    "communication": 0,
    "risk_taking": 0
  },
  "career_readiness": 0,
  "top_strength": "salah satu dari: analytical/leadership/builder/creator/communication/risk_taking",
  "gap_skills": ["skill1", "skill2", "skill3"],
  "gap_summary": "2-3 kalimat tentang gap antara posisi sekarang dan target",
  "mentor_message": "pesan personal dari Diah Anna (2-3 kalimat) kepada user berdasarkan analisis: sebutkan nama jika ada, akui potensinya, sebutkan hambatan terbesar spesifik, dan hint bahwa ada roadmap yang sudah disiapkan. Bahasa Indonesia, hangat, personal.",
  "gps_steps": [
    { "title": "Career Assessment", "done": true },
    { "title": "langkah konkret pertama yang spesifik untuk target user (misalnya: SQL Basic untuk Data Analyst)", "done": false },
    { "title": "langkah kedua yang logis setelah langkah pertama", "done": false },
    { "title": "langkah ketiga", "done": false },
    { "title": "langkah keempat", "done": false },
    { "title": "langkah kelima (biasanya Interview Preparation)", "done": false }
  ],
  "growth_state": {
    "career_stage": "Career Explorer",
    "progress_percent": 0,
    "current_focus": "fokus utama saat ini dalam 5 kata"
  }
}

ATURAN genome_scores (nilai 0-100):
- analytical: suka data, logika, riset
- leadership: pernah memimpin, inisiatif tinggi
- builder: eksekutor, suka bikin sesuatu, teknis
- creator: kreatif, inovatif, suka ide baru
- communication: artikulatif, presentasi, networking
- risk_taking: berani ambil risiko, entrepreneurial

career_readiness: 0-100, seberapa siap user mencapai target karirnya.
career_stage pilih dari: Career Explorer / Career Builder / Career Professional / Career Expert / Career Leader
gap_skills: 3-5 skill spesifik yang paling kurang berdasarkan target posisi user.
gps_steps: 6 langkah konkret dan spesifik berdasarkan target posisi user. Step 1 selalu "Career Assessment" (done: true). Step 2-3 terlihat (free). Step 4-6 terkunci (premium).

Percakapan:
${convoText}`

  try {
    // Batasi panjang konversasi agar prompt tidak terlalu panjang
    const trimmedConvo = messages.slice(-16)
    const trimmedText  = trimmedConvo
      .map(m => `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${(m.text || m.content || '').slice(0, 400)}`)
      .join('\n')
    const trimmedPrompt = prompt.replace(convoText, trimmedText)

    const raw = await generateText({
      system: 'Kamu adalah Career Genome Analyzer. Kembalikan HANYA JSON valid, tanpa teks lain, tanpa backtick.',
      prompt: trimmedPrompt,
      maxTokens: 1800,   // naik dari 1000 → cukup untuk full JSON
      tier: 'smart',
    })

    // Bersihkan output AI
    let clean = raw.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '')
      .replace(/\s*```$/,      '').trim()

    // Ekstrak JSON object jika ada teks di luar
    const firstBrace = clean.indexOf('{')
    const lastBrace  = clean.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.slice(firstBrace, lastBrace + 1)
    }

    // Coba parse — kalau gagal karena truncated, repair dulu
    let result
    try {
      result = JSON.parse(clean)
    } catch (parseErr) {
      console.warn('[compute-genome] JSON truncated, attempting repair...')
      // Tutup string yang terbuka, lalu tutup brackets yang belum ditutup
      let repaired = clean
      // Hitung bracket depth
      let depth = 0, inStr = false, escape = false
      for (const ch of repaired) {
        if (escape)          { escape = false; continue }
        if (ch === '\\')    { escape = true;  continue }
        if (ch === '"' && !inStr) inStr = true
        else if (ch === '"' && inStr) inStr = false
        else if (!inStr && ch === '{') depth++
        else if (!inStr && ch === '}') depth--
      }
      // Tutup string yang terbuka
      if (inStr) repaired += '"'
      // Tutup array/object yang terbuka
      // Cari struktur yang belum ditutup dari tail
      let opens = 0, arrOpens = 0, tmpIn = false
      for (const ch of repaired) {
        if (ch === '"' && !tmpIn) tmpIn = true
        else if (ch === '"' && tmpIn) tmpIn = false
        else if (!tmpIn && ch === '{') opens++
        else if (!tmpIn && ch === '}') opens--
        else if (!tmpIn && ch === '[') arrOpens++
        else if (!tmpIn && ch === ']') arrOpens--
      }
      for (let i = 0; i < arrOpens; i++) repaired += ']'
      for (let i = 0; i < opens;    i++) repaired += '}'
      try {
        result = JSON.parse(repaired)
        console.log('[compute-genome] JSON repair berhasil')
      } catch {
        throw new Error('JSON tidak bisa direpair: ' + parseErr.message)
      }
    }

    return res.status(200).json({ success: true, result })
  } catch (e) {
    console.error('[compute-genome]', e)
    return res.status(500).json({ error: e.message })
  }
}
