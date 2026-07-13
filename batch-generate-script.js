/**
 * BATCH GENERATE SCRIPT
 * 
 * Generate semua 20 career guides sekaligus
 * 
 * Cara pakai:
 * 1. Download file ini
 * 2. Copy ke folder root project
 * 3. Set environment: export CRON_SECRET=YUd@067980
 * 4. Run: node batch-generate-script.js
 * 5. Wait 2-3 jam untuk semua selesai
 */

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_URL = 'https://lamarcerdas-bwac.vercel.app/api/utils?action=generate-guide'
const CRON_SECRET = process.env.CRON_SECRET

console.log('🚀 CAREER LIBRARY BATCH GENERATION')
console.log('====================================\n')

if (!CRON_SECRET) {
  console.error('❌ ERROR: CRON_SECRET not set!')
  console.error('\nSet environment variable:')
  console.error('  export CRON_SECRET=YUd@067980')
  process.exit(1)
}

// 20 Career Library Guide Outlines
const GUIDE_OUTLINES = [
  {
    id: '1',
    slug: 'career-pivot-framework',
    title: 'Career Pivot Framework: Panduan Lengkap Untuk Berhasil',
    keywords: ['career pivot', 'job change', 'career switch'],
    structure: {
      sections: [
        { h2: 'Apakah Ini Waktu yang Tepat untuk Pivot?', subsections: ['5 Tanda Kesiapan', 'Kapan Bukan Waktu Tepat'] },
        { h2: '5 Langkah Framework Pivot', subsections: ['Assessment', 'Gap Analysis', 'Roadmap', 'Execution', 'Negotiation'] },
        { h2: 'Cara Mengatasi Hambatan Umum', subsections: ['Fear', 'Skill Gap', 'Financial Worry'] }
      ],
      cta: { primary: 'Mulai pivot journey kamu bersama Diah Anna' }
    },
    internalLinks: ['skill-gap-analysis', 'networking-career-change'],
    schema: 'Article'
  },
  {
    id: '2',
    slug: 'skill-gap-analysis',
    title: 'Skill Gap Analysis: Identifikasi Keahlian yang Kamu Butuhkan',
    keywords: ['skill gap', 'skill development', 'career skills'],
    structure: {
      sections: [
        { h2: 'Apa Itu Skill Gap?', subsections: ['Definisi', 'Mengapa Penting'] },
        { h2: 'Cara Identifikasi Skill Gap Kamu', subsections: ['Self Assessment', 'Market Research', 'Competitor Analysis'] },
        { h2: 'Action Plan untuk Close Gap', subsections: ['Learning Strategy', 'Timeline', 'Resources'] }
      ],
      cta: { primary: 'Buat skill development plan kamu sekarang' }
    },
    internalLinks: ['career-pivot-framework', 'linkedin-optimization'],
    schema: 'Article'
  },
  {
    id: '3',
    slug: 'salary-benchmarks-indonesia',
    title: 'Salary Benchmarks Indonesia 2024: Berapa Gaji yang Seharusnya Kamu Dapat?',
    keywords: ['salary', 'gaji', 'benchmark', 'kompensasi'],
    structure: {
      sections: [
        { h2: 'Salary Range by Role & Experience', subsections: ['Junior', 'Mid-Level', 'Senior'] },
        { h2: 'Faktor yang Mempengaruhi Gaji', subsections: ['Industry', 'Company Size', 'Location', 'Skills'] },
        { h2: 'Bagaimana Negosiasi Gaji yang Lebih Tinggi', subsections: ['Research', 'Preparation', 'Negotiation Tips'] }
      ],
      cta: { primary: 'Pastikan gaji kamu sesuai dengan market value' }
    },
    internalLinks: ['negotiation-tactics', 'career-assessment'],
    schema: 'Article'
  },
  {
    id: '4',
    slug: 'job-search-strategies',
    title: 'Job Search Strategies yang Terbukti Efektif di Era Digital',
    keywords: ['job search', 'job hunting', 'career search'],
    structure: {
      sections: [
        { h2: 'Platform Job Search yang Efektif', subsections: ['LinkedIn', 'Job Boards', 'Company Websites', 'Networking'] },
        { h2: 'Cara Meningkatkan Visibility', subsections: ['Profile Optimization', 'Content Strategy', 'Networking'] },
        { h2: 'Follow-up Strategy yang Efektif', subsections: ['Email Follow-up', 'Relationship Building'] }
      ],
      cta: { primary: 'Optimalkan job search strategy kamu' }
    },
    internalLinks: ['linkedin-optimization', 'cover-letter-resume'],
    schema: 'Article'
  },
  {
    id: '5',
    slug: 'linkedin-optimization',
    title: 'LinkedIn Profile Optimization: Panduan Lengkap agar Kelihatan Professional',
    keywords: ['linkedin', 'profile', 'professional branding'],
    structure: {
      sections: [
        { h2: 'Struktur LinkedIn Profile yang Menarik', subsections: ['Photo', 'Headline', 'Summary', 'Experience'] },
        { h2: 'Cara Menulis Headline & Summary yang Menarik', subsections: ['Keywords', 'Value Proposition', 'CTA'] },
        { h2: 'Engagement Strategy', subsections: ['Content Sharing', 'Networking', 'Industry Participation'] }
      ],
      cta: { primary: 'Upgrade LinkedIn profile kamu hari ini' }
    },
    internalLinks: ['job-search-strategies', 'networking-career-change'],
    schema: 'Article'
  },
  {
    id: '6',
    slug: 'career-assessment',
    title: 'Career Assessment: Temukan Posisi Yang Paling Cocok Untuk Kamu',
    keywords: ['career assessment', 'career discovery', 'career planning'],
    structure: {
      sections: [
        { h2: 'Apa Itu Career Assessment?', subsections: ['Tools', 'Benefit', 'How It Works'] },
        { h2: 'Self Assessment Framework', subsections: ['Skills', 'Values', 'Interests', 'Personality'] },
        { h2: 'Menginterpretasi Hasil Assessment', subsections: ['Understanding Results', 'Action Planning'] }
      ],
      cta: { primary: 'Mulai career assessment kamu sekarang' }
    },
    internalLinks: ['skill-gap-analysis', 'career-pivot-framework'],
    schema: 'Article'
  },
  {
    id: '7',
    slug: 'finding-target-role',
    title: 'Bagaimana Menemukan Target Role yang Tepat untuk Karier Kamu?',
    keywords: ['target role', 'career goal', 'job title'],
    structure: {
      sections: [
        { h2: 'Criteria untuk Memilih Target Role', subsections: ['Fit', 'Growth', 'Compensation', 'Culture'] },
        { h2: 'Research Target Role Secara Mendalam', subsections: ['Job Description Analysis', 'Salary Research', 'Company Culture'] },
        { h2: 'Validation Sebelum Commit', subsections: ['Informational Interview', 'Shadowing', 'Project Experience'] }
      ],
      cta: { primary: 'Identifikasi target role kamu sekarang' }
    },
    internalLinks: ['career-assessment', 'networking-career-change'],
    schema: 'Article'
  },
  {
    id: '8',
    slug: 'networking-career-change',
    title: 'Networking untuk Career Change: Strategi Membangun Koneksi yang Berguna',
    keywords: ['networking', 'professional network', 'career connections'],
    structure: {
      sections: [
        { h2: 'Kenapa Networking Penting untuk Career Change?', subsections: ['Hidden Jobs', 'Mentorship', 'Credibility'] },
        { h2: 'Cara Membangun Network yang Kuat', subsections: ['Online Networking', 'Events', 'Informational Interviews'] },
        { h2: 'Networking Etiquette & Best Practices', subsections: ['Follow-up', 'Value Giving', 'Long-term Relationship'] }
      ],
      cta: { primary: 'Mulai networking strategy kamu sekarang' }
    },
    internalLinks: ['linkedin-optimization', 'job-search-strategies'],
    schema: 'Article'
  },
  {
    id: '9',
    slug: 'cover-letter-resume',
    title: 'Resume & Cover Letter yang Membuat Recruiter Tertarik',
    keywords: ['resume', 'cover letter', 'job application'],
    structure: {
      sections: [
        { h2: 'Struktur Resume yang ATS-Friendly', subsections: ['Format', 'Keywords', 'Achievements'] },
        { h2: 'Cara Menulis Cover Letter yang Menarik', subsections: ['Personalization', 'Storytelling', 'Call to Action'] },
        { h2: 'Common Mistakes & Cara Menghindarinya', subsections: ['Grammar', 'Relevance', 'Length'] }
      ],
      cta: { primary: 'Optimalkan resume & cover letter kamu' }
    },
    internalLinks: ['linkedin-optimization', 'interview-preparation'],
    schema: 'Article'
  },
  {
    id: '10',
    slug: 'interview-preparation',
    title: 'Interview Preparation: Panduan Lengkap Agar Lolos Wawancara',
    keywords: ['interview', 'job interview', 'interview tips'],
    structure: {
      sections: [
        { h2: 'Tipe-tipe Interview & Cara Menghadapinya', subsections: ['Behavioral', 'Technical', 'Case Study'] },
        { h2: 'Preparation Checklist', subsections: ['Company Research', 'Practice Questions', 'Logistics'] },
        { h2: 'During Interview Tips', subsections: ['First Impression', 'Communication', 'Asking Questions'] }
      ],
      cta: { primary: 'Siapkan interview kamu bersama Diah Anna' }
    },
    internalLinks: ['cover-letter-resume', 'negotiation-tactics'],
    schema: 'Article'
  },
  {
    id: '11',
    slug: 'negotiation-tactics',
    title: 'Negotiation Tactics: Cara Mendapatkan Gaji & Benefit yang Kamu Inginkan',
    keywords: ['negotiation', 'salary negotiation', 'benefits'],
    structure: {
      sections: [
        { h2: 'Persiapan Sebelum Negotiation', subsections: ['Research', 'Value Proposition', 'Walk-away Point'] },
        { h2: 'Negotiation Techniques yang Efektif', subsections: ['Anchoring', 'Win-win', 'Non-verbal Communication'] },
        { h2: 'Handling Objections & Counters', subsections: ['Common Objections', 'Response Strategies'] }
      ],
      cta: { primary: 'Raih gaji yang pantas untuk kamu' }
    },
    internalLinks: ['salary-benchmarks-indonesia', 'interview-preparation'],
    schema: 'Article'
  },
  {
    id: '12',
    slug: 'freelance-vs-corporate',
    title: 'Freelance vs Corporate: Mana yang Lebih Cocok untuk Kamu?',
    keywords: ['freelance', 'corporate', 'work style'],
    structure: {
      sections: [
        { h2: 'Perbandingan Freelance vs Corporate', subsections: ['Income', 'Stability', 'Growth', 'Work-life Balance'] },
        { h2: 'Siapa yang Cocok Jadi Freelancer?', subsections: ['Personality Traits', 'Skills Required', 'Financial Readiness'] },
        { h2: 'Transisi Dari Corporate ke Freelance (atau Sebaliknya)', subsections: ['Planning', 'Transition Strategy', 'Support System'] }
      ],
      cta: { primary: 'Ketahui pilihan karier yang terbaik untuk kamu' }
    },
    internalLinks: ['career-pivot-framework', 'career-goals'],
    schema: 'Article'
  },
  {
    id: '13',
    slug: 'career-goals',
    title: 'Cara Menetapkan Career Goals yang SMART dan Achievable',
    keywords: ['career goals', 'goal setting', 'career planning'],
    structure: {
      sections: [
        { h2: 'Mengapa Career Goals Penting?', subsections: ['Direction', 'Motivation', 'Progress Tracking'] },
        { h2: 'Framework SMART untuk Career Goals', subsections: ['Specific', 'Measurable', 'Achievable', 'Relevant', 'Time-bound'] },
        { h2: 'Cara Tracking & Adjusting Goals', subsections: ['Milestones', 'Regular Review', 'Pivot Strategy'] }
      ],
      cta: { primary: 'Buat career goals kamu sekarang' }
    },
    internalLinks: ['career-assessment', 'career-pivot-framework'],
    schema: 'Article'
  },
  {
    id: '14',
    slug: 'mentorship-guide',
    title: 'Mentorship Guide: Cara Mencari & Memanfaatkan Mentor untuk Karier',
    keywords: ['mentorship', 'mentor', 'career guidance'],
    structure: {
      sections: [
        { h2: 'Mengapa Mentor Penting?', subsections: ['Guidance', 'Network', 'Accountability'] },
        { h2: 'Cara Mencari Mentor yang Tepat', subsections: ['Where to Find', 'Criteria', 'Approach'] },
        { h2: 'Bagaimana Membangun Relationship dengan Mentor', subsections: ['Communication', 'Regular Meetings', 'Gratitude'] }
      ],
      cta: { primary: 'Mulai mentorship journey kamu' }
    },
    internalLinks: ['networking-career-change', 'career-goals'],
    schema: 'Article'
  },
  {
    id: '15',
    slug: 'using-ai-career-planning',
    title: 'Menggunakan AI untuk Career Planning: Tools & Strategies',
    keywords: ['AI', 'career planning', 'automation'],
    structure: {
      sections: [
        { h2: 'AI Tools untuk Career Planning', subsections: ['Resume Optimizer', 'Interview Prep', 'Salary Estimator'] },
        { h2: 'Bagaimana AI Dapat Membantu Karier Kamu', subsections: ['Personalization', 'Speed', 'Data-driven Insights'] },
        { h2: 'Limitations & Ethical Considerations', subsections: ['Bias', 'Privacy', 'Human Touch'] }
      ],
      cta: { primary: 'Leverage AI untuk percepat career growth kamu' }
    },
    internalLinks: ['career-assessment', 'job-search-strategies'],
    schema: 'Article'
  },
  {
    id: '16',
    slug: 'ai-skills-needed',
    title: 'Skills AI yang Wajib Dimiliki Profesional di Era Digital',
    keywords: ['AI skills', 'future skills', 'digital skills'],
    structure: {
      sections: [
        { h2: 'Top 10 AI Skills untuk Non-Tech Professionals', subsections: ['Prompt Engineering', 'Data Literacy', 'Automation'] },
        { h2: 'Bagaimana Belajar AI Skills?', subsections: ['Online Courses', 'Practice', 'Community'] },
        { h2: 'Bagaimana Showcase AI Skills Kamu?', subsections: ['Portfolio', 'Projects', 'Certifications'] }
      ],
      cta: { primary: 'Mulai belajar AI skills sekarang' }
    },
    internalLinks: ['using-ai-career-planning', 'skill-gap-analysis'],
    schema: 'Article'
  },
  {
    id: '17',
    slug: 'future-proof-career',
    title: 'Bagaimana Membuat Karier Kamu Future-Proof?',
    keywords: ['future skills', 'future-proof', 'career resilience'],
    structure: {
      sections: [
        { h2: 'Trends yang Akan Shape Karier di Masa Depan', subsections: ['Automation', 'AI', 'Remote Work', 'Sustainability'] },
        { h2: 'Skills & Mindsets yang Kamu Butuhkan', subsections: ['Adaptability', 'Learning Agility', 'Emotional Intelligence'] },
        { h2: 'Action Plan untuk Future-Proof Karier', subsections: ['Continuous Learning', 'Networking', 'Side Projects'] }
      ],
      cta: { primary: 'Amankan masa depan karier kamu sekarang' }
    },
    internalLinks: ['ai-skills-needed', 'career-goals'],
    schema: 'Article'
  },
  {
    id: '18',
    slug: 'career-trends-2024',
    title: 'Career Trends 2024: Peluang & Tantangan untuk Profesional',
    keywords: ['career trends', '2024', 'job market'],
    structure: {
      sections: [
        { h2: 'Top Career Opportunities 2024', subsections: ['Tech', 'Healthcare', 'Sustainability', 'Creative'] },
        { h2: 'Industries yang Pertumbuhannya Cepat', subsections: ['Growth Rate', 'Salary Outlook', 'Skills Needed'] },
        { h2: 'Bagaimana Posisi Kamu di Market Sekarang?', subsections: ['Competitive Analysis', 'Positioning Strategy'] }
      ],
      cta: { primary: 'Stay ahead dengan career trends terbaru' }
    },
    internalLinks: ['future-proof-career', 'ai-skills-needed'],
    schema: 'Article'
  },
  {
    id: '19',
    slug: 'remote-work-career',
    title: 'Remote Work Career: Bagaimana Berhasil di Era Kerja Jarak Jauh?',
    keywords: ['remote work', 'work from home', 'flexible work'],
    structure: {
      sections: [
        { h2: 'Advantages & Disadvantages Remote Work', subsections: ['Pros', 'Cons', 'Is It For You?'] },
        { h2: 'Cara Sukses Bekerja Remote', subsections: ['Discipline', 'Communication', 'Work-life Balance', 'Productivity'] },
        { h2: 'Career Growth dalam Remote Setting', subsections: ['Networking', 'Visibility', 'Upskilling'] }
      ],
      cta: { primary: 'Maksimalkan remote work career kamu' }
    },
    internalLinks: ['career-goals', 'freelance-vs-corporate'],
    schema: 'Article'
  },
  {
    id: '20',
    slug: 'career-pivot-stories',
    title: 'Career Pivot Stories: Inspirasi dari Profesional yang Berhasil Berpindah',
    keywords: ['career pivot', 'success stories', 'career change'],
    structure: {
      sections: [
        { h2: 'Story 1: Dari Banking ke Tech', subsections: ['Journey', 'Challenges', 'Results', 'Lessons'] },
        { h2: 'Story 2: Dari Corporate ke Entrepreneurship', subsections: ['Journey', 'Challenges', 'Results', 'Lessons'] },
        { h2: 'Common Patterns dari Successful Pivots', subsections: ['Planning', 'Execution', 'Mindset', 'Support System'] }
      ],
      cta: { primary: 'Jadilah success story berikutnya' }
    },
    internalLinks: ['career-pivot-framework', 'mentorship-guide'],
    schema: 'Article'
  }
]

// ════════════════════════════════════════════════════════════════════════════
// BATCH GENERATION - ONE GUIDE AT A TIME (NOT bulk)
// ════════════════════════════════════════════════════════════════════════════

async function batchGenerate() {
  console.log(`📊 Generating ${GUIDE_OUTLINES.length} Career Library Guides`)
  console.log(`⏱️  Estimated time: ~2-3 hours\n`)

  const startTime = Date.now()
  const results = []

  for (let i = 0; i < GUIDE_OUTLINES.length; i++) {
    const outline = GUIDE_OUTLINES[i]
    
    try {
      console.log(`[${i + 1}/${GUIDE_OUTLINES.length}] Generating: ${outline.slug}...`)

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`
        },
        body: JSON.stringify({
          guideOutline: outline,
          guideId: outline.id
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log(`   ✅ Success (${data.wordCount} words)\n`)
        results.push({
          id: outline.id,
          slug: outline.slug,
          status: 'success',
          wordCount: data.wordCount
        })
      } else {
        console.log(`   ❌ Error: ${data.error}\n`)
        results.push({
          id: outline.id,
          slug: outline.slug,
          status: 'failed',
          error: data.error
        })
      }

      // Delay 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`)
      results.push({
        id: outline.id,
        slug: outline.slug,
        status: 'failed',
        error: error.message
      })
    }
  }

  // RESULTS SUMMARY
  const endTime = Date.now()
  const totalSeconds = (endTime - startTime) / 1000
  const totalMinutes = Math.round(totalSeconds / 60)

  const successCount = results.filter(r => r.status === 'success').length
  const failureCount = results.filter(r => r.status === 'failed').length

  console.log('\n════════════════════════════════════════════════════════════════')
  console.log('✅ BATCH GENERATION COMPLETE')
  console.log('════════════════════════════════════════════════════════════════\n')

  console.log(`📊 Results:`)
  console.log(`   Total: ${results.length} guides`)
  console.log(`   Success: ${successCount} ✅`)
  console.log(`   Failed: ${failureCount} ❌`)
  console.log(`   Time: ${totalMinutes} minutes\n`)

  if (failureCount > 0) {
    console.log(`⚠️  Failed Guides:`)
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`   - ${r.slug}: ${r.error}`)
    })
    console.log()
  }

  // Save report
  const reportPath = path.join(__dirname, 'batch-generation-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTime: `${totalMinutes} minutes`,
    results: {
      total: results.length,
      success: successCount,
      failed: failureCount
    },
    guides: results
  }, null, 2))

  console.log(`📄 Report saved: batch-generation-report.json\n`)
  console.log('🎉 All done! Check Supabase for generated guides.')
  console.log('Next: Move approved drafts to published table.\n')
}

batchGenerate().catch(e => {
  console.error('❌ Fatal error:', e)
  process.exit(1)
})
