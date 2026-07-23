import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// FIX: baris lama di sini ("PWA/Service Worker sudah dihapus — unregister
// sisa SW lama") sudah TIDAK BENAR — komentar itu sisa dari fase lama
// sebelum push notification (Firebase) dipasang, dan tidak pernah dihapus.
// Kodenya unregister SEMUA service worker di SETIAP app load/reload tanpa
// syarat apapun — termasuk /firebase-messaging-sw.js yang aktif dipakai
// untuk push. registerServiceWorker() di src/App.jsx hanya jalan lagi saat
// event 'SIGNED_IN' (login baru), BUKAN saat reload biasa dengan sesi yang
// sudah ada ('INITIAL_SESSION'/'TOKEN_REFRESHED') — jadi efeknya: begitu
// user reload app sekali saja setelah login, SW push-nya kehapus dan TIDAK
// pernah ke-register ulang sampai user logout+login lagi. Ini juga bikin
// Chrome tidak menganggap app installable secara konsisten (butuh active SW
// dengan fetch handler). Dihapus total — lihat App.jsx untuk registrasi SW
// yang sekarang jalan di setiap sesi (bukan cuma SIGNED_IN).

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
