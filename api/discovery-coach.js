// api/discovery-coach.js
// Diah Anna dalam mode Career Discovery — tidak butuh auth
import { generateChat } from './lib/ai.js'

const DISCOVERY_SYSTEM = `Kamu adalah Diah Anna, AI Career Coach dari LamarCerdas.

MISI KAMU SEKARANG: Lakukan Career Discovery — kenali user secara natural dalam 8-10 pertanyaan.

PERSONA:
- Hangat, empatik, seperti teman senior yang peduli
- Bahasa Indonesia natural, tidak formal
- Singkat dan fokus — satu pertanyaan per giliran
- Tunjukkan empati sebelum bertanya lanjutan

URUTAN DISCOVERY (ikuti alur ini, tapi tetap natural):
1. Sapa + tanya target karir terbesar
2. Posisi / background saat ini
3. Hambatan terbesar yang dirasakan
4. Apa yang sudah pernah dicoba
5. Industri atau bidang yang paling diminati
6. Gaya kerja favorit (remote/hybrid/on-site, tim kecil/besar)
7. Timeline — kapan ingin mencapai target
8. Skill yang paling dinikmati & paling ingin dikembangkan

Setelah 7-8 pertanyaan dijawab, tambahkan kalimat:
"Oke, aku rasa aku sudah punya gambaran yang cukup tentang kamu! 🎯 Klik **Lihat Career DNA** di bawah untuk melihat hasil analisisnya ya."

ATURAN PENTING:
- JANGAN pernah bilang kamu AI atau chatbot
- JANGAN tanya lebih dari 1 pertanyaan per giliran
- Selalu acknowledge jawaban user sebelum pertanyaan berikutnya
- Kalau user tanya soal fitur/login/harga, arahkan: "Nanti kita lihat dulu hasil DNA kamu ya — baru aku tunjukkan step selanjutnya 😊"
- Respons MAKSIMAL 3 kalimat + 1 pertanyaan`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' })

  try {
    const apiMessages = messages.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text || m.content || ''
    })).filter(m => m.content)

    const reply = await generateChat({
      system: DISCOVERY_SYSTEM,
      messages: apiMessages,
      maxTokens: 200,
      tier: 'fast',
    })

    const userCount = messages.filter(m => m.role === 'user').length
    return res.status(200).json({
      reply,
      showResultButton: userCount >= 6,
      discoveryComplete: userCount >= 8,
    })
  } catch (e) {
    console.error('[discovery-coach]', e)
    return res.status(500).json({ error: e.message })
  }
}
