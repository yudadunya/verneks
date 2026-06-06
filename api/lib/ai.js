/**
 * ai.js — Universal AI wrapper untuk LamarCerdas
 * AI_PROVIDER=cerebras → Cerebras (default, cepat & murah)
 * AI_PROVIDER=gemini   → Google Gemini
 * AI_PROVIDER=claude   → Anthropic Claude
 */
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const PROVIDER = process.env.AI_PROVIDER || 'cerebras'

const MODELS = {
  cerebras: { fast: 'gpt-oss-120b', smart: 'gpt-oss-120b' },
  claude:   { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-4-6' },
  gemini:   { fast: 'gemini-2.5-flash', smart: 'gemini-2.5-flash' },
}

// ── Prompt cache store (in-memory, per instance) ─────────────────────────────
const promptCache = new Map()
function getCacheKey(system, tier) { return `${tier}:${system.slice(0, 80)}` }

// ── Cerebras (OpenAI-compatible) ─────────────────────────────────────────────
async function callCerebras({ system, messages, maxTokens, model }) {
  const body = {
    model: model || MODELS.cerebras.fast,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
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

// ── Claude dengan prompt caching ─────────────────────────────────────────────
async function callClaude({ system, messages, maxTokens, model }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Cek apakah system prompt ini layak di-cache (> 1024 token ≈ > 4000 chars)
  const useCache = system.length > 4000

  const systemContent = useCache
    ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
    : system

  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemContent,
    messages,
  })
  return msg.content[0].text
}

// ── Retry otomatis ────────────────────────────────────────────────────────────
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
        console.warn(`[ai.js] Retry ${attempt}/${maxRetries} — ${err.message}`)
        await new Promise(r => setTimeout(r, delay))
      } else throw err
    }
  }
}

// ── Single-turn ───────────────────────────────────────────────────────────────
export async function generateText({ system, prompt, maxTokens = 1000, tier = 'fast' }) {
  const model = MODELS[PROVIDER][tier]

  return withRetry(async () => {
    if (PROVIDER === 'cerebras') {
      return callCerebras({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model })

    } else if (PROVIDER === 'claude') {
      return callClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model })

    } else {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const m = genAI.getGenerativeModel({ model, systemInstruction: system })
      const result = await m.generateContent(prompt)
      return result.response.text()
    }
  })
}

// ── Multi-turn ────────────────────────────────────────────────────────────────
export async function generateChat({ system, messages, maxTokens = 500, tier = 'fast' }) {
  const model = MODELS[PROVIDER][tier]

  return withRetry(async () => {
    if (PROVIDER === 'cerebras') {
      return callCerebras({ system, messages, maxTokens, model })

    } else if (PROVIDER === 'claude') {
      return callClaude({ system, messages, maxTokens, model })

    } else {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const m = genAI.getGenerativeModel({ model, systemInstruction: system })
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))
      const chat = m.startChat({ history })
      const result = await chat.sendMessage(messages[messages.length - 1].content)
      return result.response.text()
    }
  })
}
