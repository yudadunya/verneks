import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, HeadingLevel, LevelFormat,
  BorderStyle, UnderlineType
} from 'docx'

// Parse markdown CV jadi struktur dokumen
function parseMarkdownToDocx(markdown) {
  const lines = markdown.split('\n')
  const children = []

  const numbering = {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } }
      }]
    }]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      children.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 60 } }))
      continue
    }

    // H1 — nama / judul utama
    if (trimmed.startsWith('# ')) {
      const text = trimmed.slice(2)
      children.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: 36, font: 'Calibri', color: '1F4E79' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F4E79', space: 1 } }
      }))
      continue
    }

    // H2 — section headers (PENGALAMAN KERJA, PENDIDIKAN, dll)
    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3)
      children.push(new Paragraph({
        children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, font: 'Calibri', color: '1F4E79' })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E75B6', space: 1 } }
      }))
      continue
    }

    // H3 — jabatan / posisi
    if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4)
      children.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22, font: 'Calibri' })],
        spacing: { before: 120, after: 40 }
      }))
      continue
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2)
      const runs = parseBoldItalic(text)
      children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: runs,
        spacing: { after: 40 }
      }))
      continue
    }

    // Bold line (misal: **Nama Perusahaan** | Jabatan)
    // Parse inline bold/italic
    const runs = parseBoldItalic(trimmed)
    const isBoldOnly = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.split('**').length === 3
    children.push(new Paragraph({
      children: runs,
      spacing: { after: 60 },
      ...(isBoldOnly ? { bold: true } : {})
    }))
  }

  return { children, numbering }
}

// Parse inline **bold** dan *italic*
function parseBoldItalic(text) {
  const runs = []
  // Regex: **bold**, *italic*, normal
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, font: 'Calibri', size: 22 }))
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true, font: 'Calibri', size: 22 }))
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: 'Calibri', size: 22 }))
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text, font: 'Calibri', size: 22 })]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { markdown, filename = 'CV-LamarCerdas' } = req.body
  if (!markdown || markdown.trim().length < 50) {
    return res.status(400).json({ error: 'Konten CV kosong.' })
  }

  try {
    const { children, numbering } = parseMarkdownToDocx(markdown)

    const doc = new Document({
      numbering,
      styles: {
        default: {
          document: { run: { font: 'Calibri', size: 22, color: '2F2F2F' } }
        }
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 2cm
          }
        },
        children
      }]
    })

    const buffer = await Packer.toBuffer(doc)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)

  } catch (error) {
    console.error('cv-to-docx error:', error)
    res.status(500).json({ error: 'Gagal generate file Word.' })
  }
}
