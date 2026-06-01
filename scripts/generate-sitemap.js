// scripts/generate-sitemap.js
// Jalankan: node scripts/generate-sitemap.js
// Otomatis update sitemap.xml setiap kali ada artikel baru

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { BLOG_POSTS } = await import('../src/data/blogPosts.js')

const BASE_URL = 'https://lamarcerdas.com'
const today = new Date().toISOString().split('T')[0]

const staticPages = [
  { url: '/',        changefreq: 'weekly',  priority: '1.0', lastmod: today },
  { url: '/blog',    changefreq: 'weekly',  priority: '0.9', lastmod: today },
  { url: '/pricing', changefreq: 'monthly', priority: '0.7', lastmod: today },
]

const blogPages = BLOG_POSTS.map(post => ({
  url: `/blog/${post.slug}`,
  changefreq: 'monthly',
  priority: '0.8',
  lastmod: post.date,
}))

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
console.log(`Sitemap generated: ${allPages.length} URLs -> ${outPath}`)
