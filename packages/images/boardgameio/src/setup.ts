/**
 * @zolvery/patchwork-image-boardgameio
 *
 * Setup function for the Boardgame.io image.
 * Uses Tailwind Play CDN for runtime CSS generation.
 */

import { injectMountHelper } from './mount.js';

export interface SetupOptions {
  darkMode?: boolean | 'system';
  cssRuntime?: boolean;
  multiplayer?: boolean;
}

let tailwindLoadPromise: Promise<void> | null = null;
let peerJSLoadPromise: Promise<void> | null = null;
let mountHelperInjected = false;

declare global {
  interface Window {
    tailwind?: {
      config?: Record<string, unknown>;
    };
    // Peer type is defined in p2p/transport.ts
  }
}

export async function setup(
  container: HTMLElement,
  options: SetupOptions = {},
): Promise<void> {
  const { cssRuntime = true, multiplayer = false } = options;

  // Inject the mount helper for games to use
  if (!mountHelperInjected) {
    injectMountHelper();
    mountHelperInjected = true;
  }

  if (cssRuntime && !tailwindLoadPromise) {
    tailwindLoadPromise = loadTailwindPlayCDN();
  }

  // Load PeerJS for multiplayer support
  if (multiplayer && !peerJSLoadPromise) {
    peerJSLoadPromise = loadPeerJS();
  }

  await Promise.all([tailwindLoadPromise, peerJSLoadPromise].filter(Boolean));
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

async function loadPeerJS(): Promise<void> {
  if ((window as { Peer?: unknown }).Peer) {
    return;
  }

  if (document.querySelector('script[src*="peerjs"]')) {
    // Wait for existing script to load
    return new Promise((resolve) => {
      const check = () => {
        if ((window as { Peer?: unknown }).Peer) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  script.async = true;

  return new Promise((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PeerJS'));
    document.head.appendChild(script);
  });
}

/**
 * Ensures PeerJS is loaded (can be called directly by mount if needed)
 */
export async function ensurePeerJS(): Promise<void> {
  if (!peerJSLoadPromise) {
    peerJSLoadPromise = loadPeerJS();
  }
  await peerJSLoadPromise;
}
