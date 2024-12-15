import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@kossabos': path.resolve(__dirname, './src'),
      'vue': path.resolve(__dirname, './node_modules/vue/dist/vue.esm-browser.js'),
    },
  },
  plugins: [
    react(),
    tailwindcss()
  ],
});
