import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite'; // 👈 1. ДОБАВЬ ЭТОТ ИМПОРТ

export default defineConfig({
  server: {
    port: 3000,
    strictPort: false,
  },
  optimizeDeps: {
    include: ['react-is', 'recharts']
  },
  plugins: [
    react(),
    tailwindcss(), // 👈 2. ДОБАВЬ ВЫЗОВ ПЛАГИНА СЮДА
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Интизом - Системаи идоракунӣ',
        short_name: 'Интизом',
        description: 'Платформа для управления школой и оценками',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});