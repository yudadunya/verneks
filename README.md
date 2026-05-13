# LamarCerdas 🚀

**AI Career Platform Indonesia** — CV Review, ATS Checker, Mock Interview, dan Career Coach berbasis AI.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Vercel Serverless Functions
- **AI**: Claude Sonnet 4.6 (Anthropic)
- **Auth & DB**: Supabase
- **Hosting**: Vercel

## Fitur

| Fitur | Paket |
|---|---|
| CV Review AI | Free (1x/bulan) |
| ATS Score Checker | Starter+ |
| JD Matcher | Starter+ |
| Mock Interview AI | Pro+ |
| AI Career Coach | Pro+ |
| Salary Negotiation | Premium |
| LinkedIn Optimizer | Premium |

## Setup Development

### 1. Clone repo
```bash
git clone https://github.com/yudadunya/lamarcerdas.git
cd lamarcerdas
npm install
```

### 2. Setup environment variables
```bash
cp .env.example .env
```

Isi `.env` dengan:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxx
```

### 3. Setup Supabase
Buat project baru di [supabase.com](https://supabase.com), aktifkan Auth (Email).

### 4. Jalankan dev server
```bash
npm run dev
```

### 5. Deploy ke Vercel
Connect repo ini ke Vercel, tambahkan environment variables di Vercel dashboard.

## Struktur Folder

```
lamarcerdas/
├── api/                  ← Vercel Serverless Functions
│   └── cv-review.js      ← CV Review endpoint
├── src/
│   ├── components/
│   │   └── Navbar.jsx
│   ├── lib/
│   │   └── supabase.js   ← Supabase client
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── CVReview.jsx
│   │   ├── ATSChecker.jsx
│   │   ├── MockInterview.jsx
│   │   ├── CareerCoach.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

## Roadmap

- [x] Landing page
- [x] Auth (login/register)
- [x] CV Review AI
- [ ] ATS Score Checker
- [ ] JD Matcher
- [ ] Mock Interview AI
- [ ] AI Career Coach
- [ ] Payment (Midtrans)
- [ ] LinkedIn Optimizer
- [ ] Cover Letter Generator

## Lisensi

MIT
