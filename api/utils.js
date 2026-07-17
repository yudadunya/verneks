/**
 * /api/utils.js
 * 
 * Router untuk semua endpoint kecil:
 * - generate-guide, optimize-seo, batch-generate (AI Content)
 * 
 * Limit: 2 serverless functions (utils.js + cron/jobs.js)
 */

import { createClient } from '@supabase/supabase-js'
import { generateText } from './lib/ai.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ════════════════════════════════════════════════════════════════════════════
// DIAH ANNA SYSTEM PROMPT
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

STRUCTURE:
1. Hook (50-100 words)
2. Intro (200-300 words)
3. Main content (600-800 words)
4. FAQ section (200-300 words)
5. CTA (50 words)

Include:
- 2-3 real examples
- At least 1-2 data points
- At least 1 framework/template
- No filler - every sentence adds value`

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function createGuidePrompt(outline) {
  return `Create a comprehensive career guide based on this outline:

TITLE: ${outline.title}
TOPIC: ${outline.slug}
KEYWORDS: ${outline.keywords.join(', ')}

GUIDE STRUCTURE:
${outline.structure.sections
  .map((s, i) => `${i + 1}. ${s.h2}\n   Subsections: ${s.subsections.join(', ')}`)
  .join('\n')}

Include FAQ section. Primary CTA: "${outline.structure.cta.primary}"

Now write the complete guide in Markdown format.`
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

// ════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const action = req.query.action
  if (!action) return res.status(400).json({ error: 'Missing action param' })

  // Hanya action generate-content yang jalan lewat cron/admin yang perlu
  // proteksi CRON_SECRET. job-match & save-fcm-token dipanggil langsung dari
  // browser user, jadi tidak punya (dan tidak seharusnya punya) CRON_SECRET.
  const CRON_PROTECTED_ACTIONS = ['generate-guide', 'optimize-seo', 'batch-generate']
  if (CRON_PROTECTED_ACTIONS.includes(action)) {
    const authHeader = req.headers['authorization']
    const isVercelCron = req.headers['x-vercel-cron'] === '1'
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

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

      const seoPrompt = `Optimize for SEO. Target keyword: "${targetKeyword}"
      
Output JSON:
{
  "title": "...",
  "metaDescription": "...",
  "slug": "${createSlug(slug)}"
}`

      const seoResponse = await generateText({
        system: 'Output ONLY valid JSON, no other text.',
        prompt: seoPrompt,
        maxTokens: 300,
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
        throw new Error('Invalid SEO JSON response')
      }

      const { error } = await supabase
        .from('career_library_drafts')
        .update({
          slug: seoData.slug || slug,
          seo: seoData,
          status: 'seo_optimized',
          optimized_at: new Date().toISOString()
        })
        .eq('guide_id', guideId)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({
        success: true,
        slug: seoData.slug,
        title: seoData.title
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

        const seoResponse = await generateText({
          system: 'Output ONLY valid JSON.',
          prompt: `Quick SEO for "${outline.keywords[0]}". Slug: ${createSlug(outline.title)}. JSON: {"title":"...","metaDescription":"...","slug":"${createSlug(outline.title)}"}`,
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
            seo: seoData,
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

        console.error(`❌ Failed: ${outline.slug}`)
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

  // ── SAVE FCM TOKEN (push notification opt-in dari browser) ──────────────
  // Ditulis langsung di sini (bukan import dari lib/notifications.js) supaya
  // utils.js TIDAK ikut menyeret dependency berat firebase-admin/nodemailer
  // yang diinisialisasi di level modul file itu — cukup upsert Supabase biasa.
  if (action === 'save-fcm-token') {
    if (req.method !== 'POST') return res.status(405).end()

    const { userId, fcmToken } = req.body
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'Missing userId or fcmToken' })
    }

    try {
      const { error } = await supabase.from('user_push_tokens').upsert({
        user_id: userId,
        fcm_token: fcmToken,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ success: true })
    } catch (e) {
      console.error('[save-fcm-token] error:', e.message)
      return res.status(500).json({ error: 'Gagal menyimpan token notifikasi.' })
    }
  }

  // ── AI-POWERED JOB MATCHING (dipakai Opportunities.jsx) ──────────────────
  if (action === 'job-match') {
    if (req.method !== 'POST') return res.status(405).end()

    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    try {
      const [{ data: careerProfile }, { data: genomeData }] = await Promise.all([
        supabase.from('user_career_profiles')
          .select('target_posisi, posisi_saat_ini, industri, hambatan, skill_gaps, career_readiness')
          .eq('user_id', userId).maybeSingle(),
        supabase.from('user_genome_scores')
          .select('analytical, leadership, builder, creator, communication, risk_taking, top_strength')
          .eq('user_id', userId).maybeSingle(),
      ])

      // Profil belum cukup lengkap untuk matching yang akurat — pesan ini
      // dicek secara eksak oleh Opportunities.jsx untuk redirect ke Discovery.
      if (!careerProfile?.target_posisi || !genomeData) {
        return res.status(400).json({ error: 'Profil belum lengkap' })
      }

      const genomeSummary = Object.entries({
        analytical: genomeData.analytical, leadership: genomeData.leadership,
        builder: genomeData.builder, creator: genomeData.creator,
        communication: genomeData.communication, risk_taking: genomeData.risk_taking,
      })
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .map(([k, v]) => `${k}: ${v || 0}`)
        .join(', ')

      const jobMatchPrompt = `Profil karier user:
- Target posisi: ${careerProfile.target_posisi}
- Posisi saat ini: ${careerProfile.posisi_saat_ini || 'belum diketahui'}
- Industri diminati: ${careerProfile.industri || 'belum ditentukan'}
- Hambatan utama: ${careerProfile.hambatan || 'tidak ada catatan'}
- Skill gap: ${(careerProfile.skill_gaps || []).join(', ') || 'belum teridentifikasi'}
- Career readiness: ${careerProfile.career_readiness || 0}%
- Genome scores: ${genomeSummary}
- Kekuatan utama (top strength): ${genomeData.top_strength || 'belum terdeteksi'}

Berdasarkan profil di atas, buat 5 rekomendasi jenis peran/lowongan yang PALING relevan untuk pasar kerja Indonesia saat ini. Ini bukan lowongan riil dari job board — ini rekomendasi tipe peran & tipe perusahaan yang cocok dengan profil user, jadi field "company" HARUS berupa deskripsi tipe perusahaan (contoh: "Startup Fintech Seri A", "Perusahaan Multinasional FMCG", "Digital Agency Menengah"), BUKAN nama perusahaan riil spesifik.

Output HANYA JSON array valid (tanpa markdown, tanpa teks lain), format:
[
  {
    "role": "nama posisi spesifik",
    "company": "tipe/kategori perusahaan (bukan nama riil)",
    "salary": "range gaji realistis format Rp, contoh: Rp15-20jt/bulan",
    "match": angka_0_sampai_100,
    "reason": "1-2 kalimat kenapa ini cocok, kaitkan dengan genome/skill/target user"
  }
]
Urutkan dari match tertinggi. Gaji harus realistis untuk pasar Indonesia sesuai level & posisi.`

      const raw = await generateText({
        system: 'Kamu adalah Diah Anna, career matching engine Verneks. Output HANYA JSON array valid, tanpa backtick markdown, tanpa penjelasan tambahan.',
        prompt: jobMatchPrompt,
        maxTokens: 900,
        tier: 'fast',
      })

      const clean = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
      let jobs
      try {
        jobs = JSON.parse(clean)
      } catch (e) {
        console.error('[job-match] JSON parse failed:', raw.slice(0, 300))
        return res.status(500).json({ error: 'Gagal memproses rekomendasi, coba lagi sebentar.' })
      }

      if (!Array.isArray(jobs)) {
        return res.status(500).json({ error: 'Format rekomendasi tidak valid.' })
      }

      return res.status(200).json({ success: true, jobs })
    } catch (e) {
      console.error('[job-match] error:', e.message)
      return res.status(500).json({ error: 'Gagal memuat rekomendasi lowongan.' })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
