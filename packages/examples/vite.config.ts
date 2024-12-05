import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), UnoCSS()],
  resolve: {
    alias: {
      '@kossabos': path.resolve(__dirname, './src'),
    },
  },
});
