# 🧠 RSI (Recursive Self-Improvement) - Diah Anna

## Overview

RSI adalah sistem yang memungkinkan Diah Anna untuk **belajar dan meningkatkan kemampuan coaching-nya secara mandiri** dari setiap interaksi dengan user. Sistem ini menciptakan "memori pembelajaran" yang membuat AI semakin mengenal pola perilaku, preferensi komunikasi, dan kebutuhan spesifik setiap user.

## 🎯 Apa yang Dipelajari?

Diah Anna sekarang bisa mengidentifikasi dan menyimpan:

1. **Communication Style** - Cara user berkomunikasi (langsung, detail, emosional, analitis)
2. **Emotional Triggers** - Apa yang memotivasi atau menghambat user
3. **Work Habits** - Pola kerja dan produktivitas user
4. **Decision Patterns** - Bagaimana user mengambil keputusan karir
5. **Motivation Drivers** - Sumber motivasi intrinsik user
6. **Blockers** - Hambatan mental atau praktis yang berulang

## 🔄 Cara Kerja

### 1. Setiap Sesi Chat
```
User Chat → Diah Anna Response → [Background: RSI Analysis]
                                        ↓
                            Analisis pola percakapan
                                        ↓
                            Identifikasi pola baru/update existing
                                        ↓
                            Simpan ke database + update confidence
                                        ↓
                            Increment RSI Version
```

### 2. Penggunaan di Sesi Berikutnya
Saat user chat lagi, Diah Anna akan:
- Mengambil semua pola yang sudah dipelajari (`ai_learned_patterns`)
- Menyesuaikan gaya coaching berdasarkan pola tersebut
- Menyebutkan versi model mentalnya (misal: "RSI v3")

## 📊 Struktur Database

### Tabel Baru

#### `ai_learned_patterns`
Menyimpan pola-pola yang sudah dipelajari tentang user.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | ID user |
| `pattern_type` | TEXT | Tipe pola (communication_style, emotional_trigger, dll) |
| `pattern_description` | TEXT | Deskripsi pola |
| `confidence_score` | INT | Tingkat keyakinan 0-100% |
| `examples` | JSON[] | Contoh dari percakapan |
| `discovered_at` | TIMESTAMP | Kapan ditemukan |
| `updated_at` | TIMESTAMP | Kapan terakhir diupdate |

#### `ai_self_improvement_log`
Mencatat setiap proses pembelajaran AI.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | ID user |
| `session_id` | TEXT | ID sesi chat |
| `improvement_type` | TEXT | Jenis peningkatan |
| `before_state` | JSON | State sebelum |
| `after_state` | JSON | State sesudah |
| `confidence_delta` | FLOAT | Perubahan confidence |
| `notes` | TEXT | Catatan strategi |
| `created_at` | TIMESTAMP | Waktu |

### Kolom Baru di `user_career_profiles`

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `rsi_version` | INT | Versi model mental AI tentang user ini |

## 🛠️ Implementasi

### File yang Dimodifikasi

1. **`/api/career-coach.js`**
   - Fungsi `analyzeAndLearnPatterns()` - Engine analisis RSI
   - Integrasi di handler chat utama
   - Pengambilan pola dari database
   - Injection konteks RSI ke system prompt

### Flow Analisis

```javascript
// 1. Ambil pesan user
const userMessages = messages.filter(m => m.role === 'user')

// 2. Minta AI analisis pola
const patternAnalysis = await generateText({
  system: "Kamu adalah sistem analisis pola...",
  prompt: "Profil User: ...\nRiwayat: ...\nAnalisis pola..."
})

// 3. Parse & simpan pola
for (const pattern of analysis.new_patterns) {
  // Update atau insert ke ai_learned_patterns
}

// 4. Log improvement
await supabase.from('ai_self_improvement_log').insert({...})

// 5. Increment RSI version
await supabase.from('user_career_profiles')
  .update({ rsi_version: rsiVersion + 1 })
```

## 📈 Contoh Output

### Pola yang Disimpan
```json
{
  "pattern_type": "communication_style",
  "pattern_description": "User prefers direct, action-oriented advice without lengthy explanations",
  "confidence_score": 85,
  "examples": [
    "User said: 'Langsung aja, apa yang harus aku lakukan besok?'",
    "User responded positively to concise 2-sentence advice"
  ]
}
```

### Konteks di System Prompt
```
# POLA YANG SUDAH AKU PELAJARI TENTANG KAMU (RSI v3)
1. communication_style: User prefers direct, action-oriented advice (Keyakinan: 85%). 
   Contoh: Langsung aja, apa yang harus aku lakukan besok?
2. emotional_trigger: User gets demotivated when facing ambiguity (Keyakinan: 70%). 
   Contoh: Ekspresi frustrasi saat dibahas roadmap yang tidak jelas

[RSI ACTIVE] Kamu sudah belajar dari 2 pola perilaku user ini. 
Gunakan wawasan ini untuk menyesuaikan gaya komunikasimu. 
Versi model mentalmu tentang user ini adalah v3.
```

## 🔒 Keamanan & Privasi

- **Row Level Security (RLS)**: Hanya user pemilik data yang bisa akses pola mereka
- **Service Role Only**: Hanya backend yang bisa write ke tabel RSI
- **No Client Exposure**: Pola tidak dikirim ke frontend kecuali untuk debugging
- **Opt-out Ready**: Mudah ditambahkan flag untuk disable RSI per user

## 🚀 Manfaat

### Untuk User
- Coaching yang semakin personal seiring waktu
- Diah Anna "mengenal" mereka lebih baik
- Tidak perlu mengulang preferensi komunikasi
- Merasa didengarkan dan dipahami

### Untuk Produk
- Retention meningkat (user merasa punya hubungan personal)
- Differentiasi dari AI career coach lain
- Data insights tentang pola user behavior
- Foundation untuk advanced features (predictive coaching, dll)

## 📝 Monitoring

### Logs yang Bisa Dicek
```bash
# Di terminal serverless function
[RSI] Learned 2 new patterns for user abc123. New version: v3
[RSI] Background analysis error: ...
```

### Query untuk Debug
```sql
-- Cek berapa banyak pola yang sudah dipelajari per user
SELECT user_id, COUNT(*) as pattern_count, AVG(confidence_score) as avg_confidence
FROM ai_learned_patterns
GROUP BY user_id
ORDER BY pattern_count DESC;

-- Lihat history self-improvement
SELECT user_id, improvement_type, before_state, after_state, created_at
FROM ai_self_improvement_log
WHERE user_id = 'xxx'
ORDER BY created_at DESC;
```

## 🔮 Roadmap

### Phase 1 (✅ Sekarang)
- Pattern recognition dasar
- Confidence scoring
- RSI versioning

### Phase 2 (Next)
- Strategy refinement otomatis (AI menyesuaikan tone, panjang respons, jenis pertanyaan)
- Cross-session learning transfer
- Pattern clustering untuk user segmentation

### Phase 3 (Future)
- Predictive coaching (AI anticipate kebutuhan user sebelum mereka minta)
- Adaptive persona (Diah Anna punya beberapa "mode" coaching yang dipilih otomatis)
- Multi-user pattern learning (belajar dari pola user lain yang similar)

## ⚠️ Catatan Penting

1. **Non-blocking**: Analisis RSI berjalan di background, tidak memperlambat respons chat
2. **Token Efficiency**: Hanya ambil top 10 patterns dengan confidence tertinggi
3. **Graceful Degradation**: Jika analisis gagal, chat tetap berfungsi normal
4. **Privacy First**: User bisa request delete semua data RSI mereka kapan saja

---

**Status**: ✅ Implemented & Deployed  
**Version**: RSI v1.0  
**Last Updated**: 2024
