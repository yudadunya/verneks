import { generateText } from './lib/ai.js'
import { ensureFeatureAccess, recordFeatureUsage } from './lib/access.js'

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
- Panjang ideal: 1-2 halaman A4

Output harus berupa CV lengkap siap pakai dalam Markdown. Langsung tulis CV-nya tanpa intro.`,
  },
  jobstreet: {
    label: 'JobStreet Friendly',
    system: `Kamu adalah CV writer spesialis platform JobStreet Indonesia & Malaysia.

TUGAS: Tulis CV yang dioptimalkan untuk tampil di pencarian recruiter JobStreet dan meningkatkan click-through rate profil.

STRUKTUR KHUSUS JOBSTREET:
1. **DATA DIRI** — Nama, kota domisili, no HP, email, status (aktif mencari kerja)
2. **RINGKASAN KARIR** — 3-4 kalimat personal yang "menjual diri", sebutkan tahun pengalaman + industri + value utama
3. **PENGALAMAN KERJA** — Format: Nama Perusahaan | Industri | Kota (Bulan YYYY – Bulan YYYY). Deskripsikan tanggung jawab + 2-3 pencapaian terukur per role
4. **PENDIDIKAN** — Nama institusi, jurusan, tahun lulus, IPK (jika ≥ 3.0)
5. **KEAHLIAN** — Dibagi: Hard Skills | Soft Skills | Tools & Software
6. **INFORMASI TAMBAHAN** — Ekspektasi gaji | Ketersediaan | Domisili | Mobilitas

GAYA PENULISAN: Bahasa Indonesia yang profesional tapi hangat, tidak kaku. Panjang ideal: 1.5-2 halaman.

Output harus berupa CV lengkap siap pakai dalam Markdown. Langsung tulis CV-nya tanpa intro.`,
  },
  linkedin: {
    label: 'LinkedIn Profile',
    system: `Kamu adalah LinkedIn profile writer spesialis personal branding untuk profesional Indonesia.

TUGAS: Tulis konten profil LinkedIn yang menarik perhatian recruiter global & lokal.

KOMPONEN WAJIB LINKEDIN:

**HEADLINE** (maks 220 karakter):
Formula: [Jabatan Saat Ini] @ [Perusahaan] | [Spesialisasi Unik] | [Value Proposition]

**ABOUT/SUMMARY** (1.300-2.000 karakter):
- Paragraf 1: Hook — mulai dengan kalimat yang langsung menarik (bukan "Saya adalah...")
- Paragraf 2: Perjalanan & keahlian inti
- Paragraf 3: Pencapaian terbesar dengan angka nyata
- Paragraf 4: Passion & value
- Penutup + CTA
- Tulis dalam bahasa INGGRIS

**EXPERIENCE** (per role):
- 2-3 kalimat konteks peran
- 3-4 bullet pencapaian: [Action] → [Result] ([angka/persentase])

**SKILLS SECTION**: List 15 skills paling relevan

Output dalam Markdown dengan label jelas tiap section. Langsung tulis tanpa intro.`,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const access = await ensureFeatureAccess(req, 'cv-maker')
  if (access.error) return res.status(access.status || 500).json({ error: access.error })

  const { mode, format, cvText, formData, jobTarget } = req.body

  if (!format || !FORMAT_PROMPTS[format]) return res.status(400).json({ error: 'Format tidak valid.' })
  if (mode === 'optimize' && (!cvText || cvText.trim().length < 50)) return res.status(400).json({ error: 'CV terlalu pendek atau kosong.' })
  if (mode === 'scratch' && !formData?.name) return res.status(400).json({ error: 'Data diri tidak lengkap.' })

  try {
    const fmt = FORMAT_PROMPTS[format]
    let prompt = ''

    if (mode === 'optimize') {
      prompt = `${jobTarget ? `Target posisi: ${jobTarget}\n\n` : ''}Optimasi dan tulis ulang CV berikut menjadi format ${fmt.label}. Pertahankan semua fakta dan pengalaman yang ada, tapi tulis ulang sepenuhnya sesuai standar ${fmt.label}:\n\n${cvText.slice(0, 4000)}`
    } else {
      const fd = formData
      prompt = `Buat CV format ${fmt.label} berdasarkan data berikut:

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

${fd.extra ? `Info tambahan:\n${fd.extra}` : ''}

Jika ada informasi yang kurang, buat yang masuk akal dan realistis, tandai dengan [sesuaikan].`
    }

    const result = await generateText({
      system: fmt.system,
      prompt,
      maxTokens: 1500,
      tier: 'smart',
      plan: access.plan,
    })
    await recordFeatureUsage(access.userId, 'cv-maker')
    return res.status(200).json({ result })
  } catch (error) {
    console.error('CV Maker error:', error)
    return res.status(500).json({ error: 'AI lagi sibuk, coba lagi dalam beberapa detik.' })
  }
}
