import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest конфигурация.
 * vite-tsconfig-paths v5 — ESM-only, несовместим с CJS.
 * Используем resolve.alias вручную для workspace-пакетов @ecb/*.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@ecb/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@ecb/broker-mock': path.resolve(__dirname, 'packages/broker-mock/src/index.ts'),
      '@ecb/core-service': path.resolve(__dirname, 'packages/core-service/src/index.ts'),
      '@ecb/translation-service': path.resolve(__dirname, 'packages/translation-service/src/index.ts'),
      '@ecb/definitions-service': path.resolve(__dirname, 'packages/definitions-service/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts'],
    },
  },
});
