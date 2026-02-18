#!/usr/bin/env node

/**
 * Copies example widgets from packages/examples/src to public/apps
 * for static deployment (GitHub Pages).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, '..');
const EXAMPLES_SRC = path.resolve(CLIENT_DIR, '../../packages/examples/src');
const PUBLIC_APPS = path.resolve(CLIENT_DIR, 'public/apps');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source does not exist: ${src}`);
    return;
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  console.log('[embed-examples] Copying examples to public/apps...');
  console.log(`  From: ${EXAMPLES_SRC}`);
  console.log(`  To:   ${PUBLIC_APPS}`);

  // Clean existing apps directory
  if (fs.existsSync(PUBLIC_APPS)) {
    fs.rmSync(PUBLIC_APPS, { recursive: true });
  }

  // Copy all examples
  copyRecursive(EXAMPLES_SRC, PUBLIC_APPS);

  // Count copied files
  const count = (dir) => {
    let n = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        n += count(path.join(dir, entry.name));
      } else {
        n++;
      }
    }
    return n;
  };

  console.log(`[embed-examples] Copied ${count(PUBLIC_APPS)} files`);
}

main();
