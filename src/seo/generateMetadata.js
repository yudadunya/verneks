// src/seo/generateMetadata.js
//
// Reusable metadata builder. Additive — tidak mengubah halaman manapun,
// dipanggil eksplisit dari halaman yang mau dimigrasi (lihat useSEO.js).
//
// AEO note: title & description ditulis sebagai "definition statement" —
// satu kalimat utuh yang bisa diekstrak AI search sebagai jawaban berdiri sendiri,
// bukan sekadar keyword string untuk ranking.

/**
 * @typedef {Object} MetadataInput
 * @property {string} title - Judul halaman, idealnya 50-60 karakter
 * @property {string} description - 150-160 karakter, kalimat definitif berdiri sendiri
 * @property {string} [path] - Path relatif, contoh: '/blog/cara-lolos-ats'
 * @property {string} [image] - URL absolut OG image, default ke icon Verneks
 * @property {string} [type] - og:type, default 'website'
 * @property {string[]} [keywords] - Opsional, dampak minimal di AI search tapi tidak merugikan
 * @property {boolean} [noindex] - Set true untuk halaman yang tidak boleh diindex
 */

const SITE_URL = 'https://verneks.my.id'
const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512x512.png`
const SITE_NAME = 'Verneks'

/**
 * Generate objek metadata lengkap dari input minimal.
 * @param {MetadataInput} input
 */
export function generateMetadata(input) {
  const {
    title,
    description,
    path = '/',
    image = DEFAULT_OG_IMAGE,
    type = 'website',
    keywords = [],
    noindex = false,
  } = input

  const url = `${SITE_URL}${path}`
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  return {
    title: fullTitle,
    description,
    canonical: url,
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    keywords: keywords.join(', '),
    og: {
      title: fullTitle,
      description,
      url,
      type,
      image,
      siteName: SITE_NAME,
      locale: 'id_ID',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      image,
    },
  }
}

/**
 * Apply metadata hasil generateMetadata() langsung ke document head.
 * Idempotent — aman dipanggil berkali-kali (update in place, tidak duplikat tag).
 * @param {ReturnType<typeof generateMetadata>} meta
 */
export function applyMetadata(meta) {
  document.title = meta.title

  const setMeta = (selector, attr, value) => {
    let el = document.querySelector(selector)
    if (!el) {
      el = document.createElement('meta')
      const [, attrName, attrValue] = selector.match(/\[(\w+)="([^"]+)"\]/) || []
      if (attrName) el.setAttribute(attrName, attrValue)
      document.head.appendChild(el)
    }
    el.setAttribute(attr, value)
  }

  setMeta('meta[name="description"]', 'content', meta.description)
  setMeta('meta[name="robots"]', 'content', meta.robots)
  if (meta.keywords) setMeta('meta[name="keywords"]', 'content', meta.keywords)

  // Open Graph
  setMeta('meta[property="og:title"]', 'content', meta.og.title)
  setMeta('meta[property="og:description"]', 'content', meta.og.description)
  setMeta('meta[property="og:url"]', 'content', meta.og.url)
  setMeta('meta[property="og:type"]', 'content', meta.og.type)
  setMeta('meta[property="og:image"]', 'content', meta.og.image)
  setMeta('meta[property="og:site_name"]', 'content', meta.og.siteName)
  setMeta('meta[property="og:locale"]', 'content', meta.og.locale)

  // Twitter
  setMeta('meta[name="twitter:card"]', 'content', meta.twitter.card)
  setMeta('meta[name="twitter:title"]', 'content', meta.twitter.title)
  setMeta('meta[name="twitter:description"]', 'content', meta.twitter.description)
  setMeta('meta[name="twitter:image"]', 'content', meta.twitter.image)

  // Canonical
  let canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = meta.canonical
}

export { SITE_URL, DEFAULT_OG_IMAGE, SITE_NAME }
