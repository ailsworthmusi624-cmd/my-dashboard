import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Свобода',
        short_name: 'Свобода',
        description: 'Управление задолженностями',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Исключаем Firebase и Google APIs из кеша сервис-воркера
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              return (
                url.origin.includes('firebase') || 
                url.origin.includes('googleapis.com')
              );
            },
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
});