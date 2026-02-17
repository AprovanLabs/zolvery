import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Apprentice packages directory (adjust if needed)
const APPRENTICE_PACKAGES = path.resolve(
  __dirname,
  '../../../apprentice/packages',
);

// Map npm package names to local directories
const LOCAL_NPM_PACKAGES: Record<string, string> = {
  '@aprovan/patchwork-image-shadcn': path.join(
    APPRENTICE_PACKAGES,
    'images/shadcn',
  ),
  '@aprovan/patchwork-image-vanilla': path.join(
    APPRENTICE_PACKAGES,
    'images/vanilla',
  ),
  '@aprovan/patchwork-compiler': path.join(APPRENTICE_PACKAGES, 'compiler'),
  '@aprovan/patchwork': path.join(APPRENTICE_PACKAGES, 'patchwork'),
};

export default defineConfig({
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

          // Only serve .tsx, .ts, and .json files as text
          if (
            urlPath.endsWith('.tsx') ||
            urlPath.endsWith('.ts') ||
            urlPath.endsWith('.json')
          ) {
            if (!fs.existsSync(fullPath)) {
              // Fall through to server proxy for manifest files
              next();
              return;
            }

            const ext = path.extname(fullPath);
            const contentTypes: Record<string, string> = {
              '.json': 'application/json',
              '.ts': 'text/plain; charset=utf-8',
              '.tsx': 'text/plain; charset=utf-8',
            };
            res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');

            const content = fs.readFileSync(fullPath, 'utf-8');
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
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
