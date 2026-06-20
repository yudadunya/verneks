import { createClient } from '@supabase/supabase-js'
import { generateText } from './lib/ai.js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  // Ambil profil + genome user
  const [{ data: profile }, { data: genome }] = await Promise.all([
    supabaseAdmin.from('user_career_profiles')
      .select('target_posisi, posisi_saat_ini, industri, skill_gaps, career_readiness')
      .eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('user_genome_scores')
      .select('*')
      .eq('user_id', userId).maybeSingle(),
  ])

  if (!profile) return res.status(404).json({ error: 'Profil belum lengkap' })

  const prompt = `
Data profil kandidat:
- Target posisi: ${profile.target_posisi || 'belum diisi'}
- Posisi saat ini: ${profile.posisi_saat_ini || 'fresh graduate'}
- Industri: ${profile.industri || 'umum'}
- Career readiness: ${profile.career_readiness || 0}%
- Skill gaps: ${(profile.skill_gaps || []).join(', ') || 'tidak ada'}
- Genome scores: ${JSON.stringify(genome || {})}

Berikan 5 rekomendasi lowongan kerja di Indonesia yang paling cocok untuk kandidat ini.
Gunakan perusahaan-perusahaan Indonesia yang nyata (startup, BUMN, multinasional).

Balas HANYA dengan JSON array, tanpa teks lain:
[
  {
    "company": "nama perusahaan",
    "role": "nama posisi",
    "match": 92,
    "salary": "Rp X-Yjt",
    "reason": "alasan singkat 1 kalimat kenapa cocok",
    "apply_url": ""
  }
]
`

  const raw = await generateText({
    system: 'Kamu adalah job matching AI untuk platform karier Indonesia. Selalu balas dalam JSON valid.',
    prompt,
    maxTokens: 800,
    tier: 'fast',
  })

  // Parse JSON — strip markdown fence kalau ada
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const jobs = JSON.parse(clean)
    return res.status(200).json({ jobs })
  } catch (e) {
    console.error('Parse error:', raw)
    return res.status(500).json({ error: 'Gagal memproses rekomendasi' })
  }
}
