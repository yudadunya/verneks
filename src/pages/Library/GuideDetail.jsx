/**
 * src/pages/Library/GuideDetail.jsx
 * 
 * Single Career Guide Page
 * Shows full content, meta tags, schema, related guides, CTA
 */

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import '../../styles/Library.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function GuideDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [guide, setGuide] = useState(null)
  const [relatedGuides, setRelatedGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [toc, setToc] = useState([]) // Table of contents

  // Fetch guide & related guides
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch main guide
        const { data: guideData, error: guideError } = await supabase
          .from('career_library')
          .select('*')
          .eq('slug', slug)
          .maybeSingle()

        if (guideError || !guideData) {
          console.error('Guide not found:', guideError)
          navigate('/library')
          return
        }

        setGuide(guideData)

        // Set page title & meta
        document.title = `${guideData.title} - Verneks Career Library`
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
          metaDesc.content = guideData.meta_description
        }

        // Add JSON-LD schema
        const schema = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guideData.title,
          description: guideData.meta_description,
          author: {
            '@type': 'Person',
            name: 'Diah Anna',
            description: 'AI Career Coach at Verneks'
          },
          datePublished: guideData.published_at,
          dateModified: guideData.published_at,
          inLanguage: 'id-ID'
        }

        let oldScript = document.querySelector('script[data-guide-schema]')
        if (oldScript) oldScript.remove()

        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.setAttribute('data-guide-schema', 'true')
        script.innerHTML = JSON.stringify(schema)
        document.head.appendChild(script)

        // Extract table of contents from markdown
        if (guideData.content) {
          const headings = guideData.content.match(/^## .+$/gm) || []
          const tocItems = headings.map(h => ({
            text: h.replace(/^## /, '').trim(),
            id: h.replace(/^## /, '').trim().toLowerCase().replace(/\s+/g, '-')
          }))
          setToc(tocItems)
        }

        // Fetch related guides (3 random guides except current)
        const { data: relatedData } = await supabase
          .from('career_library')
          .select('id, slug, title, meta_description')
          .neq('slug', slug)
          .limit(3)

        setRelatedGuides(relatedData || [])
      } catch (err) {
        console.error('Error fetching guide:', err)
        navigate('/library')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, navigate])

  if (loading) {
    return <div className="guide-loading">Loading guide...</div>
  }

  if (!guide) {
    return <div className="guide-error">Guide not found</div>
  }

  return (
    <div className="guide-detail-container">
      {/* Back button */}
      <Link to="/library" className="guide-back">
        ← Kembali ke Library
      </Link>

      {/* Header */}
      <div className="guide-header">
        <h1>{guide.title}</h1>
        <p className="guide-meta">{guide.meta_description}</p>
        {guide.published_at && (
          <p className="guide-date">
            Dipublikasi: {new Date(guide.published_at).toLocaleDateString('id-ID')}
          </p>
        )}
      </div>

      <div className="guide-layout">
        {/* Main content */}
        <div className="guide-content-main">
          {toc.length > 0 && (
            <div className="guide-toc">
              <h4>Daftar Isi</h4>
              <ul>
                {toc.map((item, idx) => (
                  <li key={idx}>
                    <a href={`#${item.id}`}>{item.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Markdown content */}
          <div className="guide-markdown">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 {...props} />,
                h2: ({ node, children, ...props }) => {
                  const id = children
                    .toString()
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                  return <h2 id={id} {...props}>{children}</h2>
                },
                h3: ({ node, ...props }) => <h3 {...props} />,
                p: ({ node, ...props }) => <p {...props} />,
                ul: ({ node, ...props }) => <ul {...props} />,
                ol: ({ node, ...props }) => <ol {...props} />,
                li: ({ node, ...props }) => <li {...props} />,
                strong: ({ node, ...props }) => <strong {...props} />,
                em: ({ node, ...props }) => <em {...props} />,
                blockquote: ({ node, ...props }) => <blockquote {...props} />,
                code: ({ node, inline, ...props }) => 
                  inline ? <code {...props} /> : <pre><code {...props} /></pre>,
                a: ({ node, href, ...props }) => <a href={href} target="_blank" rel="noopener noreferrer" {...props} />,
              }}
            >
              {guide.content}
            </ReactMarkdown>
          </div>

          {/* CTA */}
          <div className="guide-cta">
            <h3>Butuh bimbingan lebih detail?</h3>
            <p>Chat dengan Diah Anna untuk diskusi personal tentang karier kamu</p>
            <Link to="/chat" className="cta-button">
              Chat dengan Diah Anna 🎯
            </Link>
          </div>
        </div>

        {/* Sidebar - Related guides */}
        {relatedGuides.length > 0 && (
          <aside className="guide-sidebar">
            <div className="related-guides-widget">
              <h4>Bacaan Terkait</h4>
              <div className="related-list">
                {relatedGuides.map((related) => (
                  <Link
                    key={related.id}
                    to={`/library/${related.slug}`}
                    className="related-item"
                  >
                    <h5>{related.title}</h5>
                    <p>{related.meta_description}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick CTA */}
            <div className="sidebar-cta">
              <h5>Pengen hasil lebih cepat?</h5>
              <Link to="/chat" className="sidebar-button">
                Chat dengan Diah Anna
              </Link>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="guide-bottom-nav">
        <Link to="/library" className="nav-link">
          ← Lihat semua guides
        </Link>
        <Link to="/chat" className="nav-link primary">
          Chat Sekarang 🎯
        </Link>
      </div>
    </div>
  )
}
