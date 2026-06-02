import { generateText, generateChat } from './lib/ai.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const WA_LIMITS = {
  free: 0,
  starter: 10,
  pro: 30,
  platinum: 999,
}

const MAX_MESSAGES_PER_DAY = 20
const COOLDOWN_MINUTES = 60

// Generate pesan situasional (unregistered, free gate, limit, abuse)
async function generateMessage(situation, context) {
  const situations = {
    unregistered_first: `User ini belum terdaftar di LamarCerdas dan ini pertama kali mereka WA. Sapa dengan hangat, perkenalkan dirimu sebagai Diah Anna dari LamarCerdas, dan ajak mereka daftar gratis di lamarcerdas.my.id — dengan cara yang natural, tidak seperti iklan.`,

    unregistered_repeat: `User ini belum terdaftar dan sudah pernah diajak daftar sebelumnya. Ingatkan lagi dengan cara yang berbeda dan lebih personal — tidak copy-paste dari sebelumnya.`,

    free_gate_first: `User ini terdaftar tapi pakai paket Free — tidak bisa WA sama saya. Ini pertama kali mereka coba WA. Beritahu dengan cara yang hangat dan natural bahwa untuk WA sama saya perlu upgrade. Tawarkan Starter (Rp 49rb/bulan) dengan benefit yang relevan. Link: lamarcerdas.my.id/pricing`,

    free_gate_repeat: `User ini pakai Free dan sudah dapat info upgrade sebelumnya tapi masih WA lagi. Ingatkan lagi dengan cara yang berbeda — lebih personal, mungkin tanya apa yang membuat mereka ragu, dan tawarkan solusi.`,

    limit_starter: `User ini pakai Starter dan sesi WA-nya bulan ini sudah habis. Beritahu dengan cara yang empathetic dan tawarkan upgrade ke Pro (Rp 199rb/bulan, 30 sesi) atau Platinum (Rp 399rb/bulan, unlimited). Link: lamarcerdas.my.id/pricing`,

    limit_pro: `User ini pakai Pro dan sesi WA-nya bulan ini sudah habis. Tawarkan upgrade ke Platinum (Rp 399rb/bulan) yang unlimited — tidak perlu khawatir kehabisan lagi. Link: lamarcerdas.my.id/pricing`,

    abuse_warning: `User ini sudah kirim terlalu banyak pesan hari ini dan akan di-block 24 jam. Beritahu dengan cara yang tetap respectful — ini bukan punishment, tapi batas penggunaan. Sarankan untuk serius upgrade kalau mau coaching lebih intens.`,
  }

  return generateText({
    system: `Kamu adalah Diah Anna, AI Career Coach dari LamarCerdas. 
Kepribadian: hangat, genuine, seperti kakak perempuan senior yang peduli.
Adaptasi gaya bicara sesuai pesan user: ${context.lastUserMessage || ''}
PENTING: Plain text saja — tidak pakai *, _, atau markdown apapun. Ini WA.
Nama user: ${context.name || 'Kak'}`,
    prompt: situations[situation],
    maxTokens: 300,
    tier: 'smart',
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sender, message, name } = req.body

    if (!sender || !message) {
      return res.status(200).json({ status: 'ignored' })
    }

    if (req.body.device === sender) {
      return res.status(200).json({ status: 'ignored' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const monthYear = new Date().toISOString().slice(0, 7)
    const context = { name, lastUserMessage: message }

    // Cek blacklist
    const { data: blacklist } = await supabase
      .from('wa_blacklist')
      .select('id')
      .eq('phone_wa', sender)
      .gte('blocked_until', new Date().toISOString())
      .limit(1)

    if (blacklist && blacklist.length > 0) {
      return res.status(200).json({ status: 'blacklisted' })
    }

    // Hitung pesan hari ini
    const { data: todayMessages } = await supabase
      .from('wa_conversations')
      .select('id')
      .eq('phone_wa', sender)
      .eq('role', 'user')
      .gte('created_at', today)

    const todayCount = todayMessages?.length || 0

    // Auto blacklist 20+ pesan/hari
    if (todayCount >= MAX_MESSAGES_PER_DAY) {
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('wa_blacklist').upsert({ phone_wa: sender, blocked_until: blockedUntil })
      const reply = await generateMessage('abuse_warning', context)
      await saveAndSend(sender, message, reply, name)
      return res.status(200).json({ status: 'blocked' })
    }

    // Cek user terdaftar
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, phone_verified')
      .eq('phone_wa', sender)
      .single()

    // User tidak terdaftar
    if (!userProfile) {
      const { data: prevReply } = await supabase
        .from('wa_conversations')
        .select('id')
        .eq('phone_wa', sender)
        .eq('role', 'assistant')
        .limit(1)

      const situation = (!prevReply || prevReply.length === 0) ? 'unregistered_first' : 'unregistered_repeat'
      const reply = await generateMessage(situation, context)
      await saveAndSend(sender, message, reply, name)
      return res.status(200).json({ status: 'unregistered' })
    }

    // Cek subscription
    let userPlan = 'free'
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userProfile.id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .single()
    userPlan = sub?.plan || 'free'

    // Hitung usage WA
    const { data: waUsage } = await supabase
      .from('wa_usage')
      .select('id')
      .eq('phone_wa', sender)
      .eq('month_year', monthYear)

    const usedCount = waUsage?.length || 0
    const limit = WA_LIMITS[userPlan] || 0
    const remaining = Math.max(0, limit - usedCount)

    // Free gate
    if (userPlan === 'free') {
      const { data: prevGate } = await supabase
        .from('wa_conversations')
        .select('id')
        .eq('phone_wa', sender)
        .eq('role', 'assistant')
        .gte('created_at', new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString())
        .limit(1)

      const situation = (!prevGate || prevGate.length === 0) ? 'free_gate_first' : 'free_gate_repeat'
      const reply = await generateMessage(situation, context)
      await saveAndSend(sender, message, reply, name)
      return res.status(200).json({ status: 'free_gate' })
    }

    // Limit habis
    if (remaining === 0) {
      const { data: prevGate } = await supabase
        .from('wa_conversations')
        .select('id')
        .eq('phone_wa', sender)
        .eq('role', 'assistant')
        .gte('created_at', new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString())
        .limit(1)

      if (!prevGate || prevGate.length === 0) {
        const situation = userPlan === 'starter' ? 'limit_starter' : 'limit_pro'
        const reply = await generateMessage(situation, context)
        await saveAndSend(sender, message, reply, name)
      } else {
        const shortReply = await generateMessage(
          userPlan === 'starter' ? 'limit_starter' : 'limit_pro',
          { ...context, lastUserMessage: 'singkat saja' }
        )
        await sendWA(sender, shortReply)
      }
      return res.status(200).json({ status: 'limit_reached' })
    }

    // Normal conversation
    const { data: history } = await supabase
      .from('wa_conversations')
      .select('role, content')
      .eq('phone_wa', sender)
      .order('created_at', { ascending: false })
      .limit(10)

    const conversationHistory = (history || []).reverse()
    const isFirstMessage = conversationHistory.length === 0

    const messages = [
      ...conversationHistory.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]

    const warningNote = remaining <= 3
      ? `\n\nBtw, sesi WA kamu tinggal ${remaining} lagi bulan ini ya.`
      : ''

    const systemPrompt = `Kamu adalah Diah Anna, AI Career Coach dari LamarCerdas — platform AI karir untuk fresh grad Indonesia.

Kepribadian:
- Hangat, genuine, seperti kakak perempuan senior yang peduli
- Cerdas tapi tidak sok tahu
- Jujur dan langsung

ADAPTASI GAYA BICARA — WAJIB:
- Kalau user formal → ikut formal
- Kalau user santai/gaul → ikut santai, boleh pakai lu/gue
- Kalau user singkat → jawab singkat
- Kalau user detail → boleh lebih panjang
- Kalau user pakai emoji → ikut pakai emoji
- Kalau user curhat → dengerin dulu, empathetic
- Kalau user frustrasi → validasi perasaan dulu

FORMAT: Plain text saja, TIDAK pakai *, _, markdown apapun.
${isFirstMessage ? 'Pesan pertama — sapa hangat dan natural.' : 'BUKAN pertama — JANGAN sapa ulang, langsung jawab.'}

Info paket:
- STARTER: 10 sesi WA/bulan — Rp 49rb
- PRO: 30 sesi WA/bulan — Rp 199rb
- PLATINUM: WA unlimited — Rp 399rb
- Upgrade: lamarcerdas.my.id/pricing

User: paket ${userPlan} | sisa sesi WA: ${remaining} | nama: ${name || 'Kak'}`

    const aiReply = await generateChat({
      system: systemPrompt,
      messages,
      maxTokens: 500,
      tier: 'smart',
    })

    const reply = aiReply + warningNote

    await saveAndSend(sender, message, reply, name)

    await supabase.from('wa_usage').insert({
      phone_wa: sender,
      user_id: userProfile.id,
      month_year: monthYear,
    })

    return res.status(200).json({ status: 'ok' })

  } catch (error) {
    console.error('WA Webhook error:', error)
    return res.status(200).json({ status: 'error', message: error.message })
  }
}

async function saveAndSend(sender, userMessage, reply, name) {
  await supabase.from('wa_conversations').insert([
    { phone_wa: sender, role: 'user', content: userMessage, name: name || null },
    { phone_wa: sender, role: 'assistant', content: reply }
  ])
  await sendWA(sender, reply)
}

async function sendWA(target, message) {
  await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': process.env.FONNTE_TOKEN },
    body: new URLSearchParams({ target, message, typing: 'true', delay: '1' }),
  })
}
