import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/apps': {
        target: 'http://localhost:3701',
        rewrite: (path) => path.replace(/^\/apps/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(
              'Received Response from the Target:',
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
      '^/runners/vue-vanilla': {
        target: 'http://localhost:3710/',
      },
      '^/runners/vue-boardgameio': {
        target: 'http://localhost:3711',
      },
    },
  },
  resolve: {
    alias: {
      '@kossabos/vue': path.resolve(__dirname, './packages/vue/src'),
    }
  }
});
