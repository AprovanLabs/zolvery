import { defineConfig } from 'vite';

const importMap = { vue: 'https://unpkg.com/vue@3/dist/vue.esm-browser.js' };

export default defineConfig({
  resolve: {
    alias: Object.entries(importMap).map(([packageName, replacement]) => ({
      find: new RegExp(`^${packageName}$`),
      replacement,
    })),
  },
});
