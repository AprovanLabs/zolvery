import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const importMap = {
  vue: 'https://unpkg.com/vue@3/dist/vue.esm-browser.js',
  primevue: 'https://cdn.jsdelivr.net/npm/primevue@4.2.5/+esm',
  '@primevue/themes':
    'https://cdn.jsdelivr.net/npm/@primevue/themes@4.2.5/+esm',
};

export default defineConfig({
  plugins: [vue()],
  // https://stackoverflow.com/questions/77686901/why-is-process-env-node-env-in-my-vuejs-custom-element
  define: { 'process.env.NODE_ENV': '"production"' },
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
      output: [
        {
          format: 'es',
          dir: 'dist',
          sourcemap: true,
          exports: 'auto',
          globals: {
            vue: 'Vue',
          },
          inlineDynamicImports: true,
        },
      ],
    },
    terserOptions: {
      compress: {
        keep_infinity: true,
        pure_getters: true,
        reduce_funcs: true,
      },
      mangle: {
        reserved: ['theme', 'css'],
      },
    },
  },
  resolve: {
    alias: {
      ...Object.entries(importMap).map(([packageName, replacement]) => ({
        find: new RegExp(`^${packageName}$`),
        replacement,
      })),
      '@kossabos/vue': path.resolve(__dirname, 'src'),
      '~lucide-static': path.resolve(
        __dirname,
        'node_modules/lucide-static',
      ),
    },
  },
});
