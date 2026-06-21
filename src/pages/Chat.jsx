import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Onboarding from '../components/Onboarding'
import ShareCard from '../components/ShareCard'
import ShareAppModal from '../components/ShareAppModal'
import BottomNav from '../components/BottomNav'
// Subscription/plan sekarang datang dari prop (di-lift ke App.jsx) — lihat komentar di komponen.

function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:0.9rem;margin:10px 0 3px;color:#111">$1</div>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:600;font-size:0.85rem;margin:8px 0 2px;color:#333">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<div style="padding:2px 0 2px 14px;position:relative"><span style="position:absolute;left:4px;color:var(--wa-green)">•</span>$1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding:2px 0 2px 14px;position:relative">$1</div>')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

async function apiFetch(url, body) {
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error(text.slice(0, 120)) }
  if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`)
  return data
}

const MAIN_MENU = [
  { id: 'cv-review', label: '📄 Review CV'     },
  { id: 'ats',       label: '🎯 ATS Checker'   },
  { id: 'interview', label: '🎤 Mock Interview' },
  { id: 'cv-maker',  label: '✨ Bikin CV'       },
  { id: 'coach',     label: '🧠 Tanya Karir'   },
]

const INTERVIEW_LEVELS = [
  { id: 'Fresh Graduate',    label: '🌱 Fresh Graduate'    },
  { id: 'Junior (1-3 thn)', label: '🔰 Junior (1-3 thn)' },
  { id: 'Mid (3-5 thn)',    label: '⭐ Mid (3-5 thn)'    },
  { id: 'Senior (5+ thn)', label: '🏆 Senior (5+ thn)'  },
]

const CV_FORMATS = [
  { id: 'fmt_ats',       label: '✅ ATS Friendly'    },
  { id: 'fmt_jobstreet', label: '🔍 JobStreet'        },
  { id: 'fmt_linkedin',  label: '💼 LinkedIn Profile' },
]

export default function Chat({ user, chatMessages = [], setChatMessages, subscription }) {
  const navigate = useNavigate()
  // Subscription sekarang dari App.jsx (single source of truth) — bukan fetch sendiri.
  // Lihat catatan di App.jsx soal kenapa ini di-lift.
  const { plan, loading: subLoading, checkUsage, logUsage, getRemainingChat, isExpired } = subscription

  const storageKey     = user?.id ? `lc_chat_${user.id}` : null
  const ONBOARDING_KEY = user?.id ? `onboarded_${user.id}` : null

  // Pakai chatMessages dari App.jsx langsung sebagai source of truth
  const messages    = chatMessages
  const setMessages = setChatMessages

  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [mode, setMode]                 = useState('menu')
  const [cvText, setCvText]             = useState('')
  const [interview, setInterview]       = useState({ position: '', level: '', messages: [], qNum: 0 })
  // coachHistory persistent — baca dari localStorage agar Diah Anna ingat konteks lintas sesi
  const coachKey = user?.id ? `lc_coach_${user.id}` : null
  // Guard greeting: pakai sessionStorage agar persisten lintas navigasi (remount)
  // useRef reset tiap remount → greeting muncul lagi setiap balik ke /chat
  const greetingKey     = user?.id ? `lc_greeted_${user.id}` : null
  const greetingFiredRef = useRef(false) // secondary guard untuk race condition
  const [coachHistory, setCoachHistoryRaw] = useState(() => {
    if (!coachKey) return []
    try {
      const saved = localStorage.getItem(coachKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return []
  })

  // Wrapper setCoachHistory yang auto-save ke localStorage
  const setCoachHistory = (updater) => {
    setCoachHistoryRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (coachKey) {
        try { localStorage.setItem(coachKey, JSON.stringify(next.slice(-30))) } catch {}
      }
      return next
    })
  }
  const [cvMakerInfo, setCvMakerInfo]   = useState({ text: '', format: '' })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCoachGate, setShowCoachGate]   = useState(false)

  // Hitung pesan user dalam sesi ini (dari chatMessages)
  const FREE_DAILY_LIMIT = 15
  const userMsgCountInSession = messages.filter(m => m.role === 'user').length

  // Skip onboarding kalau user sudah punya profil dari Discovery
  useEffect(() => {
    if (!user?.id) return
    const key = `onboarded_${user.id}`
    // Sudah pernah onboarding sebelumnya
    if (localStorage.getItem(key)) { setShowOnboarding(false); return }
    // Cek apakah sudah punya career profile dari Discovery
    supabase
      .from('user_career_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Sudah punya profil — skip onboarding, tandai sudah selesai
          localStorage.setItem(key, '1')
          setShowOnboarding(false)
        } else {
          // Belum ada profil — tampilkan onboarding
          setShowOnboarding(true)
        }
      })
  }, [user?.id])
  const handleOnboardingDone = (data) => {
    if (ONBOARDING_KEY) localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
    // Sapa user pakai nama dari onboarding
    if (data?.nama) {
      const firstName = data.nama.split(' ')[0]
      const targetText = data.target ? ` Goal kamu: ${data.target.toLowerCase()}.` : ''
      const cvText = data.cvText ? ' CV kamu sudah aku baca ya!' : ''
      pushBot(`Halo ${firstName}! 👋 Senang kenalan sama kamu.${targetText}${cvText}\n\nAda yang mau kamu ceritakan atau tanyakan soal karir sekarang?`)
    }
  }

  const bottomRef = useRef()
  const fileRef   = useRef()
  const containerRef = useRef()

  // ── visualViewport: adjust container saat keyboard muncul di mobile ──
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (containerRef.current) {
        containerRef.current.style.height = (vv.height - 65) + 'px'
        containerRef.current.style.top    = vv.offsetTop + 'px'
      }
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // ── pushBot & pushUser didefinisikan DULU sebelum dipakai di useEffect ──
  const pushBot = useCallback((text, quickReplies = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, quickReplies }])
  }, [])

  const pushUser = useCallback((text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text }])
  }, [])

  // ── Auth guard + greeting ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
  }, [user?.id, plan, subLoading])

  // ── Dynamic Greeting dari user_growth_state ──────────────────────────────
  useEffect(() => {
    if (!user) return
    if (subLoading) return // tunggu plan terload dulu
    if (plan !== 'free') return // greeting Discovery hanya untuk user free
    if (greetingFiredRef.current) return // race condition guard
    if (greetingKey && sessionStorage.getItem(greetingKey)) return // sudah greeting di sesi ini

    // Set guard SEBELUM fetch — prevent double greeting bahkan saat refresh cepat
    greetingFiredRef.current = true
    if (greetingKey) sessionStorage.setItem(greetingKey, '1')

    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]

    // Fetch growth_state + profil sekaligus untuk greeting & context injection
    Promise.all([
      supabase.from('user_growth_state').select('career_stage, progress_percent, current_focus, next_milestone, streak_days').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_career_profiles').select('nama, target_posisi, posisi_saat_ini, industri, hambatan, motivasi, gaya_kerja, career_readiness, skill_gaps, gps_steps, mentor_message, summary, greeted_at').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('analytical, leadership, builder, creator, communication, risk_taking, top_strength').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: g }, { data: p }, { data: gs }]) => {
      // ── Inject context ke coachHistory kalau kosong (device baru) ──
      if (coachHistory.length === 0 && p && (p.target_posisi || p.posisi_saat_ini)) {
        const GENOME_LABELS = { analytical: 'Analytical', leadership: 'Leadership', builder: 'Builder', creator: 'Creator', communication: 'Communication', risk_taking: 'Risk Taking' }
        const topGenome = gs ? Object.entries(GENOME_LABELS)
          .map(([k, label]) => ({ label, val: gs[k] || 0 }))
          .sort((a, b) => b.val - a.val)
          .filter(g => g.val > 0)
          .slice(0, 3)
          .map(g => `${g.label} (${g.val})`)
          .join(', ') : null

        const contextParts = [
          `[KONTEKS DASHBOARD USER — data lengkap dari profil & Discovery]`,
          p.nama                ? `Nama: ${p.nama}` : null,
          p.posisi_saat_ini     ? `Posisi saat ini: ${p.posisi_saat_ini}` : null,
          p.target_posisi       ? `Target posisi: ${p.target_posisi}` : null,
          p.industri            ? `Industri: ${p.industri}` : null,
          p.career_readiness != null ? `Career Readiness: ${p.career_readiness}%` : null,
          g?.career_stage       ? `Career Stage: ${g.career_stage} (progress ${g.progress_percent || p?.career_readiness || 0}%)` : null,
          g?.current_focus      ? `Focus saat ini: ${g.current_focus}` : null,
          g?.next_milestone     ? `Next milestone: ${g.next_milestone}` : null,
          p.hambatan     ? `Tantangan utama: ${p.hambatan}` : null,
          (() => {
            const rawG = p.skill_gaps
            const gaps = Array.isArray(rawG) ? rawG : (rawG && typeof rawG === 'object' ? Object.values(rawG) : [])
            return gaps.length ? `Skill gaps yang perlu dikembangkan: ${gaps.slice(0, 5).join(', ')}` : null
          })(),
          (() => {
            const steps = g?.gps_steps || p.gps_steps || []
            if (!steps.length) return null
            const stepList = steps.slice(0, 5).map((s, i) => {
              const label = typeof s === 'string' ? s : (s.step || s.label || s.title || JSON.stringify(s))
              const done  = typeof s === 'object' && s.done ? '✓' : `${i + 1}.`
              return `  ${done} ${label}`
            }).join('\n')
            return `GPS Roadmap (langkah karir):\n${stepList}`
          })(),
          (() => {
            const msg = p.mentor_message || g?.mentor_message
            return msg ? `Pesan mentor terakhir: "${msg}"` : null
          })(),
          topGenome ? `Career Genome (top 3): ${topGenome}` : null,
          gs?.top_strength ? `Top strength: ${gs.top_strength}` : null,
        ].filter(Boolean).join('\n')

        setCoachHistory([
          { role: 'user', content: contextParts },
          { role: 'assistant', content: 'Baik! Aku sudah baca semua data dashboard kamu — profil, roadmap GPS, skill gaps, dan genome. Kalau kamu mau tanya soal progress, langkah selanjutnya, atau apapun yang ada di dashboard, aku siap jelasin! 💪' }
        ])
      }

      // ── Cek greeted_at — sumber kebenaran greeting Discovery ──
      const hasDiscoveryData = p && (p.target_posisi || p.career_readiness)

      if (hasDiscoveryData) {
        // Double check: kalau greeted_at sudah ada di Supabase, update sessionStorage juga
        // Ini handle kasus private tab / browser baru yang tidak punya sessionStorage
        if (p.greeted_at && greetingKey) {
          sessionStorage.setItem(greetingKey, '1')
        }
        const neverGreeted = !p.greeted_at

        if (neverGreeted) {
          // ── GREETING PERTAMA SETELAH DISCOVERY ──
          const name = firstName || p?.nama?.split(' ')[0] || 'Kamu'
          const target = p.target_posisi || '-'
          const readiness = p.career_readiness || g?.progress_percent || 0
          const rawGaps = p.skill_gaps
          const gaps = (
            Array.isArray(rawGaps) ? rawGaps :
            rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) : []
          ).slice(0, 3)
          const gapLine = gaps.length > 0 ? ('\n\u26a0 Gap Utama:' + gaps.join(', ')) : ''
          const summaryMsg = ('Halo ' + name + ' \ud83d\udc4b\nSaya sudah menyimpan hasil Career Discovery kamu.\n\ud83c\udfaf Target:' + target + '\n\ud83d\udcca Readiness:' + readiness + '%' + gapLine + '\nSaya akan membantu kamu memahami langkah berikutnya.')
          // Set greeted_at ke Supabase DULU sebelum pushBot
          // supaya kalau user refresh langsung setelah greeting, tidak muncul lagi
          supabase.from('user_career_profiles')
            .update({ greeted_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .then()
          pushBot(summaryMsg)
        } else {
          // ── Greeting returning user — WOW MOMENT ──
          // Semua data dari Discovery sudah ada di p & g — tampilkan fakta spesifik
          const name      = firstName || p?.nama?.split(' ')[0] || ''
          const target    = p?.target_posisi
          const hambatan  = p?.hambatan
          const rawGaps   = p?.skill_gaps
          const gaps      = Array.isArray(rawGaps) ? rawGaps
                           : (rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) : [])
          const focus     = g?.current_focus
          const progress  = g?.progress_percent || p?.career_readiness || 0
          const streak    = g?.streak_days || 0
          const topStr    = gs?.top_strength

          // Build greeting line by line berdasarkan data yang tersedia
          const lines = []

          // Baris 1: Sapaan
          lines.push(`Halo${name ? ` ${name}` : ''} 👋`)

          // Baris 2: Target karier — inti dari "Diah Anna ingat kamu"
          if (target) {
            lines.push(`\nTerakhir kita berbicara,\nkamu ingin menjadi **${target}**.`)
          }

          // Baris 3: Tantangan spesifik (hambatan > skill gaps > current focus)
          if (hambatan) {
            lines.push(`\nTantangan terbesarmu saat ini:\n${hambatan}`)
          } else if (gaps.length >= 2) {
            lines.push(`\nKamu masih perlu mengembangkan\n**${gaps[0]}** dan **${gaps[1]}**.`)
          } else if (gaps.length === 1) {
            lines.push(`\nFokus pengembanganmu saat ini:\n**${gaps[0]}**.`)
          }

          // Baris 4 (opsional): Progress atau streak — tambah nuansa personal
          if (streak >= 3) {
            lines.push(`\n🔥 Streak **${streak} hari** — konsistensimu luar biasa!`)
          } else if (focus && focus !== gaps[0]) {
            lines.push(`\nKamu sedang mengerjakan **${focus}** — terus ya!`)
          } else if (progress > 0 && progress < 80) {
            const progressMsg = progress < 30 ? 'baru mulai, pantang menyerah!'
                               : progress < 60 ? 'sudah cukup jauh, jangan berhenti!'
                               : 'hampir sampai, sedikit lagi!'
            lines.push(`\nProgress kariermu **${progress}%** — ${progressMsg}`)
          }

          // Penutup + pertanyaan terbuka
          lines.push(`\nAku siap membantu kapan saja. 💪`)
          lines.push(`\nApa yang ingin kamu bahas hari ini?`)

          const greeting = lines.join('\n')
          pushBot(greeting)
        }
        return
      }

      // ── No discovery data: greeting fresh user tanpa history ──
      pushBot(`Halo${firstName ? ` ${firstName}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nAda yang bisa aku bantu hari ini?`)
    }).catch(() => {
      const firstName2 = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]
      pushBot(`Halo${firstName2 ? ` ${firstName2}` : ''}! 👋 Aku Diah Anna, AI Career Coach kamu.\n\nAda yang bisa aku bantu hari ini?`)
    })
  }, [user?.id, plan, subLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Greeting untuk user premium aktif ───────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (subLoading) return
    if (plan !== 'premium') return
    if (isExpired) return
    if (greetingFiredRef.current) return // race condition guard
    if (greetingKey && sessionStorage.getItem(greetingKey)) return // sudah greeting di sesi ini

    // Set KEDUA guard sebelum async fetch
    greetingFiredRef.current = true
    if (greetingKey) sessionStorage.setItem(greetingKey, '1')

    const firstName = (user?.user_metadata?.name || user?.user_metadata?.full_name || '').split(' ')[0]

    Promise.all([
      supabase.from('user_career_profiles').select('nama, target_posisi, posisi_saat_ini, career_readiness, skill_gaps, hambatan, motivasi, summary, greeted_at').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_growth_state').select('career_stage, progress_percent, current_focus, next_milestone, streak_days').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('top_strength').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: g }, { data: gs }]) => {
      const name     = firstName || p?.nama?.split(' ')[0] || ''
      const nameStr  = name ? ` ${name}` : ''
      const target   = p?.target_posisi || null
      const progress = g?.progress_percent || p?.career_readiness || 0
      const stage    = g?.career_stage || null
      const focus    = g?.current_focus || null
      const streak   = g?.streak_days || 0

      let greeting = ''

      if (!p?.greeted_at) {
        // Premium pertama kali — personal dari data discovery
        const hambatan = p?.hambatan
        const rawGaps  = p?.skill_gaps
        const gaps     = Array.isArray(rawGaps) ? rawGaps
                        : (rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) : [])
        const topGap   = gaps[0]
        const fLines   = [`Halo${nameStr}! ⭐ Selamat datang di Premium.`]
        if (target) fLines.push(`\nAku sudah baca semua data kariermu.\nTarget kamu: **${target}** — readiness ${progress}%.`)
        if (hambatan) {
          fLines.push(`\nAku tahu tantangan terbesarmu:\n${hambatan}`)
          fLines.push(`\nSekarang kita bisa kerja lebih dalam dan personal untuk mengatasinya.`)
        } else if (topGap) {
          fLines.push(`\nKita akan fokus menutup gap **${topGap}** yang paling krusial.`)
        }
        fLines.push(`\nMau mulai dari mana?`)
        greeting = fLines.join('\n')

        supabase.from('user_career_profiles')
          .update({ greeted_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .then()

      } else {
        // Returning premium — WOW MOMENT (sama seperti free, data lebih kaya)
        const hambatan = p?.hambatan
        const rawGaps  = p?.skill_gaps
        const gaps     = Array.isArray(rawGaps) ? rawGaps
                        : (rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) : [])

        const lines = []

        // Sapaan
        lines.push(`Halo${nameStr} 👋`)

        // Target karier — inti wow moment
        if (target) {
          lines.push(`\nTerakhir kita berbicara,\nkamu ingin menjadi **${target}**.`)
        }

        // Tantangan spesifik dari data discovery
        if (hambatan) {
          lines.push(`\nTantangan terbesarmu saat ini:\n${hambatan}`)
        } else if (gaps.length >= 2) {
          lines.push(`\nKamu masih perlu mengembangkan\n**${gaps[0]}** dan **${gaps[1]}**.`)
        } else if (gaps.length === 1) {
          lines.push(`\nFokus pengembanganmu saat ini:\n**${gaps[0]}**.`)
        }

        // Progress / streak / fokus
        if (streak >= 3) {
          lines.push(`\n🔥 Streak **${streak} hari** — konsistensimu luar biasa!`)
        } else if (focus && focus !== gaps[0]) {
          lines.push(`\nKamu sedang mengerjakan **${focus}** — terus ya!`)
        } else if (progress > 0 && progress < 80) {
          const progressMsg = progress < 30 ? 'baru mulai, pantang menyerah!'
                             : progress < 60 ? 'sudah cukup jauh, jangan berhenti!'
                             : 'hampir sampai, sedikit lagi!'
          lines.push(`\nProgress kariermu **${progress}%** — ${progressMsg}`)
        }

        // Penutup premium — sedikit berbeda dari free
        lines.push(`\nSebagai mentor premium-mu, aku siap membantu lebih dalam. ⭐`)
        lines.push(`\nMau kita mulai dari mana hari ini?`)

        greeting = lines.join('\n')
      }

      pushBot(greeting)
    })
  }, [user?.id, plan, subLoading, isExpired])

  // ── Persuasi Diah Anna saat premium expired ──────────────────────────────
  useEffect(() => {
    if (!isExpired) return

    const firstName = (user?.user_metadata?.name || user?.user_metadata?.full_name || '').split(' ')[0]
    const name = firstName ? ` ${firstName}` : ''

    setTimeout(() => {
      pushBot(
        `Halo${name}! 👋 Selamat datang kembali.\n\nAku perhatikan akses Premium kamu sudah berakhir. Selama premium, kamu sudah banyak berkembang — sayang kalau momentumnya berhenti di sini. 💪\n\nYuk lanjutkan perjalanan kariermu! Aktifkan kembali Premium dan aku siap bantu kamu capai target berikutnya. 🚀`,
        [{ id: '__open_upgrade', label: '⭐ Aktifkan Premium Lagi' }]
      )
    }, 800)
  }, [isExpired, user?.id])

  // ── Simpan ke localStorage setiap messages berubah ───────────────────
  // FIX: slice(-100) mencegah localStorage overflow → penyebab utama "stuck"
  // coachHistory sudah slice(-30), messages (UI) perlu batas juga
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100))) } catch {}
  }, [messages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])



  // ── Daily limit gate (Diah Anna persuasive messages) ──────────────────
  // Model baru: Free = 15 chat/hari, Premium = unlimited semua fitur
  // Tidak ada per-feature gate — semua fitur bisa dipakai, hanya dibatasi 15 chat/hari

  const DAILY_LIMIT_MSG = `Hei, aku senang banget kamu semangat hari ini! 💙

Tapi kita udah ngobrol **15 kali hari ini** — itu batas harian untuk paket Free.

Kuota kamu akan **reset otomatis tengah malam** (00:00 WIB). Jadi kamu bisa lanjut gratis besok.

Atau kalau kamu lagi serius cari kerja dan gak mau nunggu — **Premium** Rp 199rb/bulan kasih kamu semua fitur tanpa batas, termasuk Career GPS personal dan progress tracking.

Pilih yang sesuai buat kamu:`

  const showDailyLimitGate = () => {
    setCoachHistory(prev => [...prev, { role: 'assistant', content: DAILY_LIMIT_MSG }])
    pushBot(DAILY_LIMIT_MSG, [
      { id: '__upgrade_premium', label: '🚀 Upgrade Premium — Rp 199rb' },
      { id: '__continue_coach', label: '⏳ Tunggu reset besok' },
    ])
  }

  // Gate per-fitur: free user hanya 1x/bulan per fitur
  const FEATURE_GATE_MSG = {
    'cv-review': `Kamu sudah pakai jatah **CV Review** bulan ini 📄\n\nPaket Free memang cuma 1x per bulan — tapi itu cukup untuk kamu tahu di mana letak masalah CV kamu sekarang.\n\nKalau mau review lagi, kuota reset awal bulan depan. Atau upgrade **Premium** untuk review unlimited kapan saja.`,
    'ats': `Jatah **ATS Checker** bulan ini sudah terpakai 🎯\n\nSatu pengecekan sudah kasih kamu gambaran besar soal CV kamu di mata algoritma rekrutmen.\n\nMau cek ulang versi terbaru CV kamu? Upgrade **Premium** untuk akses unlimited.`,
    'interview': `Jatah **Mock Interview** bulan ini sudah terpakai 🎤\n\nSatu sesi latihan sudah cukup untuk tahu area mana yang perlu diperkuat.\n\nKalau mau latihan lagi sebelum interview beneran — upgrade **Premium** untuk sesi unlimited.`,
    'cv-maker': `Jatah **CV Maker** bulan ini sudah terpakai ✨\n\nCV yang sudah dibuat tadi bisa langsung kamu pakai untuk melamar.\n\nMau bikin versi lain atau format berbeda? Upgrade **Premium** untuk akses unlimited.`,
  }

  const showFeatureGate = (feature) => {
    const msg = FEATURE_GATE_MSG[feature] || `Jatah fitur ini sudah terpakai bulan ini.\n\nUpgrade **Premium** untuk akses unlimited.`
    setCoachHistory(prev => [...prev, { role: 'assistant', content: msg }])
    pushBot(msg, [
      { id: '__upgrade_premium', label: '🚀 Upgrade Premium — Rp 199rb' },
      { id: '__continue_coach', label: 'Lanjut ngobrol dulu' },
    ])
    setMode('coach')
  }

  // ── File upload ────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    pushUser(`📎 ${file.name}`)
    setLoading(true)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
      })
      const data = await apiFetch('/api/career-coach', { action: 'parse-cv', base64, fileName: file.name })
      setCvText(data.text)
      if (mode === 'cv-review-upload') {
        setMode('cv-review-job')
        pushBot('CV berhasil dibaca! 📄\n\nKamu mau apply ke posisi apa? (opsional, ketik "-" kalau skip)', [{ id: '__skip_job', label: 'Skip langsung review' }])
      } else if (mode === 'ats-upload') {
        setMode('ats-jd')
        pushBot('CV berhasil dibaca! 🎯\n\nPaste job description yang mau dilamar di sini. (opsional)', [{ id: '__skip_jd', label: 'Skip, cek aja' }])
      } else if (mode === 'cv-maker-upload') {
        setMode('cv-maker-format')
        pushBot('CV lama berhasil dibaca! ✨\n\nSekarang pilih format CV baru yang kamu mau — AI akan tulis ulang jadi lebih optimal:', CV_FORMATS)
      }
    } catch (e) {
      pushBot(`Gagal baca file: ${e.message}\n\nCoba paste teks CV kamu langsung ya.`)
    } finally {
      // FIX: finally agar loading tidak stuck walau ada unexpected error
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleQuickReply = (id, label) => { pushUser(label); route(id, label) }
  const handleSend = () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput(''); pushUser(msg); route(msg, msg)
  }

  // ── Router ─────────────────────────────────────────────────────────────
  const route = async (id, label) => {
    if (id === '__menu' || id === 'menu') { setMode('coach'); return }
    if (id === '__download_docx') {
      const lastBot = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 200)
      if (lastBot?.text) await downloadDocx(lastBot.text)
      return
    }
    if (id === '__share_app') { setShowShareApp(true); return }
    if (id === '__share_cv')  { const m = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 100); setShareCard({ text: m?.text || '', type: 'cv-review' }); return }
    if (id === '__share_ats') { const m = [...messages].reverse().find(m => m.role === 'bot' && (m.text?.length || 0) > 100); setShareCard({ text: m?.text || '', type: 'ats' }); return }
    if (id === '__pricing') { navigate('/pricing'); return }
    if (id === '__upgrade_premium') { window.open('http://lynk.id/yudadunya/r3o5ldq5qkex/checkout', '_blank', 'noopener,noreferrer'); return }
    if (id === '__open_upgrade') { openUpgradeModal(); return }
    if (id === '__genome_reveal') { await doGenomeReveal(); return }
    if (id === '__upgrade_gps')   { navigate('/paywall'); return }
    if (id === '__continue_coach') {
      // User mau lanjut ngobrol setelah lihat paywall — tetap di coach, context aman
      pushBot('Oke, lanjut ya! Ada yang mau kamu ceritakan atau tanyakan soal karir? 😊')
      return
    }
    if (id === 'cv-review') { startCvReview(); return }
    if (id === 'ats')       { startAts(); return }
    if (id === 'interview') { startInterview(); return }
    if (id === 'cv-maker')  { startCvMaker(); return }
    if (id === 'coach')     { startCoach(); return }
    if (id === '__skip_job') { await doCvReview(''); return }
    if (id === '__skip_jd')  { await doAts(''); return }

    switch (mode) {
      case 'cv-review-upload': { setCvText(id); setMode('cv-review-job'); pushBot('Oke! Kamu mau apply ke posisi apa? (ketik "-" kalau skip)', [{ id: '__skip_job', label: 'Skip langsung review' }]); return }
      case 'cv-review-job':   { await doCvReview(id === '-' || id === '__skip_job' ? '' : id); return }
      case 'ats-upload':      { setCvText(id); setMode('ats-jd'); pushBot('Oke! Paste job description-nya di sini kalau ada. (opsional)', [{ id: '__skip_jd', label: 'Skip, cek aja' }]); return }
      case 'ats-jd':          { await doAts(id === '__skip_jd' ? '' : id); return }
      case 'interview-position': { setInterview(prev => ({ ...prev, position: id })); setMode('interview-level'); pushBot(`Posisi: **${id}**\n\nLevel pengalaman kamu?`, INTERVIEW_LEVELS); return }
      case 'interview-level':    { setInterview(prev => ({ ...prev, level: id })); await startInterviewSession(interview.position, id); return }
      case 'interview-active':   { await answerInterview(id); return }
      case 'cv-maker-upload': {
        // User paste teks CV langsung — terima dan lanjut ke pilih format
        if (id.length > 100) {
          setCvText(id)
          setMode('cv-maker-format')
          pushBot('CV berhasil dibaca! ✨\n\nPilih format CV baru yang kamu mau:', CV_FORMATS)
        } else {
          pushBot('Paste teks CV kamu di sini, atau upload file PDF/Word pakai tombol 📎 di bawah.')
        }
        return
      }
      case 'cv-maker-format': { if (CV_FORMATS.find(f => f.id === id)) await doCvMaker(id.replace('fmt_', '')); return }
      case 'coach': {
        const triggered = await detectAndTriggerFeature(id)
        if (triggered) return
        await doCoach(id); return
      }
      default: {
        // Kalau sedang dalam flow cv-maker, jangan masuk coach
        if (mode.startsWith('cv-maker')) return

        // Cek keyword feature sebelum masuk coach biasa
        const triggered = await detectAndTriggerFeature(id)
        if (triggered) return

        // Tidak ada intent fitur — lanjut sebagai chat biasa
        setMode('coach')
        const startHistory = coachHistory.length > 0
          ? [...coachHistory, { role: 'user', content: id }]
          : [{ role: 'user', content: id }]
        setCoachHistory(startHistory)
        setLoading(true)
        try { await callCoachApi(startHistory) } finally { setLoading(false) } // FIX
      }
    }
  }

  // ── Helper: deteksi intent via obrolan dan trigger feature ──────────────
  const detectAndTriggerFeature = async (msg) => {
    const m = msg.toLowerCase()
    const wantsCvReview  = /mau review|tolong review|bantu review|cek cv|koreksi cv|nilai cv|feedback cv|benerin cv|review cv|upload cv|lihat cv/.test(m)
    const wantsAts       = /cek ats|skor ats|lolos ats|ats cv|ats checker|cek lolos|screen ats|bypass ats|tembus ats/.test(m)
    const wantsInterview = /latihan interview|mau interview|simulasi interview|mock interview|practice interview|latihan wawancara|simulasi wawancara|persiapan interview|coba interview/.test(m)
    const wantsCvMaker   = /bikin cv|buat cv|buatin cv|tulis cv|generate cv|cv maker|cv baru|cv dari nol/.test(m)

    // Serahkan checkUsage ke masing-masing starter — hindari double check
    if (wantsCvReview)  { await startCvReview();  return true }
    if (wantsAts)       { await startAts();        return true }
    if (wantsInterview) { await startInterview();  return true }
    if (wantsCvMaker)   { await startCvMaker();    return true }
    return false
  }

  // ── Feature starters ────────────────────────────────────────────────────
  const startCvReview = async () => {
    if (!await checkUsage('cv-review')) { showFeatureGate('cv-review'); return }
    setMode('cv-review-upload'); setCvText('')
    pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau langsung paste teks CV-nya di sini.')
  }

  const startAts = async () => {
    if (!await checkUsage('ats')) { showFeatureGate('ats'); return }
    setMode('ats-upload'); setCvText('')
    pushBot('Kirimkan file CV kamu (📎 PDF/Word), atau paste teks CV-nya di sini.')
  }

  const startInterview = async () => {
    if (!await checkUsage('interview')) { showFeatureGate('interview'); return }
    setMode('interview-position'); setInterview({ position: '', level: '', messages: [], qNum: 0 })
    pushBot('Siap latihan interview! 🎤\n\nMau melamar posisi apa?\n(contoh: Data Analyst, Software Engineer, Marketing Manager)')
  }

  const startCvMaker = async () => {
    if (!await checkUsage('cv-maker')) { showFeatureGate('cv-maker'); return }
    setMode('cv-maker-upload')
    setCvMakerInfo({ text: '', format: '' })
    pushBot('Oke, kita optimalkan CV kamu! ✨\n\nUpload CV lama kamu (PDF atau Word) — nanti AI tulis ulang jadi CV baru yang lolos ATS, JobStreet, atau LinkedIn.')
  }

  const startCoach = async () => {
    setMode('coach')
    // Jangan reset coachHistory — Diah Anna harus ingat konteks sebelumnya
    if (coachHistory.length === 0) {
      pushBot('Halo! Aku Diah Anna 💙\n\nMau ngobrolin apa soal karir kamu?')
    }
    // Kalau sudah ada history, langsung aktif tanpa greeting
  }

  // ── API calls ────────────────────────────────────────────────────────────
  const doCvReview = async (jobTarget) => {
    setMode('cv-review-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/career-coach', { action: 'cv-review', cvText, jobTarget, userId: user?.id })
      pushBot(data.review, [{ id: 'ats', label: '🎯 Cek ATS Score juga' }, { id: '__share_cv', label: '📤 Bagikan hasil' }, { id: '__share_app', label: '👥 Ajak teman coba' }])
      // Inject hasil review ke coachHistory agar Diah Anna ingat konteksnya
      // saat user lanjut ngobrol setelah review selesai
      setCoachHistory([
        {
          role: 'user',
          content: `Tolong review CV saya${jobTarget ? ` untuk posisi ${jobTarget}` : ''}.\n\nIsi CV:\n${cvText.slice(0, 2000)}`
        },
        {
          role: 'assistant',
          content: data.review
        }
      ])
      setMode('coach')
      // Ekstrak profil dari CV lengkap — goldmine data karir
      setTimeout(() => {
        apiFetch('/api/extract-profile', {
          userId: user.id,
          messages: [
            { role: 'user', content: `Ini CV saya${jobTarget ? ` untuk posisi ${jobTarget}` : ''}:\n\n${cvText.slice(0, 3000)}` },
            { role: 'assistant', content: data.review }
          ]
        }).catch(() => {})
      }, 1000)
    } catch (e) { pushBot(`Aduh, ada error: ${e.message}\n\nCoba lagi ya! 🙏`); setMode('menu') }
    finally { setLoading(false) } // FIX: finally agar loading tidak stuck
  }

  const doAts = async (jobDescription) => {
    setMode('ats-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/career-coach', { action: 'ats', cvText, jobDescription, userId: user?.id })
      pushBot(data.result, [{ id: 'cv-review', label: '📄 Review CV juga' }, { id: '__share_ats', label: '📤 Bagikan hasil' }, { id: '__share_app', label: '👥 Ajak teman coba' }])
      // Inject hasil ATS ke coachHistory agar Diah Anna ingat konteksnya
      setCoachHistory([
        {
          role: 'user',
          content: `Tolong cek ATS score CV saya${jobDescription ? ` untuk job description: ${jobDescription.slice(0, 500)}` : ''}.`
        },
        {
          role: 'assistant',
          content: data.result
        }
      ])
      setMode('coach')
      // Ekstrak profil dari CV + JD — double sinyal karir
      setTimeout(() => {
        apiFetch('/api/extract-profile', {
          userId: user.id,
          messages: [
            { role: 'user', content: `CV saya:\n\n${cvText.slice(0, 2000)}${jobDescription ? `\n\nJob Description: ${jobDescription.slice(0, 500)}` : ''}` },
            { role: 'assistant', content: data.result }
          ]
        }).catch(() => {})
      }, 1000)
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    finally { setLoading(false) } // FIX
  }

  const startInterviewSession = async (position, level) => {
    setMode('interview-active'); setLoading(true)
    try {
      const data = await apiFetch('/api/career-coach', { action: 'mock-interview', subAction: 'start', position, level, messages: [], userId: user?.id })
      setInterview(prev => ({ ...prev, messages: [{ role: 'assistant', content: data.reply }], qNum: data.questionNumber }))
      pushBot(data.reply)
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    finally { setLoading(false) } // FIX
  }

  const answerInterview = async (answer) => {
    setLoading(true)
    const newMsgs = [...interview.messages, { role: 'user', content: answer }]
    try {
      const data = await apiFetch('/api/career-coach', { action: 'mock-interview', subAction: 'answer', position: interview.position, level: interview.level, messages: newMsgs, questionNumber: interview.qNum, userId: user?.id })
      const updatedMsgs = [...newMsgs, { role: 'assistant', content: data.reply }]
      setInterview(prev => ({ ...prev, messages: updatedMsgs, qNum: data.questionNumber }))
      if (data.isComplete) {
        pushBot(data.reply)
        const fbData = await apiFetch('/api/career-coach', { action: 'mock-interview', subAction: 'feedback', position: interview.position, level: interview.level, messages: updatedMsgs, userId: user?.id })
        setMode('interview-done')
        const feedbackText = fbData.feedback || 'Sesi selesai! Kamu hebat! 🎉'
        pushBot(feedbackText, [{ id: 'interview', label: '🔄 Interview lagi' }, { id: '__share_app', label: '👥 Ajak teman coba' }])
        // Inject ke coachHistory agar Diah Anna tahu hasil interview
        const interviewSummary = updatedMsgs
          .map(m => `${m.role === 'user' ? 'Kandidat' : 'Interviewer'}: ${m.content.slice(0, 200)}`)
          .join('\n')
        setCoachHistory([
          { role: 'user', content: `Aku baru selesai mock interview untuk posisi ${interview.position} level ${interview.level}.\n\nRingkasan sesi:\n${interviewSummary.slice(0, 1500)}` },
          { role: 'assistant', content: `Ini feedback lengkap sesi mock interview kamu:\n\n${feedbackText.slice(0, 1500)}` }
        ])
        setMode('coach')
        // Ekstrak profil — interview memberi sinyal kuat soal target posisi & level
        extractAndSaveProfile([
          { role: 'user', content: `Saya baru selesai mock interview untuk posisi ${interview.position} level ${interview.level}.` },
          { role: 'assistant', content: feedbackText.slice(0, 600) }
        ]).catch(() => {})
      } else { pushBot(data.reply) }
    } catch (e) { pushBot(`Error: ${e.message}`) }
    finally { setLoading(false) } // FIX
  }

  const doCvMaker = async (format) => {
    setMode('cv-maker-done'); setLoading(true)
    try {
      const data = await apiFetch('/api/career-coach', { action: 'cv-maker', mode: 'optimize', format, cvText, userId: user?.id })
      pushBot(data.result, [
        { id: '__download_docx', label: '📥 Download Word (.docx)' },
        { id: '__share_cv', label: '📤 Bagikan CV' },
        { id: '__share_app', label: '👥 Ajak teman coba' },
              ])
      // Inject ke coachHistory agar Diah Anna tahu CV sudah dibuat
      setCoachHistory([
        { role: 'user', content: `Tolong buatkan CV saya dalam format ${format}.\n\nCV asli:\n${cvText.slice(0, 1500)}` },
        { role: 'assistant', content: `Oke! Berikut CV kamu yang sudah dioptimalkan dalam format ${format}:\n\n${data.result.slice(0, 1500)}` }
      ])
      setMode('coach')
      // Ekstrak profil — CV maker memberi banyak konteks karir
      extractAndSaveProfile([
        { role: 'user', content: `Saya minta CV dioptimalkan format ${format}.` },
        { role: 'assistant', content: data.result.slice(0, 600) }
      ]).catch(() => {})
    } catch (e) { pushBot(`Error: ${e.message}`); setMode('menu') }
    finally { setLoading(false) } // FIX
  }

  // Download hasil CV sebagai .docx
  const downloadDocx = async (markdown) => {
    try {
      const res = await fetch('/api/cv-to-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, filename: 'CV-Verneks' })
      })
      if (!res.ok) throw new Error('Gagal generate file')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'CV-Verneks.docx'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      pushBot('Gagal download file Word. Coba lagi ya!')
    }
  }

  // Keyword yang trigger paywall — hanya jika user EKSPLISIT minta mulai fitur
  // Sengaja dibuat ketat: harus ada kata kerja imperatif + objek fitur
  // "cerita tentang interview" atau "switch karir" TIDAK trigger
  const PAID_TRIGGERS = {
    mock_interview: [
      'mulai mock interview', 'mau mock interview', 'coba mock interview',
      'simulasikan interview', 'roleplay interview', 'latihan interview sekarang',
      'mulai latihan interview', 'mau latihan interview', 'interview sekarang',
    ],
    cv_review:      [
      'review cv ku', 'review cv saya', 'tolong review cv', 'cek cv ku', 'cek cv saya',
      'koreksi cv ku', 'koreksi cv saya', 'nilai cv ku', 'nilai cv saya',
      'analisa cv ku', 'analisa cv saya', 'feedback cv ku', 'feedback cv saya',
      'upload cv', 'kirim cv',
    ],
    cv_maker:       [
      'buatkan cv', 'bikin cv ku', 'bikin cv saya', 'buat cv ku', 'buat cv saya',
      'generate cv', 'tolong bikin cv', 'tolong buat cv', 'bantu bikin cv', 'bantu buat cv',
    ],
    ats_checker:    [
      'cek ats', 'cek skor ats', 'cek score ats', 'tes ats', 'test ats',
      'analisa ats', 'lihat ats score',
    ],
  }

  const checkPaidTrigger = (msg) => {
    const lower = msg.toLowerCase().trim()
    // Minimal 3 kata agar tidak salah trigger kalimat panjang
    if (lower.split(' ').length < 2) return null
    for (const [feature, keywords] of Object.entries(PAID_TRIGGERS)) {
      if (keywords.some(kw => lower.includes(kw))) return feature
    }
    return null
  }

  // ── Profile Extraction Engine ────────────────────────────────────────────

  // Konversi messages (format chat: {role,text}) → format API ({role,content})
  const messagesRef = useRef(chatMessages)
  useEffect(() => { messagesRef.current = chatMessages }, [chatMessages])

  // ── Simpan ringkasan sesi saat user keluar dari chat ────────────────────
  // Trigger: tab/browser ditutup (visibilitychange ke hidden) ATAU pindah halaman (unmount)
  // BUG FIX: kedua event bisa fire untuk sesi yang sama (tab disembunyikan, lalu app di-unmount)
  // — pakai flag sessionSavedRef supaya hanya terkirim SEKALI per sesi, walau dua trigger jalan.
  const sessionSavedRef = useRef(false)
  useEffect(() => {
    if (!user?.id) return
    sessionSavedRef.current = false // reset setiap kali user/sesi berganti

    const saveSessionNote = () => {
      if (sessionSavedRef.current) return // sudah terkirim untuk sesi ini — jangan ulang
      const history = getChatHistoryForExtract()
      const userCount = history.filter(m => m.role === 'user').length
      if (userCount < 2) return // sesi terlalu singkat

      sessionSavedRef.current = true // tandai SEBELUM fetch, bukan setelah — cegah race antara 2 trigger

      // NOTE: flush extract-profile terpisah DICABUT — tidak perlu.
      // extract-profile selalu kirim SELURUH riwayat (bukan delta), jadi
      // pesan yang "terlewat" karena throttle otomatis tertangkap di siklus
      // ekstraksi normal berikutnya (sesi depan, pesan ke-3+). Menambah fetch
      // terpisah di sini cuma menambah beban koneksi PAS momen pindah halaman —
      // justru kontributor ke masalah "stuck saat pindah navbar".

      fetch('/api/career-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-session-note', userId: user.id, messages: history }),
        keepalive: true, // penting — request tetap jalan walau tab ditutup
      }).catch(() => {})
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveSessionNote()
      if (document.visibilityState === 'visible') sessionSavedRef.current = false // tab dibuka lagi → sesi baru, boleh simpan lagi nanti
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      saveSessionNote() // jalan saat unmount — flag di atas mencegah double-fire kalau visibilitychange sudah duluan
    }
  }, [user?.id])

  const getChatHistoryForExtract = () => {
    return messagesRef.current
      .filter(m => (m.role === 'user' || m.role === 'bot') && (m.text || '').length > 0)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
  }

  // Ekstrak profil — jalan di background, silent fail
  // THROTTLE: dulu jalan TIAP pesan setelah pesan ke-3 (boros — 18x panggilan
  // AI untuk percakapan 20 pesan, padahal fakta seperti nama/target karir
  // jarang berubah tiap kalimat). Sekarang: tiap 4 pesan user SETELAH floor awal,
  // supaya tetap responsif terhadap info baru tanpa boros di tengah obrolan panjang.
  const lastExtractCountRef = useRef(0)
  const extractAndSaveProfile = async (extraMessages = []) => {
    if (!user?.id) return
    try {
      const combined = [...getChatHistoryForExtract(), ...extraMessages]
      const userCount = combined.filter(m => m.role === 'user').length
      if (userCount < 3) return

      // Selalu jalan pertama kali (userCount === 3), setelah itu tiap +4 pesan.
      const isFirstRun = lastExtractCountRef.current === 0
      const hasEnoughNewMessages = userCount - lastExtractCountRef.current >= 4
      if (!isFirstRun && !hasEnoughNewMessages) return

      lastExtractCountRef.current = userCount
      await apiFetch('/api/extract-profile', { userId: user.id, messages: combined })
    } catch (e) {
      console.warn('[profile] extract error (silent):', e)
    }
  }

  // Trigger setelah setiap pesan user — API punya guard sendiri (min 3 msg)
  const maybeExtractProfile = (extraMessages = []) => {
    if (!user?.id) return
    extractAndSaveProfile(extraMessages).catch(() => {})
  }

  // ── Genome Teaser Engine ──────────────────────────────────────────────────
  // Key localStorage: lc_teaser_done_{userId} — supaya hanya muncul sekali
  const triggerGenomeTeaser = async () => {
    if (!user?.id) return
    const teaserKey = `lc_teaser_done_${user.id}`
    if (localStorage.getItem(teaserKey)) return   // sudah pernah ditampilkan

    // Hitung berapa pesan user dalam sesi ini
    const userMsgCount = messagesRef.current.filter(m => m.role === 'user').length
    if (userMsgCount < 5) return   // belum cukup data

    // Cek apakah genome sudah ada di DB
    try {
      const { data: gs } = await supabase
        .from('user_genome_scores')
        .select('analytical,leadership,builder,creator,communication,risk_taking')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!gs || !Object.values(gs).some(v => (v || 0) > 0)) return  // belum ada genome

      // Semua kondisi terpenuhi — tampilkan teaser
      localStorage.setItem(teaserKey, '1')

      // Beri jarak agar tidak langsung muncul setelah reply AI
      await new Promise(r => setTimeout(r, 1200))
      pushBot(
        `Aku menemukan sesuatu yang menarik. 🔍\n\nBerdasarkan pola percakapan kita, aku sudah bisa memetakan **Career DNA** kamu — termasuk kekuatan terbesar dan gap yang paling menghambat targetmu.\n\nMau lihat hasil analisisnya?`,
        [{ id: '__genome_reveal', label: '✅ Ya, mau lihat!' },
         { id: '__menu',         label: 'Nanti saja' }]
      )
    } catch (e) {
      console.warn('[teaser] error:', e)
    }
  }

  const doGenomeReveal = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [{ data: gs }, { data: cp }] = await Promise.all([
        supabase.from('user_genome_scores').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_career_profiles').select('target_posisi,career_readiness,skill_gaps').eq('user_id', user.id).maybeSingle(),
      ])

      const GMAP = [
        { key:'analytical',    label:'Analytical',    emoji:'🧠', color:'#34B7F1' },
        { key:'leadership',    label:'Leadership',    emoji:'👑', color:'#F48FB1' },
        { key:'builder',       label:'Builder',       emoji:'⚙️', color:'#25D366' },
        { key:'creator',       label:'Creator',       emoji:'🎨', color:'#FFB74D' },
        { key:'communication', label:'Communication', emoji:'💬', color:'#CE93D8' },
        { key:'risk_taking',   label:'Risk Taking',   emoji:'🚀', color:'#EF9A9A' },
      ]

      const scores = gs || {}
      const sorted = [...GMAP]
        .filter(g => (scores[g.key] || 0) > 0)
        .sort((a,b) => (scores[b.key]||0) - (scores[a.key]||0))

      const readiness = cp?.career_readiness || 0
      const target    = cp?.target_posisi || null
      const gaps      = cp?.skill_gaps || []

      // Bangun teks genome sebagai chat message
      let msg = '🧬 **Career Genome Kamu**\n\n'
      sorted.forEach(g => {
        const val  = scores[g.key] || 0
        const bars = Math.round(val / 10)
        const fill = '█'.repeat(bars) + '░'.repeat(10 - bars)
        msg += g.emoji + ' **' + g.label + '** · ' + val + '\n' + fill + '\n\n'
      })

      if (readiness > 0) {
        msg += '---\n\n📊 **Career Readiness: ' + readiness + '%**\n'
        if (target) msg += '🎯 Target: ' + target + '\n'
      }

      if (gaps.length > 0) {
        msg += '\n📍 **Gap Utama:**\n'
        gaps.slice(0, 4).forEach(g => { msg += '✕ ' + g + '\n' })
      }

      pushBot(msg)

      // Jeda dramatis sebelum GPS upsell
      await new Promise(r => setTimeout(r, 1800))

      pushBot(
        `Oke, kamu sudah lihat DNA karier kamu. 📊\n\nSekarang aku mau jujur...\n\nAku sebenarnya sudah menyiapkan **roadmap 6 bulan** yang sangat spesifik untuk targetmu.\n\nRoadmap ini berisi:\n✓ Skill yang harus dipelajari\n✓ Urutan belajar yang optimal\n✓ Target mingguan yang realistis\n✓ Progress tracking step by step\n\n_Career GPS tersedia di Premium._`,
        [{ id: '__upgrade_gps',      label: '🚀 Buka Career GPS — Premium' },
         { id: '__continue_coach',   label: 'Lanjut ngobrol dulu' }]
      )

    } catch (e) {
      pushBot('Gagal memuat data, coba lagi ya! 🙏')
      console.warn('[genome-reveal]', e)
    } finally { setLoading(false) } // FIX
  }

  const doCoach = async (msg) => {
    // Cek daily limit untuk free user sebelum kirim ke API
    if (plan === 'free') {
      const canChat = await checkUsage('chat')
      if (!canChat) {
        showDailyLimitGate()
        return
      }
    }

    const newHistory = [...coachHistory, { role: 'user', content: msg }]
    setCoachHistory(newHistory)
    setLoading(true)
    try { await callCoachApi(newHistory) } finally { setLoading(false) } // FIX
    maybeExtractProfile()
    setTimeout(() => triggerGenomeTeaser(), 2000)
  }

  // Trigger UpgradeModal dari mana saja via custom event
  const openUpgradeModal = () => {
    window.dispatchEvent(new CustomEvent('show-upgrade'))
  }

  // Rotasi pesan persuasi halus — berbeda tiap muncul, tidak monoton
  const UPGRADE_NUDGES = [
    'Btw, aku sudah siapkan roadmap 6 bulan khusus untuk targetmu — tinggal dibuka. 🗺️',
    'Kalau mau langkah yang lebih spesifik untuk situasimu, Career GPS-mu sudah siap. ✨',
    'Ada lebih banyak yang bisa aku kasih kalau roadmap personalmu sudah terbuka. 🚀',
    'Jujur — untuk kondisimu ini ada 1 langkah yang jauh lebih efektif. Sudah aku tulis di Career GPS-mu.',
    'Aku udah petakan gap dan urutan belajar yang tepat untukmu — mau lihat? 🔍',
  ]

  const nudgeIndexRef = useRef(0)

  const callCoachApi = async (history) => {
    try {
      const data = await apiFetch('/api/career-coach', { messages: history, userId: user?.id || null })

      const reply = data.reply
      if (!reply) {
        pushBot('Koneksi bermasalah, coba kirim lagi ya! 🙏')
        return
      }

      const fullHistory = [...history, { role: 'assistant', content: reply }]
      setCoachHistory(fullHistory)

      // Untuk free user: nudge setiap 5 pesan — tidak setiap reply (spec V2)
      if (plan === 'free') {
        nudgeIndexRef.current += 1
        if (nudgeIndexRef.current % 5 === 0) {
          const nudge = UPGRADE_NUDGES[Math.floor(nudgeIndexRef.current / 5 - 1) % UPGRADE_NUDGES.length]
          pushBot(`${reply}\n\n_${nudge}_`, [{ id: '__open_upgrade', label: '🚀 Buka Career GPS Premium' }])
        } else {
          pushBot(reply, null)
        }
      } else {
        pushBot(reply, null)
      }

      // NOTE: extract-profile TIDAK dipanggil di sini lagi.
      // Sebelumnya dipanggil 2x untuk setiap pesan (di sini DAN via maybeExtractProfile()
      // yang dipanggil pemanggil fungsi ini) — duplikat ini menumpuk request background,
      // terutama saat sesi chat panjang, bikin halaman lain terasa 'macet' saat pindah tab
      // karena slot koneksi browser penuh oleh request yang menunggu fallback AI provider.
      // maybeExtractProfile() di pemanggil sudah cukup, jadi cukup sekali per pesan.
    } catch { pushBot('Diah Anna lagi sibuk sebentar, coba lagi ya! 🙏') }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const [shareCard, setShareCard] = useState(null)
  const [showShareApp, setShowShareApp] = useState(false)

  const canUpload = ['cv-review-upload', 'ats-upload', 'cv-maker-upload'].includes(mode)

  // CoachGate sudah digantikan oleh showDailyLimitGate() — pesan inline dari Diah Anna

  return (
    <>
    {/* ── FIX UTAMA: position fixed + inset 0 → header tidak pernah hilang ── */}
    <div ref={containerRef} style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      height: 'calc(100vh - 65px)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wa-chat-bg)',
      overflow: 'hidden',
    }}>
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} user={user} />}
      {shareCard && <ShareCard resultText={shareCard.text} type={shareCard.type} onClose={() => setShareCard(null)} />}
      {showShareApp && <ShareAppModal onClose={() => setShowShareApp(false)} />}

      {/* ── Header — selalu fixed di atas ── */}
      <div style={{ background: 'var(--wa-header)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, zIndex: 10 }}>
        <img src="/diah-anna.png" alt="Diah Anna" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(37,211,102,0.4)' }}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
            Diah Anna
            <img src="/icons/verified.png" width="16" height="16" alt="verified" style={{ flexShrink: 0, marginTop: 1 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.73rem' }}>AI Career Coach • online</div>
        </div>

      </div>



      {/* ── Messages — satu-satunya yang scroll ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: '2px', WebkitOverflowScrolling: 'touch' }}>
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const ts = new Date(Math.floor(msg.id))
          const timeStr = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0')
          return (
          <div key={msg.id} style={{ marginBottom: msg.quickReplies ? 2 : 1 }}>
            <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '82%', background: isUser ? '#DCF8C6' : '#fff', borderRadius: isUser ? '14px 3px 14px 14px' : '3px 14px 14px 14px', padding: '9px 13px 5px', fontSize: '0.875rem', lineHeight: 1.55, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: '#111B21', wordBreak: 'break-word' }}>
                <div dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 }}>
                  <span style={{ fontSize: '0.68rem', color: isUser ? '#5d8a6a' : '#999', lineHeight: 1 }}>{timeStr}</span>
                  {isUser && (
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                      <path d="M1 6L4.5 9.5L10.5 2" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L9.5 9.5L15.5 2" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
            {msg.quickReplies && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '5px 4px 6px' }}>
                {msg.quickReplies.map(qr => (
                  <button key={qr.id} onClick={() => handleQuickReply(qr.id, qr.label)} disabled={loading}
                    style={{ background: '#fff', border: '1.5px solid #25D366', color: '#075E54', borderRadius: 20, padding: '5px 13px', fontSize: '0.8rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 2 }}>
            <div style={{ background: '#fff', borderRadius: '3px 14px 14px 14px', padding: '12px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#aaa', animation: `dot-bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Upload hint ── */}
      {canUpload && (
        <div style={{ background: '#e8f5e9', borderTop: '1px solid #c8e6c9', padding: '6px 14px', fontSize: '0.75rem', color: '#2e7d32', textAlign: 'center', flexShrink: 0 }}>
          📎 Klik ikon clip untuk upload PDF/Word, atau paste teks CV langsung
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{ background: '#f0f2f5', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderTop: '1px solid #e0e0e0' }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        <button onClick={() => canUpload && fileRef.current?.click()}
          style={{ width: 38, height: 38, borderRadius: '50%', background: canUpload ? '#25D366' : '#ccc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, cursor: canUpload ? 'pointer' : 'default' }}>
          📎
        </button>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); handleSend() } }}
          placeholder="Ketik pesan..." disabled={loading}
          style={{ flex: 1, background: '#fff', border: 'none', borderRadius: 24, padding: '10px 16px', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-body)' }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          style={{ width: 38, height: 38, borderRadius: '50%', background: !loading && input.trim() ? '#25D366' : '#ccc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, cursor: !loading && input.trim() ? 'pointer' : 'default', color: '#fff' }}>
          ➤
        </button>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5 }
          40% { transform: scale(1.2); opacity: 1 }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
    <BottomNav isPremium={plan === 'premium'} />
    </>
  )
}