import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/config': resolve(__dirname, 'src/config'),
      '@/models': resolve(__dirname, 'src/models'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/middleware': resolve(__dirname, 'src/middleware'),
      '@/routes': resolve(__dirname, 'src/routes'),
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
