/**
 * src/pages/Library/index.jsx
 * 
 * Career Library List Page
 * Shows all 20 guides dengan search & filter
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import '../../styles/Library.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function LibraryList() {
  const [guides, setGuides] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Set page meta tags
  useEffect(() => {
    document.title = 'Career Library - Verneks'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.content = 'Jelajahi koleksi 20 career guides lengkap dari Diah Anna. Panduan praktis untuk pivot, skill development, networking, dan lebih banyak lagi.'
    }
  }, [])

  // Fetch guides
  useEffect(() => {
    const fetchGuides = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('career_library')
          .select('id, slug, title, meta_description, published_at')
          .order('published_at', { ascending: false })

        if (searchTerm.trim()) {
          query = query.or(
            `slug.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`
          )
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching guides:', error)
          setGuides([])
        } else {
          setGuides(data || [])
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setGuides([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(fetchGuides, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  return (
    <div className="library-container">
      {/* Header */}
      <div className="library-header">
        <h1>Career Library</h1>
        <p>Jelajahi panduan lengkap untuk memajukan karier kamu</p>
      </div>

      {/* Search */}
      <div className="library-search">
        <input
          type="text"
          placeholder="Cari guide by title atau keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="search-clear"
            onClick={() => setSearchTerm('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="library-stats">
        <p>{guides.length} guides tersedia</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading">
          <p>Loading guides...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && guides.length === 0 && (
        <div className="empty-state">
          <p>❌ Tidak ada guide yang cocok</p>
          <p className="small">Coba cari dengan kata kunci lain</p>
        </div>
      )}

      {/* Guides Grid */}
      {!loading && guides.length > 0 && (
        <div className="guides-grid">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/library/${guide.slug}`}
              className="guide-card"
            >
              <div className="guide-card-header">
                <h3>{guide.title}</h3>
              </div>
              <p className="guide-description">{guide.meta_description}</p>
              <div className="guide-footer">
                <span className="guide-link">Baca Selengkapnya →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="library-footer">
        <p>
          Ingin diskusi lebih dalam tentang karier kamu?{' '}
          <Link to="/chat">Chat dengan Diah Anna 🎯</Link>
        </p>
      </div>
    </div>
  )
}
