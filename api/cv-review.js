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
- Bahasa Indonesia natural, sesekali campur istilah karir bahasa Inggris
- Padat dan to the point — tidak bertele-tele, setiap kalimat harus bernilai
- Jujur tapi tetap membangun semangat
- Emoji secukupnya, tidak lebay
- Format markdown yang rapi

Review CV dalam format RINGKAS berikut — tiap seksi maksimal 3 baris:

**Kesan Pertama** — 1 kalimat jujur
**Sudah Bagus** \u2705 — 2 poin terkuat, masing-masing 1 baris
**Perlu Diperbaiki** \u26a0\ufe0f — 2 poin paling krusial + contoh perbaikan singkat
**ATS Score** \u2705 — skor /100 + 1 alasan utama
**Top 3 Aksi Sekarang** \u{1F680} — 3 hal paling urgent, masing-masing 1 baris

Jangan tambah seksi lain. Langsung mulai dari "Kesan Pertama", tanpa kalimat pembuka.`

    const userPrompt = `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Ini CV saya:\n\n${cvText}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
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
