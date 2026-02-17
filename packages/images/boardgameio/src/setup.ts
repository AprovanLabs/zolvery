/**
 * @kossabos/patchwork-image-boardgameio
 *
 * Setup function for the Boardgame.io image.
 * Uses Tailwind Play CDN for runtime CSS generation.
 */

import { injectMountHelper } from './mount.js';

export interface SetupOptions {
  darkMode?: boolean | 'system';
  cssRuntime?: boolean;
}

let tailwindLoadPromise: Promise<void> | null = null;
let mountHelperInjected = false;

declare global {
  interface Window {
    tailwind?: {
      config?: Record<string, unknown>;
    };
  }
}

export async function setup(
  container: HTMLElement,
  options: SetupOptions = {},
): Promise<void> {
  const { cssRuntime = true } = options;

  // Inject the mount helper for games to use
  if (!mountHelperInjected) {
    injectMountHelper();
    mountHelperInjected = true;
  }

  if (cssRuntime && !tailwindLoadPromise) {
    tailwindLoadPromise = loadTailwindPlayCDN();
  }

  if (tailwindLoadPromise) {
    await tailwindLoadPromise;
  }
}

export function cleanup(container: HTMLElement): void {
  // No-op for now
}

async function loadTailwindPlayCDN(): Promise<void> {
  if (document.querySelector('script[src*="tailwindcss.com/play"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://cdn.tailwindcss.com';
  script.async = true;

  return new Promise((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Tailwind CDN'));
    document.head.appendChild(script);
  });
}
