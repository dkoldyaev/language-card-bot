/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
const allowedHost = process.env.FRONTEND_BASE_DOMAIN
  ? new URL(process.env.FRONTEND_BASE_DOMAIN).hostname
  : undefined

export default defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/(quiz|dictionary).*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'CardBot — Your word studio',
          short_name: 'CardBot',
          description: 'Build a personal vocabulary deck and practise recall',
          theme_color: '#F7F5EF',
          background_color: '#F7F5EF',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml'
            },
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
        }
      })
    ],
    server: {
      host: true,
      port: Number(process.env.FRONTEND_PORT),
      allowedHosts: allowedHost ? [allowedHost] : undefined,
      watch: {
        usePolling: true,
      },
    },
    preview: {
      port: Number(process.env.FRONTEND_PORT),
      allowedHosts: allowedHost ? [allowedHost] : undefined,
    },
    define: {
      'import.meta.env.FRONTEND_BASE_DOMAIN': JSON.stringify(process.env.FRONTEND_BASE_DOMAIN || ''),
    },
  test: {
    globals: true,
    testTimeout: 15000,
    environment: 'jsdom',
    setupFiles: './src/app/setupTests.ts',
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
