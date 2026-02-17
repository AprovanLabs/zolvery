import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createCompiler,
  type Compiler,
  type MountedWidget,
  type Manifest,
} from '@aprovan/patchwork-compiler';

export interface UsePatchworkOptions {
  image: string;
  proxyUrl?: string;
  /** Base URL for loading image packages (e.g., '/npm' for local) */
  cdnBaseUrl?: string;
  /** Base URL for widget imports (e.g., 'https://esm.sh') */
  widgetCdnBaseUrl?: string;
}

export interface UsePatchworkReturn {
  compiler: Compiler | null;
  isReady: boolean;
  error: Error | null;
  mount: (
    source: string,
    manifest: Manifest,
    target: HTMLElement,
    inputs?: Record<string, unknown>,
  ) => Promise<MountedWidget>;
}

export function usePatchwork(options: UsePatchworkOptions): UsePatchworkReturn {
  const [compiler, setCompiler] = useState<Compiler | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef<MountedWidget | null>(null);

  useEffect(() => {
    let cancelled = false;

    createCompiler({
      image: options.image,
      proxyUrl: options.proxyUrl ?? '/api/proxy',
      cdnBaseUrl: options.cdnBaseUrl,
      widgetCdnBaseUrl: options.widgetCdnBaseUrl,
    })
      .then((c) => {
        if (cancelled) return;
        setCompiler(c);
        setIsReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
      });

    return () => {
      cancelled = true;
      if (mountedRef.current) {
        mountedRef.current.unmount();
      }
    };
  }, [
    options.image,
    options.proxyUrl,
    options.cdnBaseUrl,
    options.widgetCdnBaseUrl,
  ]);

  const mount = useCallback(
    async (
      source: string,
      manifest: Manifest,
      target: HTMLElement,
      inputs?: Record<string, unknown>,
    ) => {
      if (!compiler) throw new Error('Compiler not ready');

      const widget = await compiler.compile(source, manifest);
      const mounted = await compiler.mount(widget, {
        target,
        mode: 'embedded',
        inputs,
      });

      mountedRef.current = mounted;
      return mounted;
    },
    [compiler],
  );

  return { compiler, isReady, error, mount };
}
