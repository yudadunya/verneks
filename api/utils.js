/**
 * /api/utils.js — Router untuk semua endpoint kecil + AI Content Generation
 * 
 * Actions:
 * - redeem | refresh-profile | job-match | admin | weekly-review 
 * - send-chat-reminder | save-fcm-token
 * - generate-guide | optimize-seo | batch-generate (NEW AI CONTENT)
 * 
 * Menggabungkan: redeem-code.js + refresh-profile.js + job-match.js + admin.js 
 *                + notifications.js + ai-content.js
 * 
 * Limit: 12 serverless functions Vercel
 * Current: /api/utils.js + /api/cron/jobs.js + library files = 2 functions ✅
 */

import { createClient } from '@supabase/supabase-js'
import { generateText } from './lib/ai.js'
import { saveFcmToken, notifyWeeklyReview, notifyChatReminder, getUserFcmToken } from './lib/notifications.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ════════════════════════════════════════════════════════════════════════════
// DIAH ANNA SYSTEM PROMPT (untuk AI content generation)
// ════════════════════════════════════════════════════════════════════════════

const DIAH_ANNA_SYSTEM = `You are Diah Anna, AI Career Coach at Verneks. Your role is to create 
high-quality, actionable career guides for professionals.

WRITING PRINCIPLES:
1. Conversational but expert (like talking to a smart friend)
2. Specific over generic (80% failure rate, not "many struggle")
3. Honest about reality (acknowledge difficulty, then provide solution)
4. Action-oriented (end sections with specific steps)
5. Local context (Indonesia-relevant examples, salary in Rp)

TONE:
- Direct and clear (avoid corporate speak)
- Practical advice with real examples
- Include data/research citations
- Show expertise through specifics, not credentials

OUTPUT FORMAT:
- Markdown
- 1200-1500 words
- Clear H2 headers for sections
- FAQ section (3-5 questions)
- CTA to chat at end
- Internal link suggestions

STRUCTURE:
1. Hook (50-100 words) - grab attention with stat/problem
2. Intro (200-300 words) - value proposition + roadmap
3. Main content (600-800 words) - 3-5 sections with H2
4. FAQ section (200-300 words) - 3-5 FAQs
5. CTA (50 words) - specific call-to-action to chat

Include:
- 2-3 real examples or scenarios
- At least 1-2 data points with [sources]
- At least 1 framework/template/checklist
- No filler - every sentence adds value`

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (AI Content)
// ════════════════════════════════════════════════════════════════════════════

function createGuidePrompt(outline) {
  return `Create a comprehensive career guide based on this outline:

TITLE: ${outline.title}
TOPIC: ${outline.slug}
KEYWORDS: ${outline.keywords.join(', ')}

GUIDE STRUCTURE (use these H2 headers):
${outline.structure.sections
  .map((s, i) => `${i + 1}. ${s.h2}\n   Subsections: ${s.subsections.join(', ')}`)
  .join('\n')}

KEY REQUIREMENTS:
- Include FAQ section with these questions (answer each):
${outline.structure.sections
  .filter(s => s.faqs)
  .flatMap(s => s.faqs.map((faq, i) => `  Q${i + 1}: ${faq.q}`))
  .join('\n')}

- Primary CTA: "${outline.structure.cta.primary}"
- Internal links to suggest: ${outline.internalLinks.join(', ')}
- Schema type: ${outline.schema}

RESEARCH NOTES:
- Target audience: Career changers, job seekers, professionals
- Tone: Expert but conversational
- Location focus: Indonesia (Rp currency, local job market)
- Keep it actionable (not theory)

Now write the complete guide in Markdown format. Start with the title as H1, then structure exactly as outlined above.`
}

function parseGeneratedContent(markdown) {
  const titleMatch = markdown.match(/^# (.+?)$/m)
  const title = titleMatch ? titleMatch[1] : 'Untitled'
  const sections = markdown.match(/^## .+$/gm) || []
  const faqMatch = markdown.match(/## (?:FAQ|Frequently Asked Questions)([\s\S]*?)(?=## |$)/i)
  const hasFAQ = !!faqMatch

  return {
    title: title.trim(),
    sectionCount: sections.length,
    hasFAQ,
    wordCount: markdown.split(/\s+/).length,
    content: markdown
  }
}

function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

function generateFAQSchema(faqs = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.length > 0 
      ? faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.q,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.a
          }
        }))
      : []
  }
}

function generateArticleSchema(title) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': title,
    'description': title,
    'author': {
      '@type': 'Person',
      'name': 'Diah Anna',
      'description': 'AI Career Coach at Verneks'
    },
    'datePublished': new Date().toISOString()
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const action = req.query.action
  if (!action) return res.status(400).json({ error: 'Missing action param' })

  // ════════════════════════════════════════════════════════════════════════
  // EXISTING ACTIONS (Keep existing code)
  // ════════════════════════════════════════════════════════════════════════

  // ── REDEEM CODE ──────────────────────────────────────────────────────────
  if (action === 'redeem') {
    // [Keep existing redeem code from original utils.js]
  }

  // ── REFRESH PROFILE ──────────────────────────────────────────────────────
  if (action === 'refresh-profile') {
    // [Keep existing refresh-profile code]
  }

  // ── JOB MATCH ────────────────────────────────────────────────────────────
  if (action === 'job-match') {
    // [Keep existing job-match code]
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────
  if (action === 'admin') {
    // [Keep existing admin code]
  }

  // ── WEEKLY REVIEW ────────────────────────────────────────────────────────
  if (action === 'weekly-review') {
    // [Keep existing weekly-review code from before]
    if (req.method !== 'POST') return res.status(405).end()

    function getWeekStart() {
      const d = new Date(); const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff); d.setHours(0,0,0,0)
      return d.toISOString().split('T')[0]
    }

    const weekStart = getWeekStart()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

    const { data: users, error } = await supabase
      .from('user_career_profiles')
      .select('user_id, nama, target_posisi, career_readiness, gps_steps, running_insight, running_insight_updated_at')
      .not('career_readiness', 'is', null).limit(50)

    if (error) return res.status(500).json({ error: error.message })
    if (!users?.length) return res.status(200).json({ success: true, processed: 0 })

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    const results = []
    for (const user of users) {
      try {
        const [eventsRes, capsulesRes] = await Promise.all([
          supabase.from('career_events')
            .select('event_type, event_payload').eq('user_id', user.user_id)
            .gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('memory_capsule_log')
            .select('capsule_text').eq('user_id', user.user_id)
            .gte('capsule_date', sevenDaysAgo.toISOString().slice(0,10))
            .order('capsule_date', { ascending: false }),
        ])

        const events = eventsRes.data || []
        const capsules = capsulesRes.data || []
        if (events.length === 0 && capsules.length === 0) continue

        const milestonesDone = events.filter(e => e.event_type === 'milestone_completed')
        const doneCount = (user.gps_steps || []).filter(s => s.done).length
        const totalCount = (user.gps_steps || []).length

        const summary = await generateText({
          system: 'Kamu adalah Diah Anna, AI career coach. Tulis catatan refleksi mingguan 2-4 kalimat, hangat dan personal. Bahasa Indonesia natural.',
          prompt: `Nama: ${user.nama || 'User'}\nTarget: ${user.target_posisi || '-'}\nProgress: ${doneCount}/${totalCount} step\nMilestone: ${milestonesDone.map(m => m.event_payload?.title).join(', ') || 'tidak ada'}\nRingkasan sesi:\n${capsules.map(c => `- ${c.capsule_text}`).join('\n') || '(tidak ada)'}`,
          maxTokens: 150, tier: 'fast',
        })

        await supabase.from('user_weekly_reviews').upsert({
          user_id: user.user_id, week_start: weekStart, review_text: summary.trim(),
        }, { onConflict: 'user_id,week_start' })

        // Send email + push notification
        try {
          const authUser = authUsers.find(u => u.id === user.user_id)
          const fcmToken = await getUserFcmToken(user.user_id)
          
          if (authUser?.email || fcmToken) {
            await notifyWeeklyReview(
              authUser?.email,
              fcmToken,
              user.nama || 'User',
              summary.trim()
            )
          }
        } catch (notifErr) {
          console.error(`[weekly-review notification failed for ${user.user_id}]`, notifErr)
        }

        results.push({ userId: user.user_id, status: 'generated' })
      } catch (e) {
        results.push({ userId: user.user_id, status: 'failed', error: e.message })
      }
    }

    return res.status(200).json({
      success: true, weekStart,
      processed: results.length,
      generated: results.filter(r => r.status === 'generated').length,
    })
  }

  // ── SEND CHAT REMINDER ───────────────────────────────────────────────────
  if (action === 'send-chat-reminder') {
    // [Keep existing send-chat-reminder code]
  }

  // ── SAVE FCM TOKEN ───────────────────────────────────────────────────────
  if (action === 'save-fcm-token') {
    if (req.method !== 'POST') return res.status(405).end()
    const { userId, token } = req.body
    if (!userId || !token) return res.status(400).json({ error: 'Missing userId or token' })

    try {
      const result = await saveFcmToken(userId, token)
      if (result.error) {
        return res.status(500).json({ error: result.error })
      }
      return res.status(200).json({ success: true })
    } catch (e) {
      console.error('[save-fcm-token]', e)
      return res.status(500).json({ error: e.message })
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // NEW: AI CONTENT GENERATION ACTIONS (NO NEW FILE!)
  // ════════════════════════════════════════════════════════════════════════

  // ── GENERATE SINGLE GUIDE ────────────────────────────────────────────────
  if (action === 'generate-guide') {
    if (req.method !== 'POST') return res.status(405).end()

    const { guideOutline, guideId } = req.body
    if (!guideOutline) {
      return res.status(400).json({ error: 'Missing guideOutline' })
    }

    try {
      console.log(`[ai-content] Generating guide: ${guideOutline.slug}`)

      const content = await generateText({
        system: DIAH_ANNA_SYSTEM,
        prompt: createGuidePrompt(guideOutline),
        maxTokens: 2000,
        tier: 'fast'
      })

      const parsed = parseGeneratedContent(content)

      const { data, error } = await supabase
        .from('career_library_drafts')
        .insert({
          guide_id: guideId || guideOutline.id,
          slug: guideOutline.slug,
          content: parsed.content,
          metadata: {
            wordCount: parsed.wordCount,
            sectionCount: parsed.sectionCount,
            hasFAQ: parsed.hasFAQ
          },
          status: 'generated',
          generated_at: new Date().toISOString()
        }, { onConflict: 'guide_id' })

      if (error) {
        console.error('[ai-content] Save error:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({
        success: true,
        slug: guideOutline.slug,
        wordCount: parsed.wordCount,
        hasFAQ: parsed.hasFAQ
      })
    } catch (e) {
      console.error('[ai-content] Generate error:', e)
      return res.status(500).json({ error: e.message })
    }
  }

  // ── OPTIMIZE FOR SEO ─────────────────────────────────────────────────────
  if (action === 'optimize-seo') {
    if (req.method !== 'POST') return res.status(405).end()

    const { content, targetKeyword, guideId, slug } = req.body
    if (!content || !targetKeyword) {
      return res.status(400).json({ error: 'Missing content or targetKeyword' })
    }

    try {
      console.log(`[ai-content] Optimizing SEO for: ${slug}`)

      const seoPrompt = `You are an SEO expert. Optimize this career guide for search engines.

CONTENT EXCERPT:
${content.substring(0, 1000)}...

TARGET KEYWORD: "${targetKeyword}"

TASK: Generate SEO metadata

REQUIREMENTS:
1. Title: 50-60 characters, include keyword naturally
2. Meta Description: 150-160 characters, include keyword once, end with CTA
3. URL Slug: kebab-case, keyword-rich, concise
4. Schema Type: "FAQPage" or "Article" based on content
5. Internal link suggestions: 3-5 other guides to link to

RESPONSE FORMAT (valid JSON only, no preamble):
{
  "title": "...",
  "metaDescription": "...",
  "slug": "...",
  "schemaType": "FAQPage" | "Article",
  "internalLinks": ["guide-slug-1", "guide-slug-2", ...]
}

Generate the JSON now.`

      const seoResponse = await generateText({
        system: 'You are SEO expert. Output ONLY valid JSON, no other text.',
        prompt: seoPrompt,
        maxTokens: 500,
        tier: 'fast'
      })

      const cleanedJSON = seoResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      let seoData
      try {
        seoData = JSON.parse(cleanedJSON)
      } catch (e) {
        console.error('[ai-content] JSON parse error:', cleanedJSON)
        throw new Error('Invalid SEO JSON response')
      }

      const schema = seoData.schemaType === 'FAQPage'
        ? generateFAQSchema()
        : generateArticleSchema(seoData.title)

      const { error } = await supabase
        .from('career_library_drafts')
        .update({
          slug: seoData.slug || slug,
          seo: {
            title: seoData.title,
            metaDescription: seoData.metaDescription,
            schemaType: seoData.schemaType,
            internalLinks: seoData.internalLinks
          },
          schema: schema,
          status: 'seo_optimized',
          optimized_at: new Date().toISOString()
        })
        .eq('guide_id', guideId)

      if (error) {
        console.error('[ai-content] SEO save error:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({
        success: true,
        slug: seoData.slug,
        title: seoData.title,
        schemaType: seoData.schemaType
      })
    } catch (e) {
      console.error('[ai-content] SEO error:', e)
      return res.status(500).json({ error: e.message })
    }
  }

  // ── BATCH GENERATE ALL GUIDES ────────────────────────────────────────────
  if (action === 'batch-generate') {
    if (req.method !== 'POST') return res.status(405).end()

    const { guideOutlines } = req.body
    if (!guideOutlines || !Array.isArray(guideOutlines)) {
      return res.status(400).json({ error: 'Missing or invalid guideOutlines array' })
    }

    console.log(`[ai-content] Starting batch generation for ${guideOutlines.length} guides`)

    const results = []
    let successCount = 0
    let failureCount = 0

    for (const outline of guideOutlines) {
      try {
        const content = await generateText({
          system: DIAH_ANNA_SYSTEM,
          prompt: createGuidePrompt(outline),
          maxTokens: 2000,
          tier: 'fast'
        })

        const parsed = parseGeneratedContent(content)

        const seoPrompt = `Quick SEO optimization for: "${outline.keywords[0]}"
        
Title suggestion: Include "${outline.keywords[0]}" naturally
Meta: 150-160 chars, benefit + CTA
Slug: ${createSlug(outline.title)}

Output JSON:
{
  "title": "...",
  "metaDescription": "...",
  "slug": "${createSlug(outline.title)}"
}`

        const seoResponse = await generateText({
          system: 'Output ONLY valid JSON.',
          prompt: seoPrompt,
          maxTokens: 300,
          tier: 'fast'
        })

        const seoData = JSON.parse(
          seoResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        )

        const { error } = await supabase
          .from('career_library_drafts')
          .upsert({
            guide_id: outline.id,
            slug: seoData.slug,
            content: parsed.content,
            seo: {
              title: seoData.title,
              metaDescription: seoData.metaDescription
            },
            metadata: {
              wordCount: parsed.wordCount,
              sectionCount: parsed.sectionCount,
              hasFAQ: parsed.hasFAQ
            },
            status: 'generated_and_optimized',
            generated_at: new Date().toISOString()
          }, { onConflict: 'guide_id' })

        if (error) throw error

        results.push({
          id: outline.id,
          slug: seoData.slug,
          status: 'success',
          wordCount: parsed.wordCount
        })
        successCount++

        console.log(`✅ Generated: ${outline.slug} (${parsed.wordCount} words)`)
      } catch (e) {
        results.push({
          id: outline.id,
          slug: outline.slug,
          status: 'failed',
          error: e.message
        })
        failureCount++

        console.error(`❌ Failed: ${outline.slug} - ${e.message}`)
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log(`[ai-content] Batch complete: ${successCount} success, ${failureCount} failed`)

    return res.status(200).json({
      success: successCount > 0,
      total: guideOutlines.length,
      processed: results.length,
      successCount,
      failureCount,
      results
    })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
