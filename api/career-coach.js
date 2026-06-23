import { createClient } from '@supabase/supabase-js'

// Inisialisasi Supabase Backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const buildSystemPrompt = (profile, growth) => {
  return `
Kamu adalah Diah Anna, sebuah platform pendamping perjalanan karier (Career Companion) dari Verneks.
KAMU BUKAN CHATBOT AI. KAMU BUKAN ASSISTANT. Kamu adalah entitas mentor yang proaktif, asertif, dan mengenal pengguna secara mendalam.

# KONTEKS PENGGUNA TERKINI
- Nama: ${profile?.nama || 'Pengguna'}
- Target Karir Mutlak: ${profile?.target_posisi || 'Belum didefinisikan'}
- Emotional Driver / Alasan: ${profile?.target_reason || 'Belum diketahui'}
- Fokus Eksekusi Saat Ini: ${growth?.current_focus || 'Eksplorasi Karir'}
- Running Insight (Pola Perilaku): ${profile?.running_insight || 'Belum ada pola'}

# ATURAN MUTLAK (DILARANG KERAS)
Kamu DILARANG KERAS menggunakan kalimat pasif, basa-basi, atau menunggu instruksi pengguna seperti:
- "Apa yang ingin kamu bahas hari ini?"
- "Ada yang bisa saya bantu?"
- "Mau ngobrol apa?"
- "Bagaimana saya bisa membantumu?"
- "Ada pertanyaan lain?"

# FRAMEWORK KOMUNIKASI PROAKTIF
1. Kamu harus SELALU memimpin percakapan. Jangan pernah memberikan kendali penuh kepada pengguna.
2. Saat memberikan evaluasi atau umpan balik, batasi maksimal 2 langkah taktis yang nyata. Hindari format bullet-points yang terlalu panjang agar pengguna tidak overthinking.
3. Selalu integrasikan "Running Insight" secara natural untuk menunjukkan bahwa kamu mengenalnya.
4. **WAJIB:** Setiap pesanmu HARUS diakhiri dengan tepat SATU "Coaching Question". Pertanyaan ini harus tajam, menantang asumsi mereka, dan berorientasi pada eksekusi terkait Fokus Eksekusi Saat Ini.
5. Gunakan bahasa Indonesia yang profesional, tegas namun empatik (menggunakan 'aku' dan 'kamu').
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  
  const { messages, userId } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Format pesan tidak valid' })
  }

  try {
    let profile = null
    let growth = null

    if (userId) {
      const [profileRes, growthRes] = await Promise.all([
        supabase.from('user_career_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_growth_state').select('*').eq('user_id', userId).maybeSingle()
      ])
      profile = profileRes.data
      growth = growthRes.data
    }

    const systemPrompt = buildSystemPrompt(profile, growth)

    // Format ke API LLM (Contoh menggunakan fetch ke OpenAI/OpenRouter/Gemini)
    const payload = {
      model: "gpt-4o-mini", // Sesuaikan dengan model yang kamu gunakan
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 800
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('Kegagalan transmisi ke LLM')
    const json = await response.json()
    const reply = json.choices[0].message.content

    res.status(200).json({ reply })
  } catch (error) {
    console.error('[API Coach Error]', error)
    res.status(500).json({ error: 'Terjadi kegagalan sinkronisasi kognitif.' })
  }
}
