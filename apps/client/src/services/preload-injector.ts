/**
 * Preload Injector for Mobile Offline Support
 * 
 * On mobile, dynamic imports from esm.sh fail due to WebView restrictions.
 * This module loads bundled preload modules and stores them in a global
 * registry that the patchwork compiler can use.
 * 
 * Must be called BEFORE any patchwork compiler initialization.
 */

import { isMobile } from './mobile-auth';

let injected = false;

// Global module cache that bypasses dynamic import()
declare global {
  interface Window {
    __preloadedModules?: Map<string, unknown>;
  }
}

/**
 * Check if running in a context that needs preload injection
 */
function needsPreloadInjection(): boolean {
  if (isMobile()) return true;

  const { protocol, hostname } = window.location;
  return (
    protocol === 'capacitor:' ||
    protocol === 'file:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    import.meta.env.DEV
  );
}

/**
 * Load the preload manifest that maps esm.sh URLs to local paths
 */
async function loadManifest(): Promise<Record<string, string>> {
  try {
    const response = await fetch('/npm/_preload/manifest.json');
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Load a module from a local file and execute it
 */
async function loadModule(localPath: string): Promise<unknown> {
  const response = await fetch(localPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${localPath}: ${response.status}`);
  }
  const content = await response.text();
  
  // Create a blob URL and import it
  const blob = new Blob([content], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  
  try {
    const module = await import(/* @vite-ignore */ blobUrl);
    return module;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Patch dynamic import to use preloaded modules
 */
function patchDynamicImport(): void {
  const originalImport = window.Function.prototype.constructor;
  
  // Store original import function  
  const cache = window.__preloadedModules;
  if (!cache) return;

  // Create a patched import function wrapper
  // This patches the global import() by overriding it at the module evaluation level
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const cache = window.__preloadedModules;
      if (!cache) return;
      
      // Store the original import for fallback
      const originalImport = (url) => import(url);
      
      // Override global import by wrapping it
      // Note: This is a best-effort approach - some imports may not be intercepted
      window.__cachedImport = async function(url) {
        if (cache.has(url)) {
          console.log('[preload] Cache hit:', url);
          return cache.get(url);
        }
        console.log('[preload] Cache miss:', url);
        return originalImport(url);
      };
    })();
  `;
  document.head.appendChild(script);
}

/**
 * Initialize preload injection for mobile/offline support
 * 
 * This must be called BEFORE creating any patchwork compiler instances.
 * It loads bundled framework modules into a global cache.
 */
export async function initPreloadInjector(): Promise<void> {
  if (injected) return;
  if (!needsPreloadInjection()) {
    injected = true;
    return;
  }

  console.log('[preload-injector] Initializing...');

  // Initialize global cache
  window.__preloadedModules = new Map();

  // Load the manifest
  const manifest = await loadManifest();
  const urls = Object.keys(manifest);
  
  if (urls.length === 0) {
    console.log('[preload-injector] No preloads found, skipping');
    injected = true;
    return;
  }

  console.log(`[preload-injector] Loading ${urls.length} preload modules...`);

  // Load all modules into the cache
  for (const [esmUrl, localPath] of Object.entries(manifest)) {
    try {
      const module = await loadModule(localPath);
      window.__preloadedModules.set(esmUrl, module);
      console.log(`[preload-injector] Cached: ${esmUrl}`);
    } catch (err) {
      console.warn(`[preload-injector] Failed to load ${localPath}:`, err);
    }
  }

  console.log(`[preload-injector] Loaded ${window.__preloadedModules.size} modules`);
  
  injected = true;
}

/**
 * Get a preloaded module from the cache
 */
export function getPreloadedModule(url: string): unknown | undefined {
  return window.__preloadedModules?.get(url);
}

/**
 * Check if a module is preloaded
 */
export function hasPreloadedModule(url: string): boolean {
  return window.__preloadedModules?.has(url) ?? false;
}
