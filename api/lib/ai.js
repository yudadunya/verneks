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
    fast: 'claude-haiku-4-5-20251001',
    smart: 'claude-sonnet-4-6',
  },
  gemini: {
    fast: 'gemini-2.5-flash',
    smart: 'gemini-2.5-flash',
  },
}

// Retry otomatis untuk error 503/429 (Gemini overload / rate limit)
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isRetryable = err.status === 503 || err.status === 429 ||
        err.message?.includes('503') || err.message?.includes('overloaded') ||
        err.message?.includes('high demand') || err.message?.includes('rate limit')

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 1500 // 1.5s, 3s
        console.warn(`[ai.js] Retry ${attempt}/${maxRetries} setelah ${delay}ms — ${err.message}`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }
}

// ─── Single-turn ──────────────────────────────────────────────────────────────
export async function generateText({ system, prompt, maxTokens = 1000, tier = 'fast' }) {
  const model = MODELS[PROVIDER][tier]

  return withRetry(async () => {
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
      const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: system })
      const result = await geminiModel.generateContent(prompt)
      return result.response.text()
    }
  })
}

// ─── Multi-turn ───────────────────────────────────────────────────────────────
export async function generateChat({ system, messages, maxTokens = 500, tier = 'fast' }) {
  const model = MODELS[PROVIDER][tier]
  const history = messages.slice(0, -1)
  const lastMessage = messages[messages.length - 1].content

  return withRetry(async () => {
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
      const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: system })
      const geminiHistory = history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const chat = geminiModel.startChat({ history: geminiHistory })
      const result = await chat.sendMessage(lastMessage)
      return result.response.text()
    }
  })
}
