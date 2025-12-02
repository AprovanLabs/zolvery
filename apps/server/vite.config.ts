import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/logger': resolve(__dirname, 'src/config/logger'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec,unit}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.unit.ts',
        'src/**/*.d.ts',
      ],
    },
    testTimeout: 10000,
  },
});
