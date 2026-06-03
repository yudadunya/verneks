// scripts/generate-sitemap.js
// Dijalankan otomatis saat: npm run build
// Tambah artikel baru? Tambahkan slug-nya di BLOG_SLUGS di bawah.

import { writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://lamarcerdas.my.id'
const today = new Date().toISOString().split('T')[0]

// ── Ambil slugs langsung dari blogPosts.js tanpa import (hindari JSX issues) ──
const blogPostsPath = resolve(__dirname, '../src/data/blogPosts.js')
const blogContent = readFileSync(blogPostsPath, 'utf-8')

// Ekstrak semua slug dan date pakai regex — tidak perlu execute JS
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

const outPath = resolve(__dirname, '../public/sitemap.xml')
writeFileSync(outPath, xml, 'utf-8')
console.log(`✅ Sitemap: ${allPages.length} URLs → ${outPath}`)
blogPages.forEach(p => console.log(`   ${p.url}`))
