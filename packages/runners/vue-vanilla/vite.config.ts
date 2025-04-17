import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/runners/vue-vanilla',
  plugins: [vue()],
  resolve: {
    alias: {
      vue: path.resolve(
        __dirname,
        './node_modules/vue/dist/vue.esm-browser.js',
      ),
    },
  },
});
