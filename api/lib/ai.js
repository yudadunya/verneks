/**
 * ai.js — Universal AI wrapper untuk LamarCerdas
 * Ganti provider cukup set AI_PROVIDER di .env:
 *   AI_PROVIDER=cerebras  → pakai Cerebras (cepat & murah, default)
 *   AI_PROVIDER=gemini    → pakai Google Gemini
 *   AI_PROVIDER=claude    → pakai Anthropic Claude
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const PROVIDER = process.env.AI_PROVIDER || 'cerebras'

const MODELS = {
  cerebras: {
    fast:  'gpt-oss-120b',
    smart: 'gpt-oss-120b',
  },
  claude: {
    fast:  'claude-haiku-4-5-20251001',
    smart: 'claude-sonnet-4-6',
  },
  gemini: {
    fast:  'gemini-2.5-flash',
    smart: 'gemini-2.5-flash',
  },
}

// Cerebras pakai OpenAI-compatible API — tidak perlu SDK tambahan
async function callCerebras({ system, messages, maxTokens }) {
  const body = {
    model: messages.__model || MODELS.cerebras.fast, // diset oleh caller
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ],
  }

  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cerebras ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

// Retry otomatis untuk error 503/429
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isRetryable =
        err.status === 503 || err.status === 429 ||
        err.message?.includes('503') || err.message?.includes('overloaded') ||
        err.message?.includes('high demand') || err.message?.includes('rate limit')

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 1500
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
    if (PROVIDER === 'cerebras') {
      return callCerebras({
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens,
        model,
      })

    } else if (PROVIDER === 'claude') {
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

  return withRetry(async () => {
    if (PROVIDER === 'cerebras') {
      return callCerebras({ system, messages, maxTokens, model })

    } else if (PROVIDER === 'claude') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages,
      })
      return msg.content[0].text

    } else {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: system })
      const history = messages.slice(0, -1)
      const lastMessage = messages[messages.length - 1].content
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
