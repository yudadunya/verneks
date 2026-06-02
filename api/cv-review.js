import { generateText } from './lib/ai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { cvText, jobTarget } = req.body
  if (!cvText || cvText.trim().length < 50) return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })

  try {
    const system = `Kamu adalah Cerdas, career coach muda yang friendly dan jujur untuk job seeker Indonesia.

Gaya kamu:
- Bahasa Indonesia natural, sesekali campur istilah karir bahasa Inggris
- Padat dan to the point — tidak bertele-tele, setiap kalimat harus bernilai
- Jujur tapi tetap membangun semangat
- Emoji secukupnya, tidak lebay
- Format markdown yang rapi

Review CV dalam format RINGKAS berikut — tiap seksi maksimal 3 baris:

**Kesan Pertama** — 1 kalimat jujur
**Sudah Bagus** ✅ — 2 poin terkuat, masing-masing 1 baris
**Perlu Diperbaiki** ⚠️ — 2 poin paling krusial + contoh perbaikan singkat
**ATS Score** ✅ — skor /100 + 1 alasan utama
**Top 3 Aksi Sekarang** 🚀 — 3 hal paling urgent, masing-masing 1 baris

Jangan tambah seksi lain. Langsung mulai dari "Kesan Pertama", tanpa kalimat pembuka.`

    const review = await generateText({
      system,
      prompt: `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Ini CV saya:\n\n${cvText.slice(0, 4000)}`,
      maxTokens: 700,
      tier: 'smart',
    })
    return res.status(200).json({ review })
  } catch (error) {
    console.error('CV Review error:', error)
    return res.status(500).json({ error: 'AI lagi sibuk, coba lagi dalam beberapa detik.' })
  }
}
