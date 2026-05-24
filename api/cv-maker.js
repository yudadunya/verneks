import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const FORMAT_PROMPTS = {
  ats: {
    label: 'ATS Friendly',
    system: `Kamu adalah CV writer spesialis ATS (Applicant Tracking System) untuk perusahaan Indonesia & multinasional.

TUGAS: Tulis CV yang dirancang khusus agar lolos parsing software ATS seperti Workday, Taleo, Greenhouse, dan SAP SuccessFactors.

ATURAN KETAT ATS:
- WAJIB gunakan heading persis ini (huruf besar): PROFIL PROFESIONAL, PENGALAMAN KERJA, PENDIDIKAN, KEAHLIAN TEKNIS, SERTIFIKASI & PELATIHAN
- DILARANG: tabel, kolom ganda, text box, grafis, ikon, garis horizontal dekoratif
- Setiap bullet WAJIB mulai dengan action verb kuat (Memimpin, Mengembangkan, Meningkatkan, Mengoptimalkan, dll)
- Setiap pencapaian WAJIB ada angka/persentase/nilai rupiah (contoh: "Meningkatkan konversi leads sebesar 34% dalam Q3 2023")
- Masukkan keyword industri secara natural minimal 8-10 kali
- Format tanggal konsisten: Bulan YYYY – Bulan YYYY
- Nama section harus EXACT MATCH dengan yang dicari ATS
- Font instructions: gunakan teks biasa, jangan markdown bold/italic berlebihan di dalam konten CV
- Panjang ideal: 1-2 halaman A4

Output harus berupa CV lengkap siap pakai dalam Markdown. Langsung tulis CV-nya tanpa intro.`,
  },

  jobstreet: {
    label: 'JobStreet Friendly',
    system: `Kamu adalah CV writer spesialis platform JobStreet Indonesia & Malaysia.

TUGAS: Tulis CV yang dioptimalkan untuk tampil di pencarian recruiter JobStreet dan meningkatkan click-through rate profil.

STRUKTUR KHUSUS JOBSTREET:
1. **DATA DIRI** — Nama, kota domisili, no HP, email, status (aktif mencari kerja)
2. **RINGKASAN KARIR** — 3-4 kalimat personal yang "menjual diri", sebutkan tahun pengalaman + industri + value utama. Tulis seperti elevator pitch yang hangat dan percaya diri
3. **PENGALAMAN KERJA** — Format: Nama Perusahaan | Industri | Kota (Bulan YYYY – Bulan YYYY). Deskripsikan tanggung jawab + 2-3 pencapaian terukur per role
4. **PENDIDIKAN** — Nama institusi, jurusan, tahun lulus, IPK (jika ≥ 3.0)
5. **KEAHLIAN** — Dibagi: Hard Skills | Soft Skills | Tools & Software
6. **INFORMASI TAMBAHAN** — Ekspektasi gaji: [angka atau "Negotiable"] | Ketersediaan: [tanggal] | Domisili: [kota] | Mobilitas: [bersedia/tidak relokasi]

GAYA PENULISAN JOBSTREET:
- Bahasa Indonesia yang profesional tapi hangat, tidak kaku
- Recruiter lokal lebih suka CV yang "manusiawi" bukan robot
- Sertakan konteks industri Indonesia (nama perusahaan lokal dikenal, referensi pasar lokal)
- Panjang ideal: 1.5-2 halaman

Output harus berupa CV lengkap siap pakai dalam Markdown. Langsung tulis CV-nya tanpa intro.`,
  },

  linkedin: {
    label: 'LinkedIn Profile',
    system: `Kamu adalah LinkedIn profile writer spesialis personal branding untuk profesional Indonesia.

TUGAS: Tulis konten profil LinkedIn yang menarik perhatian recruiter global & lokal, meningkatkan SSI score, dan mendatangkan peluang karir.

KOMPONEN WAJIB LINKEDIN:

**HEADLINE** (maks 220 karakter):
- Formula: [Jabatan Saat Ini] @ [Perusahaan] | [Spesialisasi Unik] | [Value Proposition]
- Contoh: "Product Manager @ Gojek | Scaling B2B SaaS from 0→1M users | ex-McKinsey"
- HINDARI: "Looking for opportunities" atau jabatan generik saja

**ABOUT/SUMMARY** (1.300-2.000 karakter):
- Paragraf 1: Hook — mulai dengan kalimat yang langsung menarik (bukan "Saya adalah...")
- Paragraf 2: Perjalanan & keahlian inti — ceritakan dengan storytelling
- Paragraf 3: Pencapaian terbesar — 2-3 highlight dengan angka nyata
- Paragraf 4: Passion & value — apa yang membuatmu berbeda
- Penutup + CTA: "Feel free to connect" atau "Open for [peluang spesifik]"
- Tulis dalam bahasa INGGRIS (standar LinkedIn profesional global)
- Tone: percaya diri, autentik, tidak arogan

**EXPERIENCE** (per role):
- Judul: [Job Title] · [Employment Type]
- Deskripsi 2-3 kalimat konteks peran
- 3-4 bullet pencapaian dengan format: [Action] → [Result] ([angka/persentase])

**SKILLS SECTION**:
- List 15 skills paling relevan, urutkan dari yang paling kuat
- Prioritaskan skills yang sering dicari recruiter di industri tersebut

**FEATURED/SUMMARY TAGLINE**:
- 1 kalimat powerful untuk bagian featured

Output dalam Markdown dengan label jelas tiap section. Langsung tulis tanpa intro.`,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { mode, format, cvText, formData, jobTarget } = req.body

  if (!format || !FORMAT_PROMPTS[format]) {
    return res.status(400).json({ error: 'Format tidak valid.' })
  }

  if (mode === 'optimize' && (!cvText || cvText.trim().length < 50)) {
    return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })
  }

  if (mode === 'scratch' && !formData?.name) {
    return res.status(400).json({ error: 'Data diri tidak lengkap.' })
  }

  try {
    const fmt = FORMAT_PROMPTS[format]

    let userPrompt = ''

    if (mode === 'optimize') {
      userPrompt = `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Optimasi dan tulis ulang CV berikut menjadi format ${fmt.label}. Pertahankan semua fakta dan pengalaman yang ada, tapi tulis ulang sepenuhnya sesuai standar ${fmt.label}:\n\n${cvText}`
    } else {
      const fd = formData
      userPrompt = `Buat CV format ${fmt.label} berdasarkan data berikut:

Nama: ${fd.name}
${fd.email ? `Email: ${fd.email}` : ''}
${fd.phone ? `Telepon: ${fd.phone}` : ''}
${fd.location ? `Lokasi: ${fd.location}` : ''}
${jobTarget ? `Target posisi: ${jobTarget}` : ''}

Pengalaman Kerja:
${fd.experience || '(fresh graduate / belum ada pengalaman kerja)'}

Pendidikan:
${fd.education || ''}

Keahlian:
${fd.skills || ''}

${fd.extra ? `Info tambahan (sertifikasi, organisasi, proyek, dll):\n${fd.extra}` : ''}

Jika ada informasi yang kurang, buat yang masuk akal dan realistis, tandai dengan [sesuaikan].`
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: fmt.system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const result = message.content[0].text
    return res.status(200).json({ result })

  } catch (error) {
    console.error('CV Maker error:', error)
    return res.status(500).json({ error: 'AI lagi sibuk, coba lagi dalam beberapa detik.' })
  }
}
