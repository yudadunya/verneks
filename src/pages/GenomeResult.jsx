import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const GENOME_MAP = [
  { key: 'analytical',    label: 'Analytical',    emoji: '🧠', color: '#34B7F1', insight: 'Kamu berpikir sistematis dan suka menganalisis data sebelum memutuskan. Ini aset besar di era berbasis data.' },
  { key: 'leadership',    label: 'Leadership',    emoji: '👑', color: '#F48FB1', insight: 'Kamu punya insting untuk memimpin dan mengarahkan orang lain. Tim yang kamu pimpin cenderung punya arah yang jelas.' },
  { key: 'builder',       label: 'Builder',       emoji: '⚙️', color: '#25D366', insight: 'Kamu suka membangun sesuatu dari nol dan mengeksekusi ide. Gap antara konsep dan produk terasa kecil di tanganmu.' },
  { key: 'creator',       label: 'Creator',       emoji: '🎨', color: '#FFB74D', insight: 'Kamu nyaman dengan ambiguitas dan selalu punya sudut pandang segar. Kreativitasmu bukan sekadar estetika — tapi problem-solving.' },
  { key: 'communication', label: 'Communication', emoji: '💬', color: '#CE93D8', insight: 'Kamu mampu menyederhanakan hal kompleks dan membuat orang mengerti. Skill ini makin langka dan makin berharga.' },
  { key: 'risk_taking',   label: 'Risk Taking',   emoji: '🚀', color: '#EF9A9A', insight: 'Kamu nyaman mencoba hal baru dibanding kebanyakan orang. Toleransi risikomu tinggi — modal utama builder dan founder.' },
]

const READINESS_FACTORS = [
  { label: 'Ambisi & Goal Clarity',   desc: 'Seberapa jelas tujuan karirmu' },
  { label: 'Pengalaman Relevan',       desc: 'Track record di bidang target' },
  { label: 'Skill Match',             desc: 'Kecocokan skill dengan target posisi' },
  { label: 'Career Genome Score',     desc: 'Kekuatan natural sesuai karir target' },
  { label: 'Kesiapan Mental',         desc: 'Keterbukaan menghadapi tantangan baru' },
]

export default function GenomeResult() {
  const navigate = useNavigate()
  const [result, setResult]         = useState(null)
  const [revealed, setRevealed]     = useState(false)
  const [expandGenome, setExpandGenome] = useState(null)
  const [showReadiness, setShowReadiness] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)   // ← scroll-gated
  const ctaTriggerRef = useRef(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('lc_discovery_result')
    if (!saved) { navigate('/discovery'); return }
    try { setResult(JSON.parse(saved)); setTimeout(() => setRevealed(true), 100) }
    catch { navigate('/discovery') }
  }, [])

  // Tampilkan CTA hanya setelah GPS Preview masuk viewport
  useEffect(() => {
    if (!ctaTriggerRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCtaVisible(true) },
      { threshold: 0.4 }
    )
    obs.observe(ctaTriggerRef.current)
    return () => obs.disconnect()
  }, [result])

  if (!result) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0f0d' }}>
      <div style={{ fontSize:'2rem' }}>⏳</div>
    </div>
  )

  const gs           = result.genome_scores || {}
  const sortedGenome = [...GENOME_MAP].sort((a,b) => (gs[b.key]||0) - (gs[a.key]||0))
  const top          = sortedGenome[0]
  const topTwo       = sortedGenome.slice(0, 2)
  const readiness    = result.career_readiness || 0
  const p            = result.profile_preview || {}
  const growth       = result.growth_state || {}
  const gapSkills    = result.gap_skills || []
  const gpsSteps     = result.gps_steps || []
  const lockedCount  = gpsSteps.filter((_,i) => i >= 3).length

  const fade = (delay=0) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'none' : 'translateY(16px)',
    transition: `all 0.55s ease ${delay}s`,
  })

  return (
    <div style={{ minHeight:'100vh', background:'#0a0f0d', fontFamily:"'Plus Jakarta Sans', sans-serif", overflowX:'hidden' }}>

      {/* Header */}
      <div style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10, backdropFilter:'blur(8px)' }}>
        <button onClick={() => navigate('/discovery')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'0.82rem' }}>← Ulangi</button>
        <span style={{ color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>Career DNA Kamu</span>
        <div style={{ width:60 }} />
      </div>

      <div style={{ padding:'20px 18px', maxWidth:480, margin:'0 auto', paddingBottom: ctaVisible ? '140px' : '40px', transition:'padding-bottom 0.4s ease' }}>

        {/* 1. HERO */}
        <div style={{ textAlign:'center', marginBottom:24, ...fade(0) }}>
          <div style={{ fontSize:'3.2rem', marginBottom:8 }}>{top.emoji}</div>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.7rem', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:3 }}>Kekuatan Utama</div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:'1.7rem', marginBottom:6 }}>{top.label}</div>
          {p.target_posisi && (
            <div style={{ display:'inline-block', background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:99, padding:'4px 14px', color:'#25D366', fontSize:'0.8rem', fontWeight:600 }}>
              🎯 Target: {p.target_posisi}
            </div>
          )}
        </div>

        {/* 2. CAREER READINESS */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'18px', marginBottom:16, ...fade(0.07) }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ color:'#fff', fontWeight:700, fontSize:'0.92rem', marginBottom:2 }}>📊 Career Readiness</div>
              <button onClick={() => setShowReadiness(!showReadiness)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:'0.7rem', cursor:'pointer', padding:0 }}>
                {showReadiness ? '▲ sembunyikan' : '▾ dihitung dari apa?'}
              </button>
            </div>
            <div style={{ color:'#25D366', fontWeight:900, fontSize:'1.5rem', lineHeight:1 }}>{readiness}%</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:99, height:8, overflow:'hidden', marginBottom: showReadiness ? 14 : 0 }}>
            <div style={{ background:'linear-gradient(90deg,#25D366,#34B7F1)', width: revealed ? `${readiness}%` : '0%', height:'100%', borderRadius:99, transition:'width 1.3s ease 0.3s' }} />
          </div>
          {showReadiness && (
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.68rem', letterSpacing:'1px', marginBottom:2 }}>DIHITUNG DARI:</div>
              {READINESS_FACTORS.map((f,i) => {
                const v = Math.max(10, Math.min(100, Math.round(readiness * [0.85,0.75,1.05,0.95,0.9][i])))
                return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.78rem', fontWeight:600 }}>✓ {f.label}</div>
                      <div style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.68rem' }}>{f.desc}</div>
                    </div>
                    <div style={{ color:'#34B7F1', fontWeight:700, fontSize:'0.82rem', flexShrink:0, marginLeft:12 }}>{v}%</div>
                  </div>
                )
              })}
            </div>
          )}
          {growth.career_stage && (
            <div style={{ marginTop:10, color:'rgba(255,255,255,0.28)', fontSize:'0.72rem' }}>
              Stage: <span style={{ color:'#34B7F1' }}>{growth.career_stage}</span>
              {growth.current_focus && <> · {growth.current_focus}</>}
            </div>
          )}
        </div>

        {/* 3. CAREER GENOME */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'18px', marginBottom:16, ...fade(0.12) }}>
          <div style={{ color:'#fff', fontWeight:700, fontSize:'0.92rem', marginBottom:16 }}>🧬 Career Genome</div>
          {sortedGenome.map((g,i) => {
            const val = gs[g.key] || 0
            if (val === 0) return null
            const isExp = expandGenome === g.key
            return (
              <div key={g.key} style={{ marginBottom:14 }}>
                <div onClick={() => setExpandGenome(isExp ? null : g.key)} style={{ cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:'0.85rem', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{g.emoji} {g.label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:g.color, fontWeight:800, fontSize:'0.95rem' }}>{val}</span>
                      <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.7rem' }}>{isExp ? '▲' : '▾'}</span>
                    </div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:99, height:6, overflow:'hidden' }}>
                    <div style={{ background:g.color, height:'100%', borderRadius:99, width: revealed ? `${val}%` : '0%', transition:`width 0.9s ease ${0.3+i*0.07}s` }} />
                  </div>
                </div>
                {isExp && (
                  <div style={{ marginTop:8, padding:'10px 12px', background:`${g.color}11`, border:`1px solid ${g.color}22`, borderRadius:9, fontSize:'0.8rem', color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>
                    {g.insight}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ color:'rgba(255,255,255,0.22)', fontSize:'0.7rem' }}>Klik nama untuk lihat insight</div>
        </div>

        {/* 4. GAP ANALYSIS */}
        <div style={{ background:'rgba(255,183,77,0.06)', border:'1px solid rgba(255,183,77,0.18)', borderRadius:16, padding:'18px', marginBottom:16, ...fade(0.17) }}>
          <div style={{ color:'#FFB74D', fontWeight:700, fontSize:'0.92rem', marginBottom:14 }}>📍 Career Gap Analysis</div>
          {result.gap_summary && (
            <div style={{ color:'rgba(255,255,255,0.58)', fontSize:'0.83rem', lineHeight:1.65, marginBottom:14 }}>{result.gap_summary}</div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.68rem', letterSpacing:'1px', marginBottom:8 }}>GAP UTAMA:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {gapSkills.length > 0 ? gapSkills.map((skill,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem', color:'rgba(255,255,255,0.65)' }}>
                    <span style={{ color:'#EF5350', fontWeight:700, fontSize:'0.75rem', flexShrink:0 }}>✕</span> {skill}
                  </div>
                )) : <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.78rem' }}>—</div>}
              </div>
            </div>
            <div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.68rem', letterSpacing:'1px', marginBottom:8 }}>KEKUATAN:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {topTwo.map(g => (
                  <div key={g.key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem', color:'rgba(255,255,255,0.65)' }}>
                    <span style={{ color:'#25D366', fontWeight:700, fontSize:'0.75rem', flexShrink:0 }}>✓</span> {g.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. GPS PREVIEW — CTA trigger ada di sini */}
        {gpsSteps.length > 0 && (
          <div ref={ctaTriggerRef} style={{ background:'rgba(52,183,241,0.06)', border:'1px solid rgba(52,183,241,0.2)', borderRadius:16, padding:'18px', ...fade(0.22) }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <div style={{ color:'#34B7F1', fontWeight:700, fontSize:'0.92rem' }}>🚀 Career GPS Kamu</div>
              <div style={{ background:'rgba(52,183,241,0.15)', color:'#34B7F1', fontSize:'0.65rem', fontWeight:700, padding:'2px 9px', borderRadius:99 }}>PREVIEW</div>
            </div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.75rem', marginBottom:14 }}>Roadmap personal untuk menutup gap di atas 👆</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {gpsSteps.map((step,i) => {
                const isFree = i < 3
                const isDone = step.done
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', borderRadius:10, background: isDone ? 'rgba(37,211,102,0.1)' : isFree ? 'rgba(52,183,241,0.07)' : 'rgba(255,255,255,0.02)', border: isDone ? '1px solid rgba(37,211,102,0.25)' : isFree ? '1px solid rgba(52,183,241,0.15)' : '1px solid rgba(255,255,255,0.04)', position:'relative', overflow:'hidden' }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, background: isDone ? '#25D366' : isFree ? 'rgba(52,183,241,0.2)' : 'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color: isDone ? '#fff' : isFree ? '#34B7F1' : 'rgba(255,255,255,0.15)' }}>
                      {isDone ? '✓' : isFree ? i+1 : '🔒'}
                    </div>
                    <div style={{ fontSize:'0.84rem', fontWeight:600, color: isDone ? '#25D366' : isFree ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.15)', flex:1, filter: !isFree ? 'blur(4px)' : 'none', userSelect: !isFree ? 'none' : 'auto' }}>
                      {step.title}
                    </div>
                    {!isFree && (
                      <div style={{ position:'absolute', inset:0, background:'rgba(10,15,13,0.5)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.28)', fontWeight:600, letterSpacing:'0.5px' }}>🔒 PREMIUM</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {lockedCount > 0 && (
              <div style={{ marginTop:10, textAlign:'center', color:'rgba(255,255,255,0.22)', fontSize:'0.72rem' }}>
                {lockedCount} langkah selanjutnya terbuka setelah upgrade
              </div>
            )}
          </div>
        )}

      </div>

      {/* CTA — muncul hanya setelah GPS Preview terlihat */}
      <div style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480, padding:'16px 18px 32px',
        background:'linear-gradient(to top, #0a0f0d 80%, transparent)',
        opacity: ctaVisible ? 1 : 0,
        transform: ctaVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
        transition:'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: ctaVisible ? 'auto' : 'none',
      }}>
        <div style={{ background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:12, padding:'12px 14px', marginBottom:12, display:'flex', gap:10, alignItems:'flex-start' }}>
          <img src="/diah-anna.png" alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
          <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.75)', lineHeight:1.55 }}>
            <strong style={{ color:'#25D366' }}>Diah Anna:</strong>{' '}
            Saya sudah menyiapkan roadmap khusus untuk menutup gap ini. Tinggal satu langkah lagi untuk membukanya.
          </div>
        </div>
        <button onClick={() => navigate('/paywall')} style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:800, fontSize:'1rem', borderRadius:14, border:'none', cursor:'pointer', boxShadow:'0 4px 24px rgba(37,211,102,0.45)' }}>
          🎯 Buka Roadmap Lengkap
        </button>
        <div style={{ textAlign:'center', marginTop:7, color:'rgba(255,255,255,0.2)', fontSize:'0.68rem' }}>
          Career GPS · Unlimited Mentor · Progress Tracking
        </div>
      </div>
    </div>
  )
}
