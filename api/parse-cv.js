import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const rawBody = await getRawBody(req)
    const { base64, fileName } = JSON.parse(rawBody)

    if (!base64 || !fileName) {
      return res.status(400).json({ error: 'File tidak ditemukan.' })
    }

    const ext = fileName.split('.').pop().toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      return res.status(400).json({ error: 'Format tidak didukung. Gunakan PDF atau Word (.docx).' })
    }

    const buffer = Buffer.from(base64, 'base64')
    let text = ''

    if (ext === 'pdf') {
      const data = await pdfParse(buffer)
      text = data.text
    } else {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }

    text = text.replace(/\n{3,}/g, '\n\n').trim()

    if (text.length < 50) {
      return res.status(400).json({ error: 'Teks CV tidak bisa dibaca dari file ini. Coba paste manual ya.' })
    }

    return res.status(200).json({ text })
  } catch (e) {
    console.error('parse-cv error:', e.message)
    return res.status(500).json({ error: 'Gagal membaca file: ' + e.message })
  }
}
