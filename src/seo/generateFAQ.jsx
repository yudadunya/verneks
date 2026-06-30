// src/seo/generateFAQ.js
//
// Reusable FAQ component yang otomatis inject FAQPage schema saat mount.
// Pemakaian: <FAQSection items={[{question, answer}, ...]} />
// Render visual accordion DAN suntik JSON-LD sekaligus — satu sumber data,
// tidak ada duplikasi antara apa yang user lihat dan apa yang AI baca.
//
// AEO note: jawaban harus kalimat utuh berdiri sendiri (lihat catatan di
// generateSchema.js faqSchema). Komponen ini tidak memvalidasi panjang teks —
// itu tanggung jawab pemanggil saat menulis content.

import { useEffect, useState } from 'react'
import { faqSchema, injectSchemas } from './generateSchema'

/**
 * @param {{items: {question: string, answer: string}[], groupId?: string, title?: string}} props
 */
export function FAQSection({ items, groupId = 'faq', title = 'Pertanyaan Umum' }) {
  const [openIndex, setOpenIndex] = useState(null)

  useEffect(() => {
    if (!items?.length) return
    injectSchemas([faqSchema(items)], groupId)
  }, [items, groupId])

  if (!items?.length) return null

  return (
    <section aria-label={title} style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 14 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
              style={{
                width: '100%', textAlign: 'left', padding: '14px 16px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: '#fff', fontWeight: 600, fontSize: '0.88rem',
              }}
            >
              <span>{item.question}</span>
              <span style={{ transform: openIndex === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.7rem', flexShrink: 0, marginLeft: 10 }}>▼</span>
            </button>
            {openIndex === i && (
              <div style={{ padding: '0 16px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', lineHeight: 1.7 }}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
