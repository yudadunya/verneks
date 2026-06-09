import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Onboarding from '../components/Onboarding'
import ShareCard from '../components/ShareCard'
import ShareAppModal from '../components/ShareAppModal'
import BottomNav from '../components/BottomNav'
import { useSubscription, LIMITS, PLAN_LABEL, FEATURE_LABEL } from '../hooks/useSubscription'

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

export default function Chat({ user, chatMessages = [], setChatMessages }) {
  const navigate = useNavigate()
  const { plan, loading: subLoading, checkUsage, logUsage, getRemainingChat, isExpired } = useSubscription(user?.id)

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
  }, [user?.id])

  // ── Dynamic Greeting dari user_growth_state ──────────────────────────────
  useEffect(() => {
    if (!user) return
    if (messages.length > 0) return

    const firstName = (user.user_metadata?.name || user.user_metadata?.full_name || '').split(' ')[0]

    // Fetch growth_state + profil sekaligus untuk greeting & context injection
    Promise.all([
      supabase.from('user_growth_state').select('career_stage, progress_percent, current_focus, next_milestone, streak_days').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_career_profiles').select('nama, target_posisi, posisi_saat_ini, industri, hambatan, career_readiness, skill_gaps, gps_steps, mentor_message').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_genome_scores').select('analytical, leadership, builder, creator, communication, risk_taking, top_strength').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: g }, { data: p }, { data: gs }]) => {
      // DEBUG — hapus setelah fix confirmed
      console.log("[Chat greeting] profiles:", JSON.stringify(p))
      console.log("[Chat greeting] growth:", JSON.stringify(g))
      console.log("[Chat greeting] hasDiscovery:", !!(p && (p.target_posisi || p.career_readiness)))
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
          g?.career_stage       ? `Career Stage: ${g.career_stage} (progress ${g.progress_percent || 0}%)` : null,
          g?.current_focus      ? `Focus saat ini: ${g.current_focus}` : null,
          g?.next_milestone     ? `Next milestone: ${g.next_milestone}` : null,
          p.hambatan     ? `Tantangan utama: ${p.hambatan}` : null,
          (() => {
            const gaps = p.skill_gaps || []
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

      // ── Cek apakah ini pertama kali masuk Chat setelah Discovery ──
      // Cek greeted_at — sumber kebenaran apakah sudah pernah dapat greeting Discovery
      const hasDiscoveryData = p && (p.target_posisi || p.career_readiness)

      if (hasDiscoveryData) {
        const neverGreeted = !p.greeted_at

        if (neverGreeted) {
          // GREETING PERTAMA SETELAH DISCOVERY
          const name = firstName || p?.nama?.split(' ')[0] || 'Kamu'
          const target = p.target_posisi || '-'
          const readiness = p.career_readiness || g?.progress_percent || 0
          const rawGaps = p.skill_gaps
          const gaps = (
            Array.isArray(rawGaps) ? rawGaps :
            rawGaps && typeof rawGaps === 'object' ? Object.values(rawGaps) :
            []
          ).slice(0, 3)
          const gapLine = gaps.length > 0 ? '\n\u26a0 Gap Utama:' + gaps.join(', ') : ''
          const summaryMsg = 'Halo ' + name + ' \ud83d\udc4b\nSaya sudah menyimpan hasil Career Discovery kamu.\n\ud83c\udfaf Target:' + target + '\n\ud83d\udcca Readiness:' + readiness + '%' + gapLine + '\nSaya akan membantu kamu memahami langkah berikutnya.'
          pushBot(summaryMsg)
          // Tandai sudah greeted
          supabase.from('user_career_profiles')
            .update({ greeted_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .then()
        } else {
          // Greeting returning user
          let greeting
          if (!g || !g.career_stage) {
            greeting = 'Halo' + (firstName ? ' ' + firstName : '') + '! \ud83d\udc4b Ada yang bisa aku bantu hari ini?'
          } else {
            const stage = g.career_stage
            const progress = g.progress_percent || 0
            const focus = g.current_focus
            const milestone = g.next_milestone
            const streak = g.streak_days || 0
            const greetingByStage = {
              'Career Explorer':    'Halo' + (firstName ? ' ' + firstName : '') + '! \ud83c\udf31 Progress ' + progress + '%.' + (focus ? ' Fokus sekarang: **' + focus + '**.' : '') + ' Mau bahas apa hari ini?',
              'Career Builder':     'Halo' + (firstName ? ' ' + firstName : '') + '! \ud83d\udd30 Progress ' + progress + '%.' + (milestone ? ' Next: **' + milestone + '**.' : '') + ' Ada yang bisa aku bantu?',
              'Career Professional':'Halo' + (firstName ? ' ' + firstName : '') + '! \u2b50 Progress ' + progress + '%.' + (focus ? ' Fokus: **' + focus + '**.' : '') + ' Mau naik level?',
              'Career Expert':      'Halo' + (firstName ? ' ' + firstName : '') + '! \ud83c\udfc6 Progress ' + progress + '%.' + (milestone ? ' Target: **' + milestone + '**.' : '') + ' Apa yang mau kita capai?',
              'Career Leader':      'Halo' + (firstName ? ' ' + firstName : '') + '! \ud83d\udc51 Progress ' + progress + '%. Bagaimana aku bisa bantu lebih jauh?',
            }
            greeting = greetingByStage[stage] || 'Halo' + (firstName ? ' ' + firstName : '') + '! \ud83d\udc4b Progress karirmu: ' + progress + '%. Ada yang bisa aku bantu?'
            if (streak >= 3) greeting += '\n\n\ud83d\udd25 Streak ' + streak + ' hari - mantap!'
          }
          pushBot(greeting)
        }
        return
      }
