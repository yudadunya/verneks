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

## 🎯 ATS Score: [ANGKA]/100

### 📊 Breakdown Skor
- **Format & Struktur** (X/20): ✅/⚠️/❌ [keterangan singkat]
- **Keyword Relevansi** (X/25): ✅/⚠️/❌ [keterangan singkat]
- **Quantified Achievement** (X/20): ✅/⚠️/❌ [keterangan singkat]
- **Section Completeness** (X/20): ✅/⚠️/❌ [keterangan singkat]
- **Readability** (X/15): ✅/⚠️/❌ [keterangan singkat]

### ✅ Yang Sudah ATS-Friendly
- [poin 1]
- [poin 2]
- [poin 3]

### ⚠️ Yang Perlu Diperbaiki
- [poin 1 + contoh perbaikan]
- [poin 2 + contoh perbaikan]
- [poin 3 + contoh perbaikan]

### 🔑 Missing Keywords
- [keyword 1]
- [keyword 2]

### 🚀 Quick Wins
1. [aksi 1]
2. [aksi 2]
3. [aksi 3]`

    const userPrompt = `${jobDescription ? `Job Description Target:\n${jobDescription}\n\n` : ''}CV saya:\n\n${cvText}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        }
      ],
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
