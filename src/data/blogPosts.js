// scripts/generate-sitemap.js
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://lamarcerdas.my.id'
const today = new Date().toISOString().split('T')[0]

// Cari blogPosts.js dari beberapa kemungkinan lokasi
const candidates = [
  resolve(__dirname, '../src/data/blogPosts.js'),     // scripts/ di root
  resolve(__dirname, '../../src/data/blogPosts.js'),  // scripts/ di dalam src/
  resolve(__dirname, '../data/blogPosts.js'),          // scripts/ di dalam src/
]
const blogPostsPath = candidates.find(p => existsSync(p))
if (!blogPostsPath) {
  console.error('❌ blogPosts.js tidak ditemukan. Coba path:', candidates)
  process.exit(1)
}

console.log(`📄 blogPosts.js ditemukan di: ${blogPostsPath}`)
const blogContent = readFileSync(blogPostsPath, 'utf-8')

// Ekstrak slugs dan dates via regex — tidak perlu execute JS
const slugMatches = [...blogContent.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)]
const dateMatches = [...blogContent.matchAll(/date:\s*['"`]([^'"`]+)['"`]/g)]

const blogPages = slugMatches.map((m, i) => ({
  url: `/blog/${m[1]}`,
  changefreq: 'monthly',
  priority: '0.8',
  lastmod: dateMatches[i]?.[1] || today,
}))

const staticPages = [
  { url: '/',        changefreq: 'weekly',  priority: '1.0', lastmod: today },
  { url: '/blog',    changefreq: 'weekly',  priority: '0.9', lastmod: today },
  { url: '/pricing', changefreq: 'monthly', priority: '0.7', lastmod: today },
]

const allPages = [...staticPages, ...blogPages]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`

// Cari public/ dari beberapa kemungkinan lokasi
const publicCandidates = [
  resolve(__dirname, '../public/sitemap.xml'),
  resolve(__dirname, '../../public/sitemap.xml'),
]
const outPath = publicCandidates.find(p => existsSync(dirname(p))) || publicCandidates[0]

writeFileSync(outPath, xml, 'utf-8')
console.log(`✅ Sitemap: ${allPages.length} URLs → ${outPath}`)
