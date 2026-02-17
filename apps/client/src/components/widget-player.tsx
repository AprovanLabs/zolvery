import React, { useRef, useEffect, useState, useMemo } from 'react';
import { usePatchwork } from '../hooks/use-patchwork';
import type { Manifest } from '@aprovan/patchwork-compiler';
import type { KossabosManifest } from '../hooks/use-widget-source';

export interface WidgetPlayerProps {
  appId: string;
  manifest: KossabosManifest;
  source: string;
  className?: string;
}

// Map runnerTag to image package
const IMAGE_MAP: Record<string, string> = {
  shadcn: '@aprovan/patchwork-image-shadcn',
  vanilla: '@aprovan/patchwork-vanilla',
};

export function WidgetPlayer({
  appId,
  manifest,
  source,
  className,
}: WidgetPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const imageName = IMAGE_MAP[manifest.runnerTag] ?? manifest.runnerTag;

  const { isReady, error: compilerError, mount } = usePatchwork({
    image: imageName,
    cdnBaseUrl: '/npm',
    widgetCdnBaseUrl: 'https://esm.sh',
  });

  // Convert KossabosManifest to Compiler Manifest
  const compilerManifest: Manifest = useMemo(
    () => ({
      name: manifest.name ?? manifest.appId,
      version: manifest.version,
      platform: 'browser' as const,
      image: imageName,
      services: manifest.servers,
    }),
    [manifest, imageName],
  );

  useEffect(() => {
    if (!isReady || !containerRef.current || !source) return;

    let mounted: { unmount: () => void } | null = null;

    mount(source, compilerManifest, containerRef.current)
      .then((m) => {
        mounted = m;
      })
      .catch((e) => {
        console.error('Widget mount error:', e);
        setError(e.message);
      });

    return () => {
      if (mounted) {
        mounted.unmount();
      }
    };
  }, [isReady, source, compilerManifest, mount]);

  if (compilerError) {
    return (
      <div className="text-red-500 p-4">
        Compiler error: {compilerError.message}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Widget error: {error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={className ?? 'w-full h-full'}
      data-widget-id={appId}
    />
  );
}
