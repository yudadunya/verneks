// career-memory-engine-v3.js

import { generateText } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

if (req.method !== 'POST') {
return res.status(405).json({ error: 'Method not allowed' })
}

const { userId, messages } = req.body

if (!userId || !messages?.length) {
return res.status(400).json({ error: 'Missing data' })
}

const userMsgCount = messages.filter(
m => m.role === 'user'
).length

if (userMsgCount < 3) {
return res.status(200).json({
skipped: true,
reason: 'too_short'
})
}

try {

```
// ==================================================
// LOAD EXISTING PROFILE
// ==================================================

const { data: existingProfile } = await supabase
  .from('user_career_profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle()

const existingContext = existingProfile?.summary
  ? `
```

PROFIL SEBELUMNYA:

${JSON.stringify({
summary: existingProfile.summary,
emotional_state: existingProfile.emotional_state,
career_dna: existingProfile.career_dna
}, null, 2)}
`
: ''

```
const convoText = messages
  .slice(-30)
  .map(m =>
    `${m.role === 'user' ? 'User' : 'Diah Anna'}: ${m.content}`
  )
  .join('\n')

// ==================================================
// CAREER MEMORY ENGINE V3
// ==================================================

const systemPrompt = `
```

Kamu adalah Career Memory Engine V3 milik LamarCerdas.

Tugasmu:

1. Mengenali identitas karier user
2. Memahami kondisi emosional user
3. Menghasilkan Career Genome
4. Menentukan Career Stage
5. Menghasilkan Next Action

Kembalikan HANYA JSON VALID.

{
"profile": {
"nama": "",
"posisi_saat_ini": "",
"target_posisi": "",
"emotional_state": "",
"summary": "",
"topik_dibahas": []
},

"career_dna": {
"ambisi": "",
"gaya_komunikasi": "",
"kekhawatiran_utama": "",
"preferensi_industri": [],
"nilai_kerja": ""
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
"career_stage": "",
"progress_percent": 0,
"current_focus": "",
"next_milestone": "",
"streak_estimate": 0
},

"next_action": {
"title": "",
"description": "",
"estimated_days": 7
}
}

Career Stage hanya boleh:

* Career Explorer
* Career Builder
* Career Professional
* Career Expert
* Career Leader

Gunakan profil lama sebagai referensi.

${existingContext}
`

````
const raw = await generateText({
  system: systemPrompt,
  prompt: `Percakapan:\n${convoText}`,
  maxTokens: 1500,
  tier: 'smart'
})

let memory

try {

  const clean = raw
    .trim()
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  memory = JSON.parse(clean)

} catch (e) {

  console.error(e)

  return res.status(200).json({
    skipped: true,
    reason: 'parse_failed'
  })

}

// ==================================================
// PROFILE
// ==================================================

const profile = memory.profile || {}

await supabase
  .from('user_career_profiles')
  .upsert({
    user_id: userId,

    nama: profile.nama,

    posisi_saat_ini: profile.posisi_saat_ini,

    target_posisi: profile.target_posisi,

    emotional_state: profile.emotional_state,

    summary: profile.summary,

    career_dna: memory.career_dna,

    topik_dibahas: profile.topik_dibahas || [],

    genome_updated_at: new Date().toISOString(),

    last_updated: new Date().toISOString()

  }, {
    onConflict: 'user_id'
  })

// ==================================================
// GENOME SCORE
// ==================================================

await supabase
  .from('user_genome_scores')
  .upsert({
    user_id: userId,

    analytical:
      memory.genome_scores?.analytical || 0,

    leadership:
      memory.genome_scores?.leadership || 0,

    builder:
      memory.genome_scores?.builder || 0,

    creator:
      memory.genome_scores?.creator || 0,

    communication:
      memory.genome_scores?.communication || 0,

    risk_taking:
      memory.genome_scores?.risk_taking || 0,

    updated_at: new Date().toISOString()

  }, {
    onConflict: 'user_id'
  })

// ==================================================
// GROWTH STATE
// ==================================================

await supabase
  .from('user_growth_state')
  .upsert({
    user_id: userId,

    career_stage:
      memory.growth_state?.career_stage,

    progress_percent:
      memory.growth_state?.progress_percent || 0,

    current_focus:
      memory.growth_state?.current_focus,

    next_milestone:
      memory.growth_state?.next_milestone,

    streak_days:
      memory.growth_state?.streak_estimate || 0,

    last_activity:
      new Date().toISOString(),

    updated_at:
      new Date().toISOString()

  }, {
    onConflict: 'user_id'
  })

// ==================================================
// NEXT ACTION
// ==================================================

if (memory.next_action?.title) {

  await supabase
    .from('user_next_actions')
    .insert({
      user_id: userId,

      title:
        memory.next_action.title,

      description:
        memory.next_action.description,

      estimated_days:
        memory.next_action.estimated_days || 7
    })

}

// ==================================================
// CAREER EVENT
// ==================================================

await supabase
  .from('career_events')
  .insert({
    user_id: userId,

    event_type: 'genome_updated',

    event_payload: {
      stage:
        memory.growth_state?.career_stage,

      progress:
        memory.growth_state?.progress_percent
    }
  })

return res.status(200).json({
  success: true,
  version: 'v3'
})
````

} catch (error) {

```
console.error(
  '[career-memory-engine-v3]',
  error
)

return res.status(500).json({
  error: error.message
})
```

}

}
