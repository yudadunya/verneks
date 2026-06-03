// scripts/generate-sitemap.js
// Tambah artikel baru? Tambahkan di BLOG_ARTICLES di bawah.

import { writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://lamarcerdas.my.id'
const today = new Date().toISOString().split('T')[0]

// ── TAMBAH ARTIKEL BARU DI SINI ──────────────────────────────────────────
const BLOG_ARTICLES = [
  { slug: 'cara-lolos-ats-2024',                  date: '2025-01-15' },
  { slug: 'tips-interview-kerja-fresh-graduate',   date: '2025-01-22' },
  { slug: 'cara-negosiasi-gaji-saat-interview',    date: '2025-02-05' },
  { slug: 'cara-switch-karir-tanpa-pengalaman',    date: '2025-02-18' },
  { slug: 'cara-membuat-cv-yang-menarik',          date: '2025-03-01' },
  { slug: 'linkedin-tips-untuk-dicari-recruiter',  date: '2025-03-15' },
]
// ─────────────────────────────────────────────────────────────────────────

const staticPages = [
  { url: '/',        changefreq: 'weekly',  priority: '1.0', lastmod: today },
  { url: '/blog',    changefreq: 'weekly',  priority: '0.9', lastmod: today },
  { url: '/pricing', changefreq: 'monthly', priority: '0.7', lastmod: today },
]

const blogPages = BLOG_ARTICLES.map(a => ({
  url: `/blog/${a.slug}`,
  changefreq: 'monthly',
  priority: '0.8',
  lastmod: a.date,
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

// Cari folder public/ dari root project
const candidates = [
  resolve(__dirname, '../public/sitemap.xml'),
  resolve(__dirname, '../../public/sitemap.xml'),
]
const outPath = candidates.find(p => existsSync(dirname(p))) || candidates[0]

writeFileSync(outPath, xml, 'utf-8')
console.log(`Sitemap: ${allPages.length} URLs -> ${outPath}`)
