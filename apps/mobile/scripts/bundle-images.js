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

import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PUBLIC = path.resolve(__dirname, '../../client/public');
const NPM_DIR = path.resolve(CLIENT_PUBLIC, 'npm');
const PRELOAD_DIR = path.resolve(NPM_DIR, '_preload');

// External CDN scripts to bundle for offline support
const CDN_SCRIPTS = [
  { url: 'https://cdn.tailwindcss.com', filename: 'tailwind.js' },
  { url: 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', filename: 'peerjs.min.js' },
];

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
    return { success: false, preloads: [] };
  }

  const destDir = path.join(NPM_DIR, packageName);
  
  // Clean existing
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // Read package.json and extract preload URLs
  const packageJsonSrc = path.join(srcDir, 'package.json');
  let preloads = [];
  let packageJson = null;
  
  if (fs.existsSync(packageJsonSrc)) {
    packageJson = JSON.parse(fs.readFileSync(packageJsonSrc, 'utf8'));
    preloads = packageJson?.patchwork?.framework?.preload || [];
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
  return { success: true, preloads, destDir, packageJson };
}

/**
 * Download a script from CDN and save locally
 */
async function downloadScript(url, filename) {
  const destPath = path.join(CLIENT_PUBLIC, filename);
  
  const response = await fetch(url, { redirect: 'follow' });
  
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  console.log(`  [OK] ${filename} <- ${url}`);
  return true;
}

/**
 * Generate a short hash-based filename for a preload URL
 */
function preloadFilename(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  return `${hash}.js`;
}

/**
 * Download a preload URL and return the local path
 * For esm.sh URLs, follows the internal redirect to get the actual bundle
 */
async function downloadPreload(url) {
  const filename = preloadFilename(url);
  const destPath = path.join(PRELOAD_DIR, filename);
  
  // Skip if already downloaded (deduplication)
  if (fs.existsSync(destPath)) {
    return `/npm/_preload/${filename}`;
  }
  
  // For esm.sh, use ?bundle to get a self-contained module
  let fetchUrl = url;
  if (url.includes('esm.sh/')) {
    fetchUrl = url.includes('?') ? `${url}&bundle` : `${url}?bundle`;
  }
  
  const response = await fetch(fetchUrl, { redirect: 'follow' });
  
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  
  let content = await response.text();
  
  // For esm.sh stubs, extract and download the actual bundle
  // esm.sh stubs look like: export * from "/path/to/actual.bundle.mjs";
  if (url.includes('esm.sh/') && content.includes('export * from "')) {
    const match = content.match(/export \* from ["']([^"']+)["']/);
    if (match) {
      const bundlePath = match[1];
      const bundleUrl = new URL(bundlePath, 'https://esm.sh').href;
      
      const bundleResponse = await fetch(bundleUrl, { redirect: 'follow' });
      if (bundleResponse.ok) {
        content = await bundleResponse.text();
      }
    }
  }
  
  fs.writeFileSync(destPath, content);
  
  return `/npm/_preload/${filename}`;
}

async function main() {
  console.log('[bundle-images] Bundling image packages for mobile offline support...');
  console.log(`  Output: ${NPM_DIR}`);
  console.log('');

  // Clean existing npm directory
  if (fs.existsSync(NPM_DIR)) {
    fs.rmSync(NPM_DIR, { recursive: true });
  }
  fs.mkdirSync(NPM_DIR, { recursive: true });
  fs.mkdirSync(PRELOAD_DIR, { recursive: true });

  // Bundle packages and collect preload info
  const bundleResults = [];
  let bundled = 0;
  
  for (const pkg of IMAGE_PACKAGES) {
    const result = bundlePackage(pkg);
    bundleResults.push({ pkg, ...result });
    if (result.success) bundled++;
  }

  console.log('');
  console.log(`[bundle-images] Bundled ${bundled}/${IMAGE_PACKAGES.length} packages`);
  
  if (bundled === 0) {
    console.error('[bundle-images] WARNING: No packages bundled. Mobile offline may not work.');
    process.exit(1);
  }

  // Collect all unique preload URLs
  const allPreloads = new Set();
  for (const result of bundleResults) {
    for (const url of result.preloads) {
      allPreloads.add(url);
    }
  }

  // Download all preloads and build URL mapping
  console.log('');
  console.log(`[bundle-images] Downloading ${allPreloads.size} preload modules...`);
  
  const preloadMapping = new Map();
  for (const url of allPreloads) {
    try {
      const localPath = await downloadPreload(url);
      preloadMapping.set(url, localPath);
      console.log(`  [OK] ${preloadFilename(url)} <- ${url}`);
    } catch (err) {
      console.warn(`  [SKIP] ${url} - ${err.message}`);
    }
  }

  // Write preload manifest for runtime URL mapping (don't rewrite package.json)
  console.log('');
  console.log('[bundle-images] Creating preload manifest...');
  
  const manifestPath = path.join(NPM_DIR, '_preload', 'manifest.json');
  const manifestContent = Object.fromEntries(preloadMapping);
  fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2));
  console.log(`  [OK] _preload/manifest.json`);

  // Write original package.json files (without rewriting preloads)
  console.log('');
  console.log('[bundle-images] Writing package.json files...');
  
  for (const result of bundleResults) {
    if (!result.success || !result.packageJson) continue;
    
    // Write original package.json (keep esm.sh URLs)
    const destPath = path.join(result.destDir, 'package.json');
    fs.writeFileSync(destPath, JSON.stringify(result.packageJson, null, 2));
    console.log(`  [OK] ${result.pkg}/package.json`);
  }

  // Download CDN scripts for offline use
  console.log('');
  console.log('[bundle-images] Downloading CDN scripts...');
  
  for (const { url, filename } of CDN_SCRIPTS) {
    try {
      await downloadScript(url, filename);
    } catch (err) {
      console.warn(`  [SKIP] ${filename} - ${err.message}`);
    }
  }
  
  console.log('');
  console.log('[bundle-images] Done!');
}

main().catch((err) => {
  console.error('[bundle-images] Fatal error:', err);
  process.exit(1);
});
