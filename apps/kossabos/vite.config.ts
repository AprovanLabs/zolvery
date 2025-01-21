import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/apps': {
        target: 'http://localhost:3701',
        rewrite: (path) => path.replace(/^\/apps/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(
              'Received Response from the Target:',
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
      '/runners/vue-vanilla': {
        target: 'http://localhost:3710/',
        rewrite: (path) => path.replace(/^\/runners\/vue-vanilla/, ''),
      },
      '/runners/vue-boardgameio': {
        target: 'http://localhost:3711',
        rewrite: (path) => path.replace(/^\/runners\/vue-boardgamio/, ''),
      },
    },
  },
});
