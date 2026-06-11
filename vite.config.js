import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
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
