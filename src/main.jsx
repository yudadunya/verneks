import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// FIX: SW unregister DIHAPUS dari sini.
// Sebelumnya ada 3 tempat yang unregister SW (index.html + main.jsx + App.jsx),
// menyebabkan race condition: SW ter-unregister saat JS chunk sedang didownload
// → chunk fetch dibatalkan → React gagal mount → blank putih.
// Satu-satunya unregister yang tersisa ada di index.html (sebelum JS load),
// yang aman karena blocking dan tidak berlomba dengan chunk download.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
