/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
const allowedHosts = (process.env.ALLOWED_HOSTS || process.env.BASE_DOMAIN)?.split(',')

export default defineConfig({
    plugins: [
      react(),
    ],
    server: {
      host: true,
      port: Number(process.env.FRONTEND_PORT),
      allowedHosts: allowedHosts ? [...allowedHosts] : undefined,
      watch: {
        usePolling: true,
      },
    },
    preview: {
      host: true,
      port: Number(process.env.FRONTEND_PORT),
      allowedHosts: allowedHosts ? [...allowedHosts] : undefined,
    },
    define: {
      'import.meta.env.FRONTEND_BASE_DOMAIN': JSON.stringify(process.env.FRONTEND_BASE_DOMAIN || ''),
    },
  test: {
    globals: true,
    testTimeout: 30000,
    environment: 'jsdom',
    setupFiles: './src/app/setupTests.ts',
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
