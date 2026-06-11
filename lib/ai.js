/**
 * _lib/ai.js — Universal AI wrapper untuk Verneks
 *
 * Routing:
 * - plan='premium' → Claude (Sonnet) utama, fallback ke Cerebras/Gemini
 * - plan='free'    → Cerebras utama, fallback ke Gemini, fallback ke Cerebras lagi
 */
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODELS = {
  cerebras: { fast: 'llama-3.3-70b', smart: 'llama-3.3-70b' },
  claude:   { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-4-6' },
  gemini:   { fast: 'gemini-2.0-flash', smart: 'gemini-2.0-flash' },
}

// ── Normalize messages untuk semua provider ──────────────────────────────────
function normalizeMessages(messages) {
  return messages
    .map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: (m.content || m.text || '').trim(),
    }))
    .filter(m => m.content.length > 0)
}

// ── Claude ───────────────────────────────────────────────────────────────────
async function callClaude({ system, messages, maxTokens, model }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const normalized = normalizeMessages(messages)
  const useCache = system.length > 4000
  const systemContent = useCache
    ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
    : system
  const msg = await client.messages.create({
    model: model || MODELS.claude.smart,
    max_tokens: maxTokens,
    system: systemContent,
    messages: normalized,
  })
  return msg.content[0].text
}

// ── Cerebras (OpenAI-compatible) ─────────────────────────────────────────────
async function callCerebras({ system, messages, maxTokens, model }) {
  const normalized = normalizeMessages(messages)
  const body = {
    model: model || MODELS.cerebras.fast,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...normalized,
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
    throw new Error(`Cerebras ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini({ system, messages, maxTokens, model }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const m = genAI.getGenerativeModel({
    model: model || MODELS.gemini.fast,
    systemInstruction: system,
  })
  const normalized = normalizeMessages(messages)
  const history = []
  for (const msg of normalized.slice(0, -1)) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    const last = history[history.length - 1]
    if (history.length === 0 && role === 'model') continue
    if (last && last.role === role) {
      last.parts[0].text += '\n' + msg.content
    } else {
      history.push({ role, parts: [{ text: msg.content }] })
    }
  }
  const lastMsg = normalized[normalized.length - 1]
  const chat = m.startChat({ history })
  const result = await chat.sendMessage(lastMsg?.content || '')
  return result.response.text() || ''
}

async function callGeminiText({ system, prompt, model }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const m = genAI.getGenerativeModel({
    model: model || MODELS.gemini.fast,
    systemInstruction: system,
  })
  const result = await m.generateContent(prompt)
  return result.response.text()
}

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry(fn, maxRetries = 2) {
  let lastErr
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fn() } catch (e) { lastErr = e }
  }
  throw lastErr
}

// ── Free tier: Cerebras → Gemini → Cerebras ──────────────────────────────────
async function callFreeChat({ system, messages, maxTokens, tier }) {
  try {
    return await callCerebras({ system, messages, maxTokens, model: MODELS.cerebras[tier] })
  } catch (e1) {
    console.warn('[ai] Cerebras error, fallback ke Gemini:', e1.message)
    try {
      return await callGemini({ system, messages, maxTokens, model: MODELS.gemini[tier] })
    } catch (e2) {
      console.warn('[ai] Gemini error, retry Cerebras:', e2.message)
      try {
        return await callCerebras({ system, messages, maxTokens, model: MODELS.cerebras[tier] })
      } catch (e3) {
        throw new Error(`Semua provider gagal. Cerebras: ${e1.message} | Gemini: ${e2.message}`)
      }
    }
  }
}

async function callFreeText({ system, prompt, maxTokens, tier }) {
  try {
    return await callCerebras({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model: MODELS.cerebras[tier] })
  } catch (e1) {
    console.warn('[ai] Cerebras error, fallback ke Gemini:', e1.message)
    try {
      return await callGeminiText({ system, prompt, model: MODELS.gemini[tier] })
    } catch (e2) {
      console.warn('[ai] Gemini error, retry Cerebras:', e2.message)
      try {
        return await callCerebras({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model: MODELS.cerebras[tier] })
      } catch (e3) {
        throw new Error(`Semua provider gagal. Cerebras: ${e1.message} | Gemini: ${e2.message}`)
      }
    }
  }
}

// ── Premium tier: Claude → Cerebras/Gemini fallback ──────────────────────────
async function callPremiumChat({ system, messages, maxTokens, tier }) {
  try {
    return await callClaude({ system, messages, maxTokens, model: MODELS.claude.smart })
  } catch (e1) {
    console.warn('[ai] Claude error, fallback ke Cerebras:', e1.message)
    // Fallback ke free tier otomatis
    return callFreeChat({ system, messages, maxTokens, tier })
  }
}

async function callPremiumText({ system, prompt, maxTokens, tier }) {
  try {
    return await callClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens, model: MODELS.claude.fast })
  } catch (e1) {
    console.warn('[ai] Claude error, fallback ke Cerebras:', e1.message)
    return callFreeText({ system, prompt, maxTokens, tier })
  }
}

// ── Public exports ────────────────────────────────────────────────────────────
export async function generateText({ system, prompt, maxTokens = 1000, tier = 'fast', plan = 'free' }) {
  return withRetry(async () => {
    if (plan === 'premium') return callPremiumText({ system, prompt, maxTokens, tier })
    return callFreeText({ system, prompt, maxTokens, tier })
  }, 1)
}

export async function generateChat({ system, messages, maxTokens = 500, tier = 'fast', plan = 'free' }) {
  return withRetry(async () => {
    if (plan === 'premium') return callPremiumChat({ system, messages, maxTokens, tier })
    return callFreeChat({ system, messages, maxTokens, tier })
  }, 1)
}
