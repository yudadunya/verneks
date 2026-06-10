import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // API calls jangan di-cache
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],

        // Navigasi SPA selalu fallback ke index.html
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /\/sitemap\.xml$/, /\/robots\.txt$/],
      },

      manifest: {
        name: 'LamarCerdas',
        short_name: 'LamarCerdas',
        description: 'AI Career Coach — Review CV, ATS Checker, Mock Interview, dan Career Coach',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#075E54',
        theme_color: '#075E54',
        icons: [
          { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        categories: ['productivity', 'education'],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — selalu dibutuhkan, cache terpisah
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          // Supabase — besar (~180KB), jarang berubah
          'vendor-supabase': ['@supabase/supabase-js'],
          // Markdown renderer — hanya dibutuhkan di halaman chat/hasil
          'vendor-markdown': ['react-markdown'],
        },
      },
    },
  },
})
