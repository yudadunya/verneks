import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, position, level, messages } = req.body

  try {
    // Action: start — generate first question
    if (action === 'start') {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `Kamu adalah Diah Anna, career coach yang sedang melakukan mock interview.
Gaya kamu hangat tapi profesional, seperti HRD senior yang supportif.
Bahasa Indonesia natural, sesekali campur Inggris.`,
        messages: [{
          role: 'user',
          content: `Mulai mock interview untuk posisi ${position} level ${level}. 
Sapa user dengan hangat, jelaskan singkat sesi ini (5-7 pertanyaan), lalu langsung ajukan pertanyaan pertama.
Format: sapa + penjelasan singkat + "Pertanyaan 1: [pertanyaan]"
Jangan terlalu panjang.`
        }]
      })
      return res.status(200).json({ reply: message.content[0].text, questionNumber: 1 })
    }

    // Action: answer — respond to user's answer and ask next question or give feedback
    if (action === 'answer') {
      const { questionNumber, totalQuestions = 6 } = req.body
      const isLastQuestion = questionNumber >= totalQuestions

      const systemPrompt = `Kamu adalah Diah Anna, career coach yang sedang melakukan mock interview untuk posisi ${position} level ${level}.
Gaya kamu hangat, jujur, dan konstruktif.
Bahasa Indonesia natural.`

      const nextAction = isLastQuestion
        ? `Ini jawaban terakhir. Berikan feedback singkat untuk jawaban ini, lalu katakan sesi selesai dan minta user tunggu feedback lengkap.`
        : `Berikan feedback SINGKAT (2-3 kalimat) untuk jawaban ini — apa yang bagus dan apa yang bisa diperbaiki. Lalu langsung ajukan "Pertanyaan ${questionNumber + 1}: [pertanyaan baru yang relevan untuk posisi ini]"`

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          ...messages,
          {
            role: 'user',
            content: nextAction
          }
        ]
      })

      return res.status(200).json({
        reply: message.content[0].text,
        questionNumber: questionNumber + 1,
        isComplete: isLastQuestion
      })
    }

    // Action: feedback — generate comprehensive final feedback
    if (action === 'feedback') {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `Kamu adalah Diah Anna, career coach expert untuk posisi ${position} level ${level}.
Berikan feedback interview yang jujur, spesifik, dan actionable.
Bahasa Indonesia natural. Format pakai markdown yang rapi.`,
        messages: [
          ...messages,
          {
            role: 'user',
            content: `Berikan feedback lengkap untuk seluruh sesi interview ini dalam format:

## 🎯 Overall Score: [X]/100

## 💪 Yang Sudah Bagus
[3 poin kekuatan]

## 📈 Yang Perlu Ditingkatkan  
[3 poin dengan saran spesifik]

## 📝 Feedback Per Pertanyaan
[Ringkasan feedback tiap jawaban]

## 🚀 Tips untuk Interview Asli
[3 tips actionable]

Jujur tapi tetap supportif ya!`
          }
        ]
      })

      return res.status(200).json({ feedback: message.content[0].text })
    }

    return res.status(400).json({ error: 'Invalid action' })

  } catch (error) {
    console.error('Mock Interview error:', error)
    return res.status(500).json({ error: 'Diah Anna lagi sibuk, coba lagi ya!' })
  }
}
