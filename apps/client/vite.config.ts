import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages base path
// process.env.GITHUB_PAGES_CUSTOM_DOMAIN or GITHUB_ACTIONS
const BASE_PATH = '/';

// Map npm package names to local directories
const LOCAL_NPM_PACKAGES: Record<string, string> = {
  '@kossabos/patchwork-image-boardgameio': path.join(
    __dirname,
    '../../packages/images/boardgameio',
  ),
};

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    {
      name: 'serve-local-npm',
      configureServer(server) {
        // Serve local npm packages at /npm/@scope/package/...
        server.middlewares.use('/npm', (req, res, next) => {
          // Strip query params (Vite adds ?import for dynamic imports)
          const urlPath = (req.url || '').split('?')[0];

          // Parse package name and file path from URL
          // URL format: /@scope/package/file.js or /@scope/package@version/file.js
          const match = urlPath.match(/^\/(@[^/]+\/[^/@]+)(?:@[^/]+)?\/(.*)$/);
          if (!match) {
            next();
            return;
          }

          const [, packageName, filePath] = match;
          const localDir = LOCAL_NPM_PACKAGES[packageName];

          if (!localDir) {
            next();
            return;
          }

          const fullPath = path.join(localDir, filePath);

          if (!fs.existsSync(fullPath)) {
            res.statusCode = 404;
            res.end(`Not found: ${fullPath}`);
            return;
          }

          // Set appropriate content type
          const ext = path.extname(fullPath);
          const contentTypes: Record<string, string> = {
            '.json': 'application/json',
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.ts': 'text/plain',
            '.tsx': 'text/plain',
            '.css': 'text/css',
          };
          res.setHeader(
            'Content-Type',
            contentTypes[ext] || 'application/octet-stream',
          );
          res.setHeader('Access-Control-Allow-Origin', '*');

          const content = fs.readFileSync(fullPath, 'utf-8');
          res.end(content);
        });

        // Serve example app sources at /apps/...
        server.middlewares.use('/apps', (req, res, next) => {
          const urlPath = req.url || '';
          const examplesDir = path.resolve(
            __dirname,
            '../../packages/examples/src',
          );
          const fullPath = path.join(examplesDir, urlPath);

          // Serve source files and assets
          const ext = path.extname(urlPath);
          const contentTypes: Record<string, string> = {
            '.json': 'application/json',
            '.ts': 'text/plain; charset=utf-8',
            '.tsx': 'text/plain; charset=utf-8',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
          };

          if (contentTypes[ext]) {
            if (!fs.existsSync(fullPath)) {
              next();
              return;
            }

            res.setHeader('Content-Type', contentTypes[ext]);
            const content = fs.readFileSync(fullPath);
            res.end(content);
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    proxy: {
      // Proxy non-source app requests to the server
      '^/apps/.*/kossabos\\.json': {
        target: 'http://localhost:3701',
        rewrite: (path) => path.replace(/^\/apps/, ''),
      },
      '^/apps/apps\\.json': {
        target: 'http://localhost:3701',
        rewrite: (path) => path.replace(/^\/apps/, ''),
      },
      // Proxy edit API to Stitchery service
      '/api/edit': {
        target: 'http://127.0.0.1:6434',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://127.0.0.1:6434',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
