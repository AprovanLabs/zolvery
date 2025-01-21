import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const importMap = {
  vue: 'https://unpkg.com/vue@3/dist/vue.esm-browser.js',
  'primevue':
    'https://cdn.jsdelivr.net/npm/primevue@4.2.5/+esm',
    '@primevue/themes':
    'https://cdn.jsdelivr.net/npm/@primevue/themes@4.2.5/+esm',
};

export default defineConfig({
  plugins: [vue()],
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
  },
  resolve: {
    alias: Object.entries(importMap).map(([packageName, replacement]) => ({
      find: new RegExp(`^${packageName}$`),
      replacement,
    })),
  },
});
