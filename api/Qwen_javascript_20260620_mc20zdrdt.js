import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { featureType, triggerSource } = req.body

    console.log(`[analyze] Starting for ${featureType}, trigger: ${triggerSource}`)

    // ── 1. Collect data dari table existing ──
    const [negativeMessages, positiveMessages, mentorMemories] = await Promise.all([
      // Feedback negatif dari career_coach_messages
      supabaseAdmin
        .from('career_coach_messages')
        .select('id, user_id, content, feedback_text, conversation_id')
        .eq('feature_type', featureType)
        .eq('role', 'assistant')
        .eq('feedback_type', 'thumbs_down')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Feedback positif
      supabaseAdmin
        .from('career_coach_messages')
        .select('id, user_id, content, conversation_id')
        .eq('feature_type', featureType)
        .eq('role', 'assistant')
        .eq('feedback_type', 'thumbs_up')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Explicit feedback dari mentor_memory
      supabaseAdmin
        .from('mentor_memory')
        .select('*')
        .eq('memory_type', 'user_feedback')
        .eq('memory_category', featureType)
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    const negative = negativeMessages.data || []
    const positive = positiveMessages.data || []
    const memories = mentorMemories.data || []

    if (negative.length < 5 && memories.length < 3) {
      return res.status(200).json({ 
        message: 'Not enough data',
        negative: negative.length,
        positive: positive.length,
        memories: memories.length
      })
    }

    // ── 2. Analyze patterns ──
    const patterns = await analyzeAllPatterns(negative, positive, memories, featureType)

    // ── 3. Store patterns ──
    for (const pattern of patterns) {
      await supabaseAdmin
        .from('ai_pattern_analysis')
        .insert({
          analysis_type: pattern.type,
          feature_type: featureType,
          pattern_description: pattern.description,
          frequency: pattern.frequency,
          confidence_score: pattern.confidence,
          recommended_action: pattern.action,
          sample_conversations: pattern.sampleIds || []
        })
    }

    // ── 4. Generate improved prompt kalau confidence tinggi ──
    const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.7)
    if (highConfidencePatterns.length > 0) {
      await createImprovedPrompt(highConfidencePatterns, featureType)
    }

    return res.status(200).json({
      success: true,
      patternsFound: patterns.length,
      highConfidence: highConfidencePatterns.length
    })
  } catch (e) {
    console.error('[analyze] error:', e.message)
    return res.status(500).json({ error: 'Analysis failed' })
  }
}

async function analyzeAllPatterns(negative, positive, memories, featureType) {
  const patterns = []

  // Weakness detection
  if (negative.length >= 5) {
    const weakness = await detectWeaknesses(negative, memories, featureType)
    if (weakness) patterns.push(weakness)
  }

  // Strength identification
  if (positive.length >= 5) {
    const strength = await identifyStrengths(positive, featureType)
    if (strength) patterns.push(strength)
  }

  return patterns
}

async function detectWeaknesses(negativeMessages, memories, featureType) {
  const sample = [
    ...negativeMessages.slice(0, 15).map(m => ({
      ai_response: m.content?.slice(0, 400),
      user_feedback: m.feedback_text
    })),
    ...memories.slice(0, 10).map(m => ({
      user_feedback: m.content,
      importance: m.importance
    }))
  ]

  const prompt = `Analisis feedback negatif untuk fitur ${featureType}:

${JSON.stringify(sample, null, 2)}

Identifikasi pola kelemahan. Output JSON:
{
  "type": "weakness_detection",
  "description": "pola yang ditemukan",
  "frequency": jumlah_kasus,
  "confidence": 0.0-1.0,
  "action": "aksi perbaikan konkret",
  "sampleIds": ["id1", "id2"]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    return JSON.parse(completion.choices[0].message.content)
  } catch (e) {
    console.error('[weakness] error:', e.message)
    return null
  }
}

async function identifyStrengths(positiveMessages, featureType) {
  const sample = positiveMessages.slice(0, 15).map(m => ({
    ai_response: m.content?.slice(0, 400)
  }))

  const prompt = `Analisis feedback positif untuk fitur ${featureType}:

${JSON.stringify(sample, null, 2)}

Identifikasi kekuatan. Output JSON:
{
  "type": "strength_identification",
  "description": "pola kekuatan",
  "frequency": jumlah_kasus,
  "confidence": 0.0-1.0,
  "action": "cara replikasi kekuatan ini"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    return JSON.parse(completion.choices[0].message.content)
  } catch (e) {
    console.error('[strength] error:', e.message)
    return null
  }
}

async function createImprovedPrompt(patterns, featureType) {
  // Get current active prompt
  const { data: current } = await supabaseAdmin
    .from('ai_prompt_versions')
    .select('*')
    .eq('feature_type', featureType)
    .eq('is_active', true)
    .single()

  if (!current) return

  // Generate improved prompt
  const improved = await generateImprovedPrompt(current, patterns)
  if (!improved) return

  // Increment version
  const match = current.version.match(/v(\d+)\.(\d+)\.(\d+)/)
  const newVersion = match 
    ? `v${match[1]}.${parseInt(match[2]) + 1}.0`
    : 'v1.1.0'

  // Insert new version
  await supabaseAdmin
    .from('ai_prompt_versions')
    .insert({
      feature_type: featureType,
      version: newVersion,
      prompt_template: improved.prompt_template,
      system_instruction: improved.system_instruction,
      few_shot_examples: improved.few_shot_examples || [],
      metadata: { improvements: patterns },
      is_active: false, // A/B test dulu
      ab_test_group: 'variant'
    })

  // Log improvement
  await supabaseAdmin
    .from('ai_improvement_logs')
    .insert({
      improvement_type: 'prompt_update',
      feature_type: featureType,
      old_version: current.version,
      new_version: newVersion,
      change_description: patterns.map(p => p.action).join('; '),
      reason: patterns.map(p => p.description).join('; '),
      data_source: 'pattern_analysis',
      confidence_score: Math.max(...patterns.map(p => p.confidence))
    })

  console.log(`[prompt] Created ${newVersion} for ${featureType}`)
}

async function generateImprovedPrompt(current, patterns) {
  const prompt = `Improve prompt ini berdasarkan feedback:

CURRENT:
${current.prompt_template}

IMPROVEMENTS:
${patterns.map((p, i) => `${i+1}. ${p.action} (reason: ${p.description})`).join('\n')}

Output JSON:
{
  "prompt_template": "prompt yang sudah di-improve",
  "system_instruction": "system instruction baru",
  "few_shot_examples": []
}

Pertahankan tone Diah Anna yang personal dan empathetic.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    return JSON.parse(completion.choices[0].message.content)
  } catch (e) {
    console.error('[improve] error:', e.message)
    return null
  }
}