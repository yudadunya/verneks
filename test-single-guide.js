/**
 * TEST SINGLE GUIDE
 * 
 * File ini untuk test:
 * Apakah API bisa generate 1 guide?
 * 
 * Cara pakai:
 * 1. Download file ini
 * 2. Copy ke folder root project
 * 3. Run: node test-single-guide.js
 * 4. Lihat output
 * 5. Check Supabase apakah ada data baru
 */

import fetch from 'node-fetch'

console.log('🟢 STEP 1: TEST SINGLE GUIDE GENERATION')
console.log('========================================\n')

// Config
const API_URL = 'https://verneks.vercel.app/api/utils?action=generate-guide'
const CRON_SECRET = process.env.CRON_SECRET

console.log('📋 Configuration:')
console.log(`   API URL: ${API_URL}`)
console.log(`   CRON_SECRET: ${CRON_SECRET ? '✅ Ada' : '❌ TIDAK ADA - set dulu!'}`)

if (!CRON_SECRET) {
  console.error('\n❌ ERROR: CRON_SECRET tidak ada!')
  console.error('\nCara set:')
  console.error('   export CRON_SECRET=your-secret-from-vercel')
  console.error('\nOr di .env:')
  console.error('   CRON_SECRET=your-secret-from-vercel')
  process.exit(1)
}

console.log('\n---\n')

// Guide outline (test guide)
const testGuide = {
  id: 'test-1',
  slug: 'test-career-pivot',
  title: 'Test: Career Pivot Framework',
  keywords: ['career pivot', 'job change', 'career switch'],
  structure: {
    sections: [
      {
        h2: 'Apakah ini waktu yang tepat untuk pivot?',
        subsections: [
          '5 tanda-tanda kamu siap pivot',
          'Kapan BUKAN waktu yang tepat',
          'Quick assessment'
        ],
        faqs: [
          { q: 'Apa bedanya career pivot dan job change?', a: '...' },
          { q: 'Berapa lama pivot biasanya?', a: '...' }
        ]
      },
      {
        h2: '5 Langkah Framework Pivot',
        subsections: [
          'Step 1: Career DNA Assessment',
          'Step 2: Gap Analysis',
          'Step 3: GPS Roadmap',
          'Step 4: Execution',
          'Step 5: Land & Negotiate'
        ]
      },
      {
        h2: 'Common Mistakes',
        subsections: [
          'Mistake 1: No skill foundation',
          'Mistake 2: Wrong target role',
          'Mistake 3: Poor LinkedIn'
        ]
      }
    ],
    cta: {
      primary: 'Mau dipandu step-by-step? Chat dengan Diah Anna sekarang'
    }
  },
  internalLinks: ['skill-gap-analysis', 'networking-career-change'],
  schema: 'Article'
}

// Function to generate guide
async function generateTestGuide() {
  try {
    console.log('⏳ Sending request to API...\n')

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      body: JSON.stringify({
        guideOutline: testGuide,
        guideId: testGuide.id
      })
    })

    console.log(`📊 Response status: ${response.status}`)

    const data = await response.json()

    if (response.ok) {
      console.log('\n✅ SUCCESS! Guide generated!\n')
      console.log('📋 Details:')
      console.log(`   Slug: ${data.slug}`)
      console.log(`   Word count: ${data.wordCount} words`)
      console.log(`   Has FAQ: ${data.hasFAQ ? 'Yes ✅' : 'No ❌'}`)
      console.log('\n---\n')

      console.log('🔍 NEXT STEP: Check Supabase')
      console.log('   1. Go to: https://app.supabase.com')
      console.log('   2. Select project: qmadxpamdijfgelkkfgr')
      console.log('   3. Go to SQL Editor')
      console.log('   4. Run this query:')
      console.log('\n   SELECT * FROM career_library_drafts')
      console.log('   WHERE slug = \'test-career-pivot\';')
      console.log('\n   Harus ada 1 row baru dengan status = \'generated_and_optimized\'')

      return true
    } else {
      console.error('\n❌ ERROR! Response:')
      console.error(JSON.stringify(data, null, 2))
      return false
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nKemungkinan:')
    console.error('   1. CRON_SECRET salah')
    console.error('   2. API tidak active / error di Vercel')
    console.error('   3. Network error')
    return false
  }
}

// Run
generateTestGuide().then(success => {
  process.exit(success ? 0 : 1)
})
