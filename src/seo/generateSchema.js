// src/seo/generateSchema.js
//
// Builder untuk JSON-LD structured data. Setiap fungsi return objek schema.org
// yang siap di-stringify dan disuntik sebagai <script type="application/ld+json">.
//
// AEO note: schema granular (FAQPage dengan banyak Q&A diskrit, HowTo dengan
// steps terpisah) jauh lebih mudah diekstrak AI search dibanding satu blok teks
// panjang. AI search engine membaca JSON-LD sebagai structured fact, bukan prosa.

const SITE_URL = 'https://verneks.my.id'

export function organizationSchema(opts = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Verneks',
    url: opts.url || SITE_URL,
    logo: opts.image || `${SITE_URL}/icons/icon-512x512.png`,
    description: 'AI career companion pertama di Indonesia — temukan DNA Karir, roadmap personal, dan coaching 24/7.',
    founder: { '@type': 'Person', name: 'YudVi Nexa Labs' },
  }
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Verneks',
    url: SITE_URL,
    inLanguage: 'id-ID',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * @param {{name: string, description: string, url: string}} input
 * Representasi satu halaman spesifik sebagai entity WebPage — melengkapi
 * WebSite (representasi keseluruhan situs).
 */
export function webPageSchema(input) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: { '@type': 'WebSite', name: 'Verneks', url: SITE_URL },
    inLanguage: 'id-ID',
  }
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Verneks',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: SITE_URL,
    description: 'AI career coaching platform dengan Career DNA Analysis, GPS Karir personal, dan mentor AI 24/7.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR', description: 'Gratis untuk memulai' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '120' },
  }
}

/**
 * @param {{question: string, answer: string}[]} items
 * AEO catatan: tiap Q&A adalah unit jawaban berdiri sendiri — tulis answer
 * sebagai kalimat lengkap tanpa bergantung konteks pertanyaan lain.
 */
export function faqSchema(items) {
  if (!items?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

/**
 * @param {{name: string, item: string}[]} crumbs - urutan dari root ke halaman saat ini
 */
export function breadcrumbSchema(crumbs) {
  if (!crumbs?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item.startsWith('http') ? c.item : `${SITE_URL}${c.item}`,
    })),
  }
}

/**
 * @param {{headline: string, description: string, datePublished: string, dateModified?: string, url: string, keywords?: string}} input
 */
export function articleSchema(input) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: { '@type': 'Organization', name: 'Verneks', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Verneks', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    keywords: input.keywords || '',
    inLanguage: 'id-ID',
    isAccessibleForFree: true,
  }
}

/**
 * @param {{name: string, description: string, totalTime?: string, steps: {name: string, text: string}[]}} input
 * Untuk konten "cara melakukan X" — misal "Cara Membuat CV ATS-Friendly".
 * Belum dipakai di halaman manapun sekarang, disiapkan untuk konten masa depan.
 */
export function howToSchema(input) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    step: input.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

/**
 * Inject array schema sebagai <script type="application/ld+json"> ke document head.
 * Idempotent — hapus script lama dengan data-seo-id yang sama sebelum inject ulang.
 * @param {object[]} schemas - array of schema objects (null entries di-skip)
 * @param {string} [groupId] - identifier untuk grup ini, default 'page-schema'
 */
export function injectSchemas(schemas, groupId = 'page-schema') {
  document.querySelectorAll(`script[data-seo-id^="${groupId}"]`).forEach(el => el.remove())

  schemas.filter(Boolean).forEach((schema, i) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo-id', `${groupId}-${i}`)
    script.textContent = JSON.stringify(schema)
    document.head.appendChild(script)
  })
}
