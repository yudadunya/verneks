# Verneks

> **Karier Jangan Asal.**
>
> Kenali Dirimu. Tentukan Arahmu. Bangun Masa Depanmu.

---

# Apa itu Verneks?

**Verneks** adalah Human Career Companion berbasis AI yang membantu seseorang mengenal dirinya, menentukan arah karier, dan membangun masa depannya dengan lebih sadar.

Kami percaya bahwa sebagian besar penyesalan karier bukan terjadi karena seseorang kurang pintar atau kurang mampu.

Tetapi karena keputusan besar dibuat sebelum benar-benar mengenal dirinya.

Karena itu Verneks tidak hanya membantu membuat CV yang lebih baik atau mempersiapkan interview.

Verneks membangun fondasi yang lebih dalam:

- mengenal diri
- memahami potensi
- menentukan arah
- mengambil keputusan
- berkembang secara berkelanjutan

Semua fitur Verneks hanyalah alat untuk mencapai tujuan tersebut.

---

# Filosofi

Teknologi akan terus berubah.

Model AI akan terus berganti.

Tetapi manusia akan selalu membutuhkan kemampuan untuk mengenal dirinya dan mengambil keputusan yang lebih baik.

Kami percaya:

> AI terbaik bukan AI yang membuat manusia bergantung.

Tetapi AI yang membuat manusia semakin mampu mengambil keputusan sendiri.

Jika suatu hari pengguna tidak lagi membutuhkan Diah Anna untuk mengambil keputusan karier yang baik, maka kami percaya Diah Anna telah berhasil menjalankan tugasnya.

---

# Human Core

Di pusat Verneks terdapat **Diah Anna**.

Diah Anna bukan chatbot.

Diah Anna bukan career coach tradisional.

Diah Anna adalah Human Career Companion.

Ia tidak mengambil keputusan untuk pengguna.

Ia membantu pengguna memahami dirinya sendiri sehingga mampu mengambil keputusan yang lebih sadar.

---

# Product Vision

Hari ini Verneks membantu perjalanan karier.

Besok Verneks membantu perjalanan hidup.

Karier hanyalah awal.

---

# Product Architecture

Verneks dibangun dengan pendekatan modular.

```
Human Core
        │
        ▼
Diah Anna
        │
 ┌──────┼───────────────┐
 │      │               │
 ▼      ▼               ▼
Career GPS      Career Genome      Decision Engine
 │
 ├──────────────┬──────────────┬──────────────┐
 ▼              ▼              ▼
CV Review   ATS Checker   Interview Coach
 │
 ▼
Career Growth
```

Seluruh fitur berasal dari Human Core.

Bukan sebaliknya.

---

# Tech Stack

## Frontend

- React 19
- Vite
- React Router
- Tailwind CSS

## Backend

- Vercel Serverless Functions

## AI

- Claude Sonnet (Anthropic)

## Database & Authentication

- Supabase

## Deployment

- Vercel

---

# Current Features

## Human Career Companion

Pendamping karier berbasis AI yang membantu pengguna:

- mengenal diri
- menemukan arah
- membangun roadmap
- melakukan refleksi
- mengambil keputusan karier

---

## Career Tools

- CV Review AI
- ATS Checker
- JD Matcher
- Mock Interview
- Salary Negotiation
- LinkedIn Optimizer
- Cover Letter Generator

---

# Repository Structure

```
verneks/

├── api/
│   ├── career-coach.js
│   ├── cv-review.js
│   ├── ats-checker.js
│   └── interview.js
│
├── docs/
│   ├── MANIFESTO.md
│   ├── HUMAN_CORE_OS.md
│   ├── PRODUCT_PRINCIPLES.md
│   ├── ENGINEERING_GUIDE.md
│   ├── GTM_BIBLE.md
│   └── ROADMAP.md
│
├── prompts/
│
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── lib/
│   └── assets/
│
├── public/
│
├── package.json
│
└── README.md
```

---

# Local Development

## Clone Repository

```bash
git clone https://github.com/<username>/verneks.git

cd verneks
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment

```bash
cp .env.example .env
```

Isi environment variable:

```
ANTHROPIC_API_KEY=

VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=
```

---

## Run Development

```bash
npm run dev
```

---

## Build

```bash
npm run build
```

---

## Preview

```bash
npm run preview
```

---

# Deployment

Deploy menggunakan Vercel.

Hubungkan repository ke Vercel.

Tambahkan seluruh Environment Variables.

Deploy.

---

# Engineering Principles

Seluruh engineer wajib memahami prinsip berikut.

## Human First

Bangun manusia terlebih dahulu.

Baru bangun fitur.

---

## Simplicity

Jika ada dua solusi,

pilih yang lebih sederhana.

---

## Trust

Jangan membuat fitur yang mengurangi kepercayaan pengguna.

---

## Privacy

Seluruh percakapan pengguna dianggap sangat pribadi.

---

## AI Ethics

AI tidak mengambil keputusan hidup pengguna.

AI membantu pengguna berpikir lebih jernih.

---

## Long-Term Thinking

Jangan membuat fitur demi retention jika bertentangan dengan Human Core.

Seluruh keputusan engineering harus selaras dengan filosofi Verneks.

---

# Roadmap

## Phase 1

- Landing Page
- Authentication
- Human Career Companion
- CV Review

---

## Phase 2

- ATS Checker
- JD Matcher
- Mock Interview
- Career GPS

---

## Phase 3

- Career Genome
- Salary Negotiation
- LinkedIn Optimizer
- Cover Letter

---

## Phase 4

- Decision Intelligence
- Long-Term Career Memory
- Career Reflection
- Personal Growth Engine

---

# Documentation

Seluruh dokumentasi proyek berada pada folder:

```
docs/
```

Dokumen utama:

- MANIFESTO.md
- HUMAN_CORE_OS.md
- PRODUCT_PRINCIPLES.md
- ENGINEERING_GUIDE.md
- GTM_BIBLE.md
- ROADMAP.md

README hanya berfungsi sebagai pintu masuk.

---

# Contributing

Sebelum membuat Pull Request:

1. Baca MANIFESTO.md
2. Baca HUMAN_CORE_OS.md
3. Pastikan perubahan tidak bertentangan dengan Product Principles.
4. Pastikan pengalaman pengguna tetap Human First.

---

# License

MIT License

---

# Closing

Verneks bukan sekadar aplikasi karier.

Kami sedang membangun generasi yang mampu mengenal dirinya, menentukan arahnya, dan membangun masa depannya dengan lebih sadar.

---

**Karier Jangan Asal.**

**Kenali Dirimu. Tentukan Arahmu. Bangun Masa Depanmu.**
