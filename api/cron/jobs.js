/**
 * api/cron/jobs.js — Router untuk semua cron jobs
 * Routing via query param: ?job=weekly-review | compress-memory | cleanup | send-chat-reminders
 *
 * Menggabungkan: weekly-review.js + compress-memory.js + cleanup-chat-history.js + email-reminders.js
 * vercel.json cron paths diupdate ke /api/cron/jobs?job=...
 */
import { generateText } from '../lib/ai.js'
import { createClient } from '@supabase/supabase-js'
// FIX: sebelumnya import dari '../lib/email.js' yang TIDAK ADA di project ini
// — bikin seluruh file ini gagal di-load (jadi SEMUA cron job di sini mati,
// bukan cuma notifikasi). Fungsi email sebenarnya ada di notifications.js,
// digabung dengan push (FCM) lewat notifyChatReminder/notifyWeeklyReview.
import { notifyChatReminder, notifyWeeklyReview, notifyOnboardingNudge, getUserFcmToken } from '../lib/notifications.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const authHeader  = req.headers['authorization']
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const job = req.query.job
  if (!job) return res.status(400).json({ error: 'Missing job param' })

  // ── CLEANUP CHAT HISTORY ─────────────────────────────────────────────────
  if (job === 'cleanup') {
    const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const { error, count } = await supabase
      .from('user_chat_history').delete({ count: 'exact' }).lt('session_date', cutoff)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, deleted: count, cutoff })
  }

  // ── COMPRESS MEMORY ──────────────────────────────────────────────────────
  if (job === 'compress-memory') {
    const now     = new Date()
    const d30ago  = new Date(now - 30  * 86400000).toISOString().slice(0, 10)
    const d90ago  = new Date(now - 90  * 86400000).toISOString().slice(0, 10)
    const d365ago = new Date(now - 365 * 86400000).toISOString().slice(0, 10)
    let total = 0

    total += await compressTier({ olderThan: d30ago,  from: 'daily',   to: 'weekly',  days: 7,   words: 50 })
    total += await compressTier({ olderThan: d90ago,  from: 'weekly',  to: 'monthly', days: 30,  words: 25 })
    total += await compressTier({ olderThan: d365ago, from: 'monthly', to: 'yearly',  days: 365, words: 10 })

    return res.status(200).json({ success: true, totalCompressed: total })
  }

  // ── WEEKLY REVIEW ────────────────────────────────────────────────────────
  if (job === 'weekly-review') {
    function getWeekStart() {
      const d = new Date(); const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff); d.setHours(0,0,0,0)
      return d.toISOString().split('T')[0]
    }

    const weekStart   = getWeekStart()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

    const { data: users, error } = await supabase
      .from('user_career_profiles')
      .select('user_id, nama, target_posisi, career_readiness, gps_steps, running_insight, running_insight_updated_at')
      .not('career_readiness', 'is', null).limit(50)

    if (error) return res.status(500).json({ error: error.message })
    if (!users?.length) return res.status(200).json({ success: true, processed: 0 })

    // Fetch semua auth users untuk kirim email
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    const results = []
    for (const user of users) {
      try {
        const [eventsRes, capsulesRes] = await Promise.all([
          supabase.from('career_events')
            .select('event_type, event_payload').eq('user_id', user.user_id)
            .gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('memory_capsule_log')
            .select('capsule_text').eq('user_id', user.user_id)
            .gte('capsule_date', sevenDaysAgo.toISOString().slice(0,10))
            .order('capsule_date', { ascending: false }),
        ])

        const events   = eventsRes.data || []
        const capsules = capsulesRes.data || []
        if (events.length === 0 && capsules.length === 0) continue

        const milestonesDone = events.filter(e => e.event_type === 'milestone_completed')
        const doneCount  = (user.gps_steps || []).filter(s => s.done).length
        const totalCount = (user.gps_steps || []).length

        const summary = await generateText({
          system: 'Kamu adalah Diah Anna, AI career coach. Tulis catatan refleksi mingguan 2-4 kalimat, hangat dan personal. Bahasa Indonesia natural.',
          prompt: `Nama: ${user.nama || 'User'}\nTarget: ${user.target_posisi || '-'}\nProgress: ${doneCount}/${totalCount} step\nMilestone: ${milestonesDone.map(m => m.event_payload?.title).join(', ') || 'tidak ada'}\nRingkasan sesi:\n${capsules.map(c => `- ${c.capsule_text}`).join('\n') || '(tidak ada)'}`,
          maxTokens: 150, tier: 'fast',
        })

        await supabase.from('user_weekly_reviews').upsert({
          user_id: user.user_id, week_start: weekStart, review_text: summary.trim(),
        }, { onConflict: 'user_id,week_start' })

        // Kirim email + push notification setelah review di-generate
        try {
          const authUser = authUsers?.find(u => u.id === user.user_id)
          const fcmToken = await getUserFcmToken(user.user_id)
          if (authUser?.email || fcmToken) {
            await notifyWeeklyReview(authUser?.email, fcmToken, user.nama || 'User', summary.trim())
          }
        } catch (notifErr) {
          console.error(`[weekly-review notify failed for ${user.user_id}]`, notifErr)
        }

        // Update running_insight kalau belum diupdate minggu ini
        const alreadyUpdated = user.running_insight_updated_at
          && new Date(user.running_insight_updated_at) >= sevenDaysAgo
        if (!alreadyUpdated) {
          try {
            const newInsight = await generateText({
              system: 'Susun running insight 4 kalimat max tentang user ini untuk AI coach. Bahasa Indonesia, padat.',
              prompt: `Insight lama:\n${user.running_insight || '(belum ada)'}\n\nObservasi baru:\n${capsules.map(c => `- ${c.capsule_text}`).join('\n') || '(tidak ada)'}`,
              maxTokens: 200, tier: 'fast',
            })
            await supabase.from('user_career_profiles').update({
              running_insight: newInsight.trim(),
              running_insight_updated_at: new Date().toISOString(),
            }).eq('user_id', user.user_id)
          } catch {}
        }

        results.push({ userId: user.user_id, status: 'generated' })
      } catch (e) {
        results.push({ userId: user.user_id, status: 'failed', error: e.message })
      }
    }

    return res.status(200).json({
      success: true, weekStart,
      processed: results.length,
      generated: results.filter(r => r.status === 'generated').length,
    })
  }

  // ── SEND CHAT REMINDERS ──────────────────────────────────────────────────
  if (job === 'send-chat-reminders') {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()

    // Ambil semua users yang tidak chat 2 hari terakhir
    const { data: users, error: usersErr } = await supabase
      .from('user_career_profiles')
      .select('user_id, nama, gps_steps')
      .not('user_id', 'is', null)
      .limit(100)

    if (usersErr) return res.status(500).json({ error: usersErr.message })
    if (!users?.length) return res.status(200).json({ success: true, sent: 0 })

    const results = []
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    for (const profile of users) {
      try {
        // Cek last chat
        const { data: lastChat } = await supabase
          .from('user_session_notes')
          .select('created_at')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Kalau tidak ada chat atau chat > 2 hari, kirim email + push
        if (!lastChat || new Date(lastChat.created_at) < new Date(twoDaysAgo)) {
          const authUser = authUsers.find(u => u.id === profile.user_id)
          const fcmToken = await getUserFcmToken(profile.user_id)
          // Cari langkah GPS pertama yang belum dicentang — bikin reminder-nya
          // konkret ("langkah X belum selesai") bukan cuma ajakan generik.
          const pendingStep = (profile.gps_steps || []).find(s => !s.done && s.title && s.title !== '—')
          if (authUser?.email || fcmToken) {
            const notifyResult = await notifyChatReminder(authUser?.email, fcmToken, profile.nama || 'User', pendingStep?.title)
            const ok = notifyResult.email?.success || notifyResult.push?.success
            if (ok) {
              results.push({ userId: profile.user_id, status: 'sent', detail: notifyResult })
            } else {
              results.push({ userId: profile.user_id, status: 'failed', detail: notifyResult })
            }
          }
        }
      } catch (e) {
        results.push({ userId: profile.user_id, status: 'failed', error: e.message })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    return res.status(200).json({
      success: true,
      processed: results.length,
      sent,
    })
  }

  // ── ONBOARDING NUDGE (Discovery selesai, belum chat pertama) ─────────────
  if (job === 'onboarding-nudge') {
    const h24 = new Date(Date.now() - 24 * 3600 * 1000)
    const h48 = new Date(Date.now() - 48 * 3600 * 1000)

    // User yang profil-nya (= selesai Discovery) dibuat/diupdate 24-48 jam
    // lalu. Window 24 jam (bukan cutoff sesaat) supaya cron harian ini pasti
    // "menangkap" tiap user tepat sekali, walau jadwal cron sedikit meleset.
    const { data: users, error: usersErr } = await supabase
      .from('user_career_profiles')
      .select('user_id, nama, last_updated')
      .not('career_readiness', 'is', null)
      .gte('last_updated', h48.toISOString())
      .lte('last_updated', h24.toISOString())
      .limit(100)

    if (usersErr) return res.status(500).json({ error: usersErr.message })
    if (!users?.length) return res.status(200).json({ success: true, sent: 0 })

    const results = []
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    for (const profile of users) {
      try {
        // Skip kalau sudah pernah chat coaching sungguhan (>=1 session note)
        const { data: existingNote } = await supabase
          .from('user_session_notes')
          .select('id').eq('user_id', profile.user_id).limit(1).maybeSingle()
        if (existingNote) continue

        const authUser = authUsers.find(u => u.id === profile.user_id)
        const fcmToken = await getUserFcmToken(profile.user_id)
        if (authUser?.email || fcmToken) {
          const notifyResult = await notifyOnboardingNudge(authUser?.email, fcmToken, profile.nama || 'User')
          const ok = notifyResult.email?.success || notifyResult.push?.success
          results.push({ userId: profile.user_id, status: ok ? 'sent' : 'failed', detail: notifyResult })
        }
      } catch (e) {
        results.push({ userId: profile.user_id, status: 'failed', error: e.message })
      }
    }

    return res.status(200).json({
      success: true,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
    })
  }

  return res.status(400).json({ error: `Unknown job: ${job}` })
}

// ── Compress helper ──────────────────────────────────────────────────────────
async function compressTier({ olderThan, from, to, days, words }) {
  const { data: capsules } = await supabase
    .from('memory_capsule_log')
    .select('id, user_id, capsule_date, capsule_text')
    .lt('capsule_date', olderThan).eq('granularity', from)
    .neq('capsule_text', '[no new insight]')
    .order('user_id').order('capsule_date').limit(200)

  if (!capsules?.length) return 0

  const byUser = {}
  for (const c of capsules) {
    if (!byUser[c.user_id]) byUser[c.user_id] = []
    byUser[c.user_id].push(c)
  }

  let compressed = 0
  for (const [, userCapsules] of Object.entries(byUser)) {
    const sorted = [...userCapsules].sort((a,b) => a.capsule_date.localeCompare(b.capsule_date))
    const periods = []; let cur = { startDate: sorted[0].capsule_date, capsules: [] }
    for (const c of sorted) {
      const diff = (new Date(c.capsule_date) - new Date(cur.startDate)) / 86400000
      if (diff < days) cur.capsules.push(c)
      else { periods.push(cur); cur = { startDate: c.capsule_date, capsules: [c] } }
    }
    periods.push(cur)

    for (const period of periods) {
      if (!period.capsules.length) continue
      const combined = period.capsules.map(c => c.capsule_text).join('\n---\n')
      let summary = ''
      try {
        summary = await generateText({
          system: `Buat ringkasan ${words} kata atau kurang. Hanya fakta terpenting. Bahasa Indonesia.`,
          prompt: combined.slice(0, 2000),
          maxTokens: Math.ceil(words * 2), tier: 'fast', plan: 'free',
        })
      } catch { continue }

      const repDate = period.capsules[0].capsule_date
      await supabase.from('memory_capsule_log').upsert({
        user_id: period.capsules[0].user_id, capsule_date: repDate,
        capsule_text: summary.trim(), granularity: to,
      }, { onConflict: 'user_id,capsule_date' })

      const toDelete = period.capsules.filter(c => c.capsule_date !== repDate).map(c => c.id)
      if (toDelete.length > 0) {
        await supabase.from('memory_capsule_log').delete().in('id', toDelete)
      } else {
        await supabase.from('memory_capsule_log')
          .update({ granularity: to, capsule_text: summary.trim() })
          .eq('id', period.capsules[0].id)
      }
      compressed++
    }
  }
  return compressed
}
