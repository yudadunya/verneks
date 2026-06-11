/**
 * ai.js — Universal AI wrapper untuk LamarCerdas
 *
 * Routing logic:
 * - plan='premium' → Claude selalu (Sonnet untuk chat, Haiku untuk text)
 * - plan='free'    → Cerebras utama, auto-fallback ke Gemini kalau error
 *                    Gemini utama, auto-fallback ke Cerebras kalau error
 */
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODELS = {
  cerebras: { fast: 'gpt-oss-120b', smart: 'gpt-oss-120b' },
  claude:   { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-4-6' },
  gemini:   { fast: 'gemini-2.5-flash', smart: 'gemini-2.5-flash' },
}

// ── Prompt cache store (in-memory, per instance) ─────────────────────────────
const promptCache = new Map()
function getCacheKey(system, tier) { return `${tier}:${system.slice(0, 80)}` }

// ── Normalize messages (berlaku untuk semua provider) ────────────────────────
function normalizeMessages(messages) {
  return messages
    .map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: (m.content || m.text || '').trim(),
    }))
    .filter(m => m.content.length > 0)
}

// ── Cerebras (OpenAI-compatible) ─────────────────────────────────────────────
async function callCerebras({ system, messages, maxTokens, model }) {
  const body = {
    model: model || MODELS.cerebras.fast,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...normalizeMessages(messages),
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

  const normalized = normalizeMessages(messages)

  // Cek apakah system prompt ini layak di-cache (> 1024 token ≈ > 4000 chars)
  const useCache = system.length > 4000

  const systemContent = useCache
    ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
    : system

  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemContent,
    messages: normalized,
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
// ── Gemini chat helper ────────────────────────────────────────────────────────
async function callGemini({ system, messages, maxTokens, model }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const m = genAI.getGenerativeModel({ model: model || MODELS.gemini.fast, systemInstruction: system })
  const rawHistory = normalizeMessages(messages).slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))
  const history = []
  for (const msg of rawHistory) {
    if (history.length === 0 && msg.role === 'model') continue
    const last = history[history.length - 1]
    if (last && last.role === msg.role) {
      last.parts[0].text += '\n' + msg.parts[0].text
    } else {
      history.push(msg)
    }
  }
  const normAll  = normalizeMessages(messages)
  const lastMsg  = normAll[normAll.length - 1]
  const chat     = m.startChat({ history })
  const result   = await chat.sendMessage(lastMsg?.content || '')
  return result.response.text() || ''
}

async function callGeminiText({ system, prompt, model }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const m = genAI.getGenerativeModel({ model: model || MODELS.gemini.fast, systemInstruction: system })
  const result = await m.generateContent(prompt)
  return result.response.text()
}

// ── Free tier: Cerebras → fallback Gemini (atau sebaliknya) ──────────────────
async function callFreeChat({ system, messages, maxTokens, tier }) {
  try {
    const result = await callCerebras({ system, messages, maxTokens, model: MODELS.cerebras[tier] })
    return result
  } catch (e1) {
    console.error('[ai] Cerebras GAGAL:', e1.status || '', e1.message)
    try {
      const result = await callGemini({ system, messages, maxTokens, model: MODELS.gemini[tier] })
      return result
    } catch (e2) {
      console.error('[ai] Gemini GAGAL:', e2.status || '', e2.message)
      throw new Error(`Cerebras: ${e1.message} | Gemini: ${e2.message}`)
    }
  }
}

async function callFreeText({ system, prompt, maxTokens, tier }) {
  try {
    const result = await callCerebras({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model: MODELS.cerebras[tier] })
    return result
  } catch (e1) {
    console.error('[ai] Cerebras GAGAL:', e1.status || '', e1.message)
    try {
      const result = await callGeminiText({ system, prompt, model: MODELS.gemini[tier] })
      return result
    } catch (e2) {
      console.error('[ai] Gemini GAGAL:', e2.status || '', e2.message)
      throw new Error(`Cerebras: ${e1.message} | Gemini: ${e2.message}`)
    }
  }
}

// Error kredit habis / billing issue dari Claude
function isCreditError(err) {
  const msg = err.message?.toLowerCase() || ''
  const status = err.status || 0
  return (
    status === 402 ||
    status === 529 ||
    msg.includes('credit') ||
    msg.includes('billing') ||
    msg.includes('quota') ||
    msg.includes('payment') ||
    msg.includes('insufficient')
  )
}

export async function generateText({ system, prompt, maxTokens = 1000, tier = 'fast', plan = 'free' }) {
  if (plan === 'premium') {
    try {
      return await withRetry(() =>
        callClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model: MODELS.claude[tier] })
      )
    } catch (e) {
      if (isCreditError(e)) {
        console.warn('[ai] Claude kredit habis, fallback ke free provider:', e.message)
        return callFreeText({ system, prompt, maxTokens, tier })
      }
      throw e
    }
  }
  return withRetry(() => callFreeText({ system, prompt, maxTokens, tier }))
}

// ── Multi-turn ────────────────────────────────────────────────────────────────
export async function generateChat({ system, messages, maxTokens = 500, tier = 'fast', plan = 'free' }) {
  if (plan === 'premium') {
    try {
      return await withRetry(() =>
        callClaude({ system, messages, maxTokens, model: MODELS.claude.smart })
      )
    } catch (e) {
      if (isCreditError(e)) {
        console.warn('[ai] Claude kredit habis, fallback ke free provider:', e.message)
        return callFreeChat({ system, messages, maxTokens, tier })
      }
      throw e
    }
  }
  return withRetry(() => callFreeChat({ system, messages, maxTokens, tier }))
}
