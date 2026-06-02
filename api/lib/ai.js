/**
 * ai.js — Universal AI wrapper untuk LamarCerdas
 * Ganti provider cukup set AI_PROVIDER di .env:
 *   AI_PROVIDER=gemini   → pakai Google Gemini
 *   AI_PROVIDER=claude   → pakai Anthropic Claude
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const PROVIDER = process.env.AI_PROVIDER || 'gemini'

const MODELS = {
  claude: {
    fast: 'claude-haiku-4-5-20251001',   // career-coach, mock-interview, ats-checker, extract-profile
    smart: 'claude-sonnet-4-6',           // cv-maker, cv-review, wa-webhook, mock-interview feedback
  },
  gemini: {
    fast: 'gemini-2.5-flash',
    smart: 'gemini-2.5-flash',
  },
}

// ─── Single-turn ──────────────────────────────────────────────────────────────
// Untuk: cv-review, ats-checker, cv-maker, extract-profile, wa-webhook (generateMessage)
export async function generateText({ system, prompt, maxTokens = 1000, tier = 'fast' }) {
  const model = MODELS[PROVIDER][tier]

  if (PROVIDER === 'claude') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.content[0].text

  } else {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: system,
    })
    const result = await geminiModel.generateContent(prompt)
    return result.response.text()
  }
}

// ─── Multi-turn ───────────────────────────────────────────────────────────────
// Untuk: career-coach, mock-interview, wa-webhook (conversation)
// messages: [{ role: 'user'|'assistant', content: string }]
export async function generateChat({ system, messages, maxTokens = 500, tier = 'fast' }) {
  const model = MODELS[PROVIDER][tier]
  const history = messages.slice(0, -1)
  const lastMessage = messages[messages.length - 1].content

  if (PROVIDER === 'claude') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: history,
    })
    return msg.content[0].text

  } else {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: system,
    })
    const geminiHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const chat = geminiModel.startChat({ history: geminiHistory })
    const result = await chat.sendMessage(lastMessage)
    return result.response.text()
  }
}
