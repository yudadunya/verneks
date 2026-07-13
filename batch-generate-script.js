/**
 * CAREER LIBRARY BATCH GENERATION SCRIPT
 * 
 * Usage:
 *   node batch-generate.js
 * 
 * What it does:
 *   1. Load all 20 guide outlines
 *   2. Call /api/ai-content?action=batch-generate
 *   3. Track progress
 *   4. Generate report
 * 
 * Timeline: ~2 hours for 20 guides
 * Output: Results saved to batch-generation-report.json
 */

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-here'

// ════════════════════════════════════════════════════════════════════════════
// GUIDE OUTLINES (20 guides)
// ════════════════════════════════════════════════════════════════════════════

const GUIDE_OUTLINES = [
  // TIER 1: High Intent
  {
    id: '1',
    slug: 'career-pivot-framework',
    title: 'Panduan Lengkap Career Pivot: Framework Terbukti (2024)',
    keywords: ['career pivot', 'job change', 'career switch', 'how to change careers'],
    structure: {
      sections: [
        {
          h2: 'Apakah ini waktu yang tepat untuk pivot?',
          subsections: ['5 tanda-tanda kamu siap pivot', 'Kapan BUKAN waktu yang tepat', 'Quick assessment tool'],
          faqs: [
            { q: 'Apa bedanya career pivot dan job change?', a: '...' },
            { q: 'Berapa lama pivot karier biasanya?', a: '...' }
          ]
        },
        {
          h2: '5 Langkah Framework Pivot (Verneks)',
          subsections: ['Step 1: Career DNA Assessment', 'Step 2: Gap Analysis', 'Step 3: GPS Roadmap', 'Step 4: Execution & Networking', 'Step 5: Land the role']
        }
      ],
      cta: {
        primary: 'Mau dipandu step-by-step? Chat dengan Diah Anna sekarang'
      }
    },
    internalLinks: ['skill-gap-analysis', 'networking-career-change']
  },
  {
    id: '2',
    slug: 'skill-gap-analysis',
    title: 'Skill Gap Analysis: Cara Temukan Skills yang Kurang (Template Included)',
    keywords: ['skill gap analysis', 'skill assessment', 'professional development'],
    structure: {
      sections: [
        {
          h2: 'Apa itu Skill Gap dan Kenapa Penting?',
          subsections: ['Definisi skill gap', 'Impact terhadap career growth']
        },
        {
          h2: '3 Metode Skill Gap Analysis',
          subsections: ['Self-Assessment', 'Peer Feedback', 'Job Market Research']
        }
      ],
      cta: { primary: 'Chat dengan Diah Anna untuk personalized skill gap assessment' }
    },
    internalLinks: ['career-pivot-framework', 'job-search-strategies']
  },
  {
    id: '3',
    slug: 'salary-benchmarks-indonesia',
    title: 'Gaji di Indonesia 2024: Benchmark by Role, Region & Experience',
    keywords: ['salary indonesia', 'gaji 2024', 'salary benchmark', 'berapa gaji'],
    structure: {
      sections: [
        {
          h2: 'Salary Ranges by Popular Roles',
          subsections: ['Tech roles', 'Business roles', 'Finance roles']
        },
        {
          h2: 'Factors That Impact Salary',
          subsections: ['Experience level', 'Company size', 'Industry', 'Location']
        }
      ],
      cta: { primary: 'Chat dengan Diah Anna untuk salary negotiation strategy' }
    },
    internalLinks: ['job-search-strategies', 'negotiation-tactics']
  },
  {
    id: '4',
    slug: 'job-search-strategies',
    title: 'Job Search Strategy 2024: Framework untuk Land Interview (30 Days)',
    keywords: ['job search strategy', 'how to find a job', 'job hunting'],
    structure: {
      sections: [
        {
          h2: '30-Day Job Search Framework',
          subsections: ['Week 1: Preparation', 'Week 2-3: Active search', 'Week 4: Follow-up']
        },
        {
          h2: 'Application Strategy: Quality > Quantity',
          subsections: ['Where to find jobs', 'Customize application', 'LinkedIn strategy']
        }
      ],
      cta: { primary: 'Get personalized job search strategy from Diah Anna' }
    },
    internalLinks: ['linkedin-optimization', 'interview-preparation']
  },
  {
    id: '5',
    slug: 'linkedin-optimization',
    title: 'LinkedIn Profile Optimization: Get More Interview Calls (Checklist)',
    keywords: ['linkedin optimization', 'linkedin profile', 'personal branding'],
    structure: {
      sections: [
        {
          h2: 'LinkedIn Profile Audit Checklist',
          subsections: ['Profile photo', 'Headline', 'About section', 'Experience', 'Skills']
        },
        {
          h2: 'Write Headlines That Convert',
          subsections: ['Bad examples', 'Good examples', 'Formula']
        }
      ],
      cta: { primary: 'Let Diah Anna review & optimize your LinkedIn profile' }
    },
    internalLinks: ['job-search-strategies', 'cover-letter-resume']
  },

  // TIER 2: Evergreen
  {
    id: '6',
    slug: 'career-assessment',
    title: 'Career Assessment: Find Your Strengths, Values & Fit',
    keywords: ['career assessment', 'career test', 'strengths finder'],
    structure: {
      sections: [
        {
          h2: '4 Dimensions of Career Assessment',
          subsections: ['Strengths', 'Values', 'Interests', 'Work style']
        }
      ],
      cta: { primary: 'Get Verneks Career Assessment (powered by Diah Anna)' }
    },
    internalLinks: ['career-pivot-framework', 'finding-target-role']
  },
  {
    id: '7',
    slug: 'finding-target-role',
    title: 'How to Find Your Target Role: Step-by-Step Framework',
    keywords: ['target role', 'career goals', 'job title'],
    structure: {
      sections: [
        {
          h2: 'From Vague Idea to Specific Role',
          subsections: ['Clarify', 'Research', 'Validate']
        }
      ],
      cta: { primary: 'Chat dengan Diah Anna untuk validate target role kamu' }
    },
    internalLinks: ['career-assessment', 'skill-gap-analysis']
  },
  {
    id: '8',
    slug: 'networking-career-change',
    title: 'Networking Strategy for Career Changers: Build Relationships That Lead to Jobs',
    keywords: ['networking', 'professional network', 'career networking'],
    structure: {
      sections: [
        {
          h2: 'Networking Channels (Prioritized)',
          subsections: ['LinkedIn', 'Events', 'Online communities', 'Informational interviews']
        }
      ],
      cta: { primary: 'Join Verneks community for career-focused networking' }
    },
    internalLinks: ['linkedin-optimization', 'job-search-strategies']
  },
  {
    id: '9',
    slug: 'cover-letter-resume',
    title: 'Resume & Cover Letter Masterclass: Templates + Examples That Convert',
    keywords: ['resume tips', 'cover letter', 'ATS optimization'],
    structure: {
      sections: [
        {
          h2: 'Resume Structure That Works',
          subsections: ['Header', 'Summary', 'Experience', 'Skills']
        }
      ],
      cta: { primary: 'Get Diah Anna to review & optimize your resume' }
    },
    internalLinks: ['job-search-strategies', 'linkedin-optimization']
  },
  {
    id: '10',
    slug: 'interview-preparation',
    title: 'Interview Preparation Checklist: Pass 80% of Interviews (Full Guide)',
    keywords: ['interview preparation', 'interview tips', 'job interview'],
    structure: {
      sections: [
        {
          h2: 'Pre-Interview Preparation (48 hours before)',
          subsections: ['Research', 'Prepare', 'Practice']
        },
        {
          h2: 'STAR Framework (Behavioral Questions)',
          subsections: ['Situation', 'Task', 'Action', 'Result']
        }
      ],
      cta: { primary: 'Practice interviews with Diah Anna (AI-powered)' }
    },
    internalLinks: ['job-search-strategies', 'negotiation-tactics']
  },
  {
    id: '11',
    slug: 'negotiation-tactics',
    title: 'Salary Negotiation Tactics: Get 10-20% More (Scripts Included)',
    keywords: ['salary negotiation', 'negotiate salary', 'job offer'],
    structure: {
      sections: [
        {
          h2: 'Negotiation Principles',
          subsections: ['Research', 'Timing', 'Anchor', 'Walk-away']
        }
      ],
      cta: { primary: 'Get coaching dari Diah Anna untuk negotiate confidently' }
    },
    internalLinks: ['salary-benchmarks-indonesia', 'job-search-strategies']
  },
  {
    id: '12',
    slug: 'freelance-vs-corporate',
    title: 'Freelance vs Corporate Jobs: Which Path is Right for You?',
    keywords: ['freelance vs employee', 'freelancing career', 'corporate job'],
    structure: {
      sections: [
        {
          h2: 'Freelance: Pros & Cons',
          subsections: ['Pros', 'Cons', 'Best for']
        },
        {
          h2: 'Corporate: Pros & Cons',
          subsections: ['Pros', 'Cons', 'Best for']
        }
      ],
      cta: { primary: 'Get personalized path recommendation from Diah Anna' }
    },
    internalLinks: ['salary-benchmarks-indonesia', 'career-pivot-framework']
  },
  {
    id: '13',
    slug: 'career-goals',
    title: 'SMART Career Goals: Framework + Template for Real Results',
    keywords: ['career goals', 'SMART goals', 'goal setting'],
    structure: {
      sections: [
        {
          h2: 'SMART Framework for Career Goals',
          subsections: ['Specific', 'Measurable', 'Achievable', 'Relevant', 'Time-bound']
        }
      ],
      cta: { primary: 'Build your career goals with Diah Anna\'s guidance' }
    },
    internalLinks: ['career-assessment', 'finding-target-role']
  },
  {
    id: '14',
    slug: 'mentorship-guide',
    title: 'Finding a Mentor & Maximizing Mentorship: Complete Guide',
    keywords: ['mentor', 'mentorship', 'career mentor'],
    structure: {
      sections: [
        {
          h2: 'Why Mentorship Matters',
          subsections: ['Accelerated learning', 'Avoiding mistakes', 'Network', 'Clarity']
        }
      ],
      cta: { primary: 'Get Diah Anna as your AI career mentor' }
    },
    internalLinks: ['networking-career-change', 'career-assessment']
  },

  // TIER 3: AI + Trends
  {
    id: '15',
    slug: 'using-ai-career-planning',
    title: 'Using AI Tools for Career Planning: Complete Toolkit (2024)',
    keywords: ['AI career planning', 'ChatGPT career', 'AI job search'],
    structure: {
      sections: [
        {
          h2: 'AI for Career Discovery',
          subsections: ['Job matching', 'Skills assessment', 'Market research']
        }
      ],
      cta: { primary: 'Try Diah Anna AI career coach (free trial)' }
    },
    internalLinks: ['job-search-strategies', 'interview-preparation']
  },
  {
    id: '16',
    slug: 'ai-skills-needed',
    title: 'AI Skills Every Professional Needs in 2024 (And How to Learn)',
    keywords: ['AI skills', 'prompt engineering', 'ChatGPT skills'],
    structure: {
      sections: [
        {
          h2: 'Universal AI Skills (Everyone)',
          subsections: ['Prompt engineering', 'Tool literacy', 'Critical thinking']
        }
      ],
      cta: { primary: 'Get personalized AI learning plan from Diah Anna' }
    },
    internalLinks: ['skill-gap-analysis', 'using-ai-career-planning']
  },
  {
    id: '17',
    slug: 'future-proof-career',
    title: 'Future-Proof Your Career: Adaptability Framework for 2025+',
    keywords: ['future proof career', 'career resilience', 'continuous learning'],
    structure: {
      sections: [
        {
          h2: 'Skills That Are Here to Stay',
          subsections: ['Adaptability', 'Critical thinking', 'Emotional intelligence']
        }
      ],
      cta: { primary: 'Build future-proof career with Diah Anna\'s guidance' }
    },
    internalLinks: ['ai-skills-needed', 'career-goals']
  },
  {
    id: '18',
    slug: 'career-trends-2024',
    title: 'Career & Job Market Trends 2024-2025: What\'s Hiring, What\'s Fading',
    keywords: ['job market trends', 'career trends 2024', 'hiring trends'],
    structure: {
      sections: [
        {
          h2: 'In-Demand Roles (2024-2025)',
          subsections: ['Tech', 'Business', 'Creative']
        }
      ],
      cta: { primary: 'Get personalized trend analysis for your field' }
    },
    internalLinks: ['ai-skills-needed', 'future-proof-career']
  },
  {
    id: '19',
    slug: 'remote-work-career',
    title: 'Remote Work Career Strategy: Thrive in Distributed Work (2024)',
    keywords: ['remote work', 'work from home', 'remote career'],
    structure: {
      sections: [
        {
          h2: 'Remote Work Success Factors',
          subsections: ['Visibility', 'Communication', 'Self-management']
        }
      ],
      cta: { primary: 'Get remote work optimization strategy from Diah Anna' }
    },
    internalLinks: ['job-search-strategies', 'future-proof-career']
  },
  {
    id: '20',
    slug: 'career-pivot-stories',
    title: 'Career Pivot Success Stories: Marketing → PM, Accountant → Designer, 3 Real Cases',
    keywords: ['career change stories', 'career pivot success', 'career transition'],
    structure: {
      sections: [
        {
          h2: 'Case Study 1: Marketing Manager → Product Manager',
          subsections: ['Before', 'Journey', 'Results', 'Lessons']
        }
      ],
      cta: { primary: 'Start your career pivot journey with Diah Anna coaching' }
    },
    internalLinks: ['career-pivot-framework', 'networking-career-change']
  }
]

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════════

async function batchGenerate() {
  console.log('🚀 Career Library Batch Generation Started')
  console.log(`📊 Generating ${GUIDE_OUTLINES.length} guides`)
  console.log(`⏱️  Est. time: ~2 hours (2s delay between each)`)
  console.log(`🔗 API: ${API_BASE}`)
  console.log('---')

  const startTime = Date.now()
  const results = []

  try {
    const response = await fetch(
      `${API_BASE}/api/ai-content?action=batch-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`
        },
        body: JSON.stringify({ guideOutlines: GUIDE_OUTLINES }),
        timeout: 14400000 // 4 hours timeout
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    const duration = Math.round((Date.now() - startTime) / 1000)
    const minutes = Math.round(duration / 60)

    console.log('')
    console.log('✅ BATCH GENERATION COMPLETE')
    console.log(`⏱️  Total time: ${minutes} minutes`)
    console.log(`✨ Success: ${data.successCount}/${data.total}`)

    if (data.failureCount > 0) {
      console.log(`⚠️  Failures: ${data.failureCount}`)
      console.log('\nFailed guides:')
      data.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  ❌ ${r.slug}: ${r.error}`)
        })
    }

    console.log('\n📋 Generated guides:')
    data.results
      .filter(r => r.status === 'success')
      .forEach(r => {
        console.log(`  ✅ ${r.slug} (${r.wordCount} words)`)
      })

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      duration_seconds: duration,
      total: data.total,
      success: data.successCount,
      failures: data.failureCount,
      results: data.results
    }

    fs.writeFileSync(
      path.join(__dirname, 'batch-generation-report.json'),
      JSON.stringify(report, null, 2)
    )

    console.log('\n📄 Report saved: batch-generation-report.json')
    console.log('\n🎉 Next step: Review content in Supabase > career_library_drafts')
  } catch (e) {
    console.error('❌ Error:', e.message)
    process.exit(1)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RUN
// ════════════════════════════════════════════════════════════════════════════

batchGenerate()
