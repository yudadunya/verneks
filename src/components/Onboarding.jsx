import { useState } from 'react'

const SLIDES = [
  {
    emoji: null,
    title: 'Halo! Aku Diah Anna',
    desc: 'AI Career Coach kamu yang siap bantu 24/7 — gratis. Dari review CV sampai curhat soal resign, aku siap dengerin.',
    cta: 'Kenalan dulu →',
  },
  {
    emoji: '🛠️',
    title: 'Apa aja yang bisa aku bantu?',
    items: [
      { icon: '📄', label: 'Review CV', desc: 'Feedback spesifik dalam 30 detik' },
      { icon: '🎤', label: 'Mock Interview', desc: 'Latihan sampai pede (Pro)' },
      { icon: '✨', label: 'Bikin CV', desc: 'Format ATS, JobStreet, LinkedIn' },
      { icon: '🧠', label: 'Tanya Karir', desc: 'Curhat bebas, gratis selamanya' },
    ],
    cta: 'Keren, lanjut →',
  },
  {
    emoji: '🚀',
    title: 'Siap mulai?',
    desc: 'Ketik pertanyaan karir kamu langsung, atau pilih fitur dari menu di atas. Tidak ada pertanyaan yang salah!',
    tip: '💡 Tips: Mulai dengan upload CV kamu untuk dapat feedback instan.',
    cta: 'Mulai sekarang!',
  },
]

export default function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  const next = () => {
    if (isLast) return onDone()
    setIdx(i => i + 1)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,15,13,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 28px',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 36 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
            background: i === idx ? '#25D366' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        {/* Avatar or Emoji */}
        {slide.emoji === null ? (
          <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', marginBottom: 16, border: '3px solid rgba(37,211,102,0.5)', boxShadow: '0 0 24px rgba(37,211,102,0.2)' }}/>
        ) : (
          <div style={{ fontSize: '3.5rem', marginBottom: 16, lineHeight: 1 }}>{slide.emoji}</div>
        )}

        {/* Title */}
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.4px', marginBottom: 12, lineHeight: 1.3 }}>
          {slide.title}
        </h2>

        {/* Desc */}
        {slide.desc && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 24 }}>
            {slide.desc}
          </p>
        )}

        {/* Feature list (slide 2) */}
        {slide.items && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
            {slide.items.map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '11px 14px',
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{item.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tip (slide 3) */}
        {slide.tip && (
          <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 24, textAlign: 'left' }}>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>{slide.tip}</span>
          </div>
        )}

        {/* CTA */}
        <button onClick={next} style={{
          width: '100%', padding: '14px',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          color: '#fff', fontWeight: 700, fontSize: '0.95rem',
          borderRadius: 14, border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(37,211,102,0.3)',
        }}>
          {slide.cta}
        </button>

        {/* Skip */}
        {!isLast && (
          <button onClick={onDone} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', marginTop: 14, cursor: 'pointer' }}>
            Lewati
          </button>
        )}
      </div>
    </div>
  )
}
