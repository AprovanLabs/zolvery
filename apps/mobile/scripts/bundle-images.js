#!/usr/bin/env node

/**
 * Bundles image packages to public/npm/ for offline mobile support.
 * 
 * The patchwork compiler fetches image packages from CDN at runtime.
 * On mobile, this fails due to network/WebView restrictions.
 * This script copies image packages locally so they can be served from /npm/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PUBLIC = path.resolve(__dirname, '../../client/public');
const NPM_DIR = path.resolve(CLIENT_PUBLIC, 'npm');

// Image packages to bundle for offline support
const IMAGE_PACKAGES = [
  '@aprovan/patchwork-image-shadcn',
  '@aprovan/patchwork-vanilla',
  '@aprovan/patchwork-image-boardgameio',
];

function findPackageDir(packageName) {
  // Map package names to workspace directories
  // Paths relative to apps/mobile/scripts/
  const workspaceMap = {
    '@aprovan/patchwork-image-shadcn': path.resolve(__dirname, '../../../../patchwork/packages/images/shadcn'),
    '@aprovan/patchwork-vanilla': path.resolve(__dirname, '../../../../patchwork/packages/images/vanilla'),
    '@aprovan/patchwork-image-boardgameio': path.resolve(__dirname, '../../../packages/images/boardgameio'),
  };

  // Try workspace path first
  if (workspaceMap[packageName] && fs.existsSync(workspaceMap[packageName])) {
    return workspaceMap[packageName];
  }

  // Fall back to node_modules locations
  const nodeModulesPaths = [
    path.resolve(__dirname, '../../client/node_modules', packageName),
    path.resolve(__dirname, '../../../node_modules', packageName),
    path.resolve(__dirname, '../node_modules', packageName),
  ];

  for (const searchPath of nodeModulesPaths) {
    if (fs.existsSync(searchPath)) {
      return searchPath;
    }
  }

  return null;
}

function copyRecursive(src, dest, filter = () => true) {
  if (!fs.existsSync(src)) {
    return;
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (filter(child)) {
        copyRecursive(path.join(src, child), path.join(dest, child), filter);
      }
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function bundlePackage(packageName) {
  const srcDir = findPackageDir(packageName);
  
  if (!srcDir) {
    console.warn(`  [SKIP] ${packageName} - not found`);
    return false;
  }

  const destDir = path.join(NPM_DIR, packageName);
  
  // Clean existing
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // Copy package.json
  const packageJsonSrc = path.join(srcDir, 'package.json');
  if (fs.existsSync(packageJsonSrc)) {
    fs.copyFileSync(packageJsonSrc, path.join(destDir, 'package.json'));
  }

  // Copy dist directory (compiled output)
  const distSrc = path.join(srcDir, 'dist');
  if (fs.existsSync(distSrc)) {
    copyRecursive(distSrc, path.join(destDir, 'dist'), (name) => {
      // Skip source maps in production to reduce bundle size
      return !name.endsWith('.map');
    });
  }

  console.log(`  [OK] ${packageName} -> ${path.relative(CLIENT_PUBLIC, destDir)}`);
  return true;
}

function main() {
  console.log('[bundle-images] Bundling image packages for mobile offline support...');
  console.log(`  Output: ${NPM_DIR}`);
  console.log('');

  // Clean existing npm directory
  if (fs.existsSync(NPM_DIR)) {
    fs.rmSync(NPM_DIR, { recursive: true });
  }
  fs.mkdirSync(NPM_DIR, { recursive: true });

  let bundled = 0;
  for (const pkg of IMAGE_PACKAGES) {
    if (bundlePackage(pkg)) {
      bundled++;
    }
  }

  console.log('');
  console.log(`[bundle-images] Bundled ${bundled}/${IMAGE_PACKAGES.length} packages`);
  
  if (bundled === 0) {
    console.error('[bundle-images] WARNING: No packages bundled. Mobile offline may not work.');
    process.exit(1);
  }
}

main();
