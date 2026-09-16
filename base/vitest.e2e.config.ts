import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.e2e.test.ts'],
    setupFiles: ['dotenv/config'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
