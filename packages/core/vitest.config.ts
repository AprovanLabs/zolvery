import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '../events.js': path.resolve(__dirname, 'src/__mocks__/events.ts'),
      '../../events': path.resolve(__dirname, 'src/__mocks__/events.ts'),
      './events': path.resolve(__dirname, 'src/__mocks__/events.ts'),
    },
  },
});
