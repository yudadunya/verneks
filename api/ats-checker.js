import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { cvText, jobDescription } = req.body

  if (!cvText || cvText.trim().length < 50) {
    return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })
  }

  try {
    const systemPrompt = `Kamu adalah Cerdas, ATS expert yang bantu job seeker Indonesia optimasi CV mereka.

Gaya kamu:
- Bahasa Indonesia natural, sesekali campur istilah teknis dalam bahasa Inggris
- Jujur dan spesifik, langsung kasih contoh perbaikan
- Supportif tapi tidak lebay
- Pakai emoji secukupnya
- Format pakai markdown yang rapi

Analisis CV dan berikan output dalam format EXACT ini:

## ATS Score: [ANGKA]/100

## 📊 Breakdown Skor
| Faktor | Skor | Status |
|---|---|---|
| Format & Struktur | X/20 | ✅/⚠️/❌ |
| Keyword Relevansi | X/25 | ✅/⚠️/❌ |
| Quantified Achievement | X/20 | ✅/⚠️/❌ |
| Section Completeness | X/20 | ✅/⚠️/❌ |
| Readability | X/15 | ✅/⚠️/❌ |

## ✅ Yang Sudah ATS-Friendly
[2-3 poin kuat]

## ⚠️ Yang Perlu Diperbaiki
[3-4 poin spesifik dengan contoh perbaikan]

## 🔑 Missing Keywords
[Daftar keyword penting yang tidak ada di CV]

## 🚀 Quick Wins
[3 hal yang bisa langsung diperbaiki untuk naikkan skor]`

    const userPrompt = `${jobDescription ? `Job Description Target:\n${jobDescription}\n\n` : ''}CV saya:\n\n${cvText}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    })

    const result = message.content[0].text
    return res.status(200).json({ result })

  } catch (error) {
    console.error('ATS Checker error:', error)
    return res.status(500).json({ error: 'AI lagi sibuk, coba lagi dalam beberapa detik.' })
  }
}
