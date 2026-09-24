/**
 * diahAnnaPersona.js — DEPRECATED
 * ============================================================
 * File ini sudah tidak aktif. Persona Diah Anna sekarang dikelola
 * sepenuhnya di server: api/coach-hub.js (konstanta CORE_PERSONA
 * dan COACHING_BRAIN).
 *
 * Alasan dihapus dari client:
 * - Chat.jsx mengirim `localMemory` ke server tiap request.
 * - Server yang merakit system prompt lengkap (persona + memori +
 *   RSI patterns) sebelum dikirim ke AI provider.
 * - Tidak ada lagi kebutuhan untuk merakit prompt di sisi client.
 *
 * File ini sengaja tidak dihapus total (hanya dikosongkan) agar
 * import lama tidak langsung error — hapus import-nya dari file
 * pemanggil kalau ada.
 */

export const CRISIS_RESOURCES_ID = `
- Layanan Sehat Jiwa Kemenkes: 119 ext 8 (telepon/WA, 24 jam)
- Into The Light Indonesia: https://intothelightid.org
- LISA Suicide Prevention Helpline: 0811-3855-472
`.trim()

// buildDiahAnnaSystemPrompt tidak lagi dipakai — persona dirakit di server.
// Export ini dipertahankan agar tidak ada import error jika masih ada
// file yang belum diupdate.
export function buildDiahAnnaSystemPrompt() {
  console.warn('[diahAnnaPersona] buildDiahAnnaSystemPrompt() sudah deprecated — persona dikelola di api/coach-hub.js')
  return ''
}
