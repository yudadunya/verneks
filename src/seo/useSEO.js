// src/seo/useSEO.js
//
// SATU-SATUNYA SUMBER KEBENARAN untuk metadata + structured data dinamis.
// index.html hanya berisi fallback statis global (lihat komentar di index.html).
// Prinsip: One Page → One useSEO() call → One Source of Truth.
//
// Dua cara pakai:
//
// 1) Shortcut flags (paling umum, cukup untuk 90% halaman):
//   useSEO({
//     title: 'Harga & Paket Verneks',
//     description: '...',
//     path: '/pricing',
//     breadcrumb: [{ name: 'Home', item: '/' }, { name: 'Harga', item: '/pricing' }],
//     faq: [{ question: '...', answer: '...' }],
//     includeOrganization: true,   // hanya Home yang perlu true
//     includeWebSite: true,        // hanya Home yang perlu true
//     includeWebPage: true,        // default true, representasi halaman ini
//     includeSoftwareApplication: true, // hanya Home/Pricing
//   })
//
// 2) Schema eksplisit (untuk kasus custom, mis. Article di BlogPost):
//   useSEO({
//     title, description, path,
//     schema: [organizationSchema(), articleSchema({...})],
//   })

import { useEffect } from 'react'
import { generateMetadata, applyMetadata, SITE_URL } from './generateMetadata'
import {
  breadcrumbSchema,
  faqSchema,
  injectSchemas,
  organizationSchema,
  webSiteSchema,
  webPageSchema,
  softwareApplicationSchema,
} from './generateSchema'

/** @param {object} input */
export function useSEO(input) {
  useEffect(() => {
    if (!input?.title || !input?.description) return

    const meta = generateMetadata({
      title: input.title,
      description: input.description,
      path: input.path,
      image: input.image,
      type: input.type,
      keywords: input.keywords,
      noindex: input.noindex,
    })
    applyMetadata(meta)

    const includeWebPage = input.includeWebPage !== false // default true

    const schemas = [
      input.includeOrganization ? organizationSchema() : null,
      input.includeWebSite ? webSiteSchema() : null,
      includeWebPage ? webPageSchema({
        name: input.title,
        description: input.description,
        url: `${SITE_URL}${input.path || '/'}`,
      }) : null,
      input.includeSoftwareApplication ? softwareApplicationSchema() : null,
      input.breadcrumb ? breadcrumbSchema(input.breadcrumb) : null,
      input.faq ? faqSchema(input.faq) : null,
      ...(input.schema || []),
    ]

    injectSchemas(schemas, `seo-${input.path?.replace(/\//g, '-') || 'page'}`)

    // Tidak ada cleanup yang menghapus tag — metadata halaman berikutnya
    // akan overwrite in-place (lihat applyMetadata & injectSchemas, idempotent by design).
  }, [input?.title, input?.description, input?.path])
}
