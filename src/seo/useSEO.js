// src/seo/useSEO.js
//
// Hook satu pintu untuk apply metadata + structured data ke halaman manapun.
// Pemakaian aditif — halaman lama yang sudah set document.title manual
// TIDAK perlu diubah kecuali dimigrasi secara sadar.
//
// Contoh pakai:
//   useSEO({
//     title: 'Harga & Paket Verneks',
//     description: 'Verneks Premium Rp199.000 sekali bayar...',
//     path: '/pricing',
//     breadcrumb: [{ name: 'Home', item: '/' }, { name: 'Harga', item: '/pricing' }],
//     faq: [{ question: 'Apakah Verneks gratis?', answer: '...' }],
//   })

import { useEffect } from 'react'
import { generateMetadata, applyMetadata } from './generateMetadata'
import { breadcrumbSchema, faqSchema, injectSchemas, organizationSchema } from './generateSchema'

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

    const schemas = [
      input.includeOrganization ? organizationSchema() : null,
      input.breadcrumb ? breadcrumbSchema(input.breadcrumb) : null,
      input.faq ? faqSchema(input.faq) : null,
      ...(input.extraSchemas || []),
    ]
    injectSchemas(schemas, `seo-${input.path?.replace(/\//g, '-') || 'page'}`)

    // Tidak ada cleanup yang menghapus tag — metadata halaman berikutnya
    // akan overwrite in-place (lihat applyMetadata, idempotent by design).
  }, [input?.title, input?.description, input?.path])
}
