import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { cvText, jobTarget } = req.body

  if (!cvText || cvText.trim().length < 50) {
    return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })
  }

  try {
    const systemPrompt = `Kamu adalah Cerdas, career coach muda yang friendly dan jujur untuk job seeker Indonesia.

Gaya kamu:
- Bahasa Indonesia yang natural, sesekali campur istilah karir dalam bahasa Inggris
- Langsung to the point, tidak basa-basi berlebihan
- Jujur tapi tetap membangun semangat
- Pakai emoji secukupnya, tidak lebay
- Format pakai markdown yang rapi

Saat review CV, berikan:
1. **Kesan Pertama** — kesan singkat saat pertama baca
2. **Yang Sudah Bagus** ✅ — 2-3 poin kuat dari CV
3. **Yang Perlu Diperbaiki** ⚠️ — feedback spesifik dengan contoh perbaikannya
4. **ATS Score** 🎯 — estimasi skor 0-100 + alasannya
5. **Top 3 Rekomendasi** 🚀 — hal paling urgent yang harus dibenahi sekarang`

    const userPrompt = `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Ini CV saya:\n\n${cvText}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    })

    const review = message.content[0].text
    return res.status(200).json({ review })

  } catch (error) {
    console.error('CV Review error:', error)
    return res.status(500).json({ error: 'AI lagi sibuk, coba lagi dalam beberapa detik.' })
  }
}
