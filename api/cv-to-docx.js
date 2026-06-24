import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx'

// Konversi markdown sederhana (## heading, **bold**, - bullet) jadi paragraf docx.
// CV hasil AI selalu pakai format ini — tidak perlu parser markdown lengkap.
function markdownToParagraphs(markdown) {
  const lines = markdown.split('\n')
  const paragraphs = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      paragraphs.push(new Paragraph({ text: '' }))
      continue
    }

    // Heading level 1-3 (#, ##, ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].replace(/\*\*/g, '')
      paragraphs.push(new Paragraph({
        text,
        heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }))
      continue
    }

    // Bullet list (- atau •)
    const bulletMatch = line.match(/^[-•]\s+(.*)/)
    if (bulletMatch) {
      paragraphs.push(new Paragraph({
        text: bulletMatch[1].replace(/\*\*/g, ''),
        bullet: { level: 0 },
      }))
      continue
    }

    // Paragraf biasa — parse **bold** jadi run terpisah
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    const runs = parts.map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true })
      }
      return new TextRun({ text: part })
    })
    paragraphs.push(new Paragraph({ children: runs, spacing: { after: 100 } }))
  }

  return paragraphs
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { markdown, filename = 'CV-Verneks' } = req.body
  if (!markdown || markdown.trim().length < 20) {
    return res.status(400).json({ error: 'Konten CV kosong atau terlalu pendek.' })
  }

  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: markdownToParagraphs(markdown),
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`)
    return res.status(200).send(buffer)
  } catch (error) {
    console.error('[cv-to-docx] error:', error)
    return res.status(500).json({ error: 'Gagal membuat file Word.' })
  }
}
