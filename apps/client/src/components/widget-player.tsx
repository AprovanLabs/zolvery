import React, { useRef, useEffect, useState, useMemo } from 'react';
import { usePatchwork } from '../hooks/use-patchwork';
import type { Manifest, InputSpec } from '@aprovan/patchwork-compiler';
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
  boardgameio: '@kossabos/patchwork-image-boardgameio',
};

const normalizeInputType = (settingType?: string): InputSpec['type'] => {
  switch (settingType) {
    case 'number':
      return 'number';
    case 'checkbox':
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    case 'input':
    case 'select':
    case 'string':
    default:
      return 'string';
  }
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

  const inputs = useMemo(() => {
    return (manifest.settings ?? []).reduce(
      (acc, setting) => {
        if (setting.id && setting.default !== undefined) {
          acc[setting.id] = setting.default;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }, [manifest.settings]);

  // Convert KossabosManifest to Compiler Manifest
  const compilerManifest: Manifest = useMemo(
    () => ({
      name: manifest.name ?? manifest.appId,
      version: manifest.version,
      platform: 'browser' as const,
      image: imageName,
      services: manifest.servers,
      inputs: (manifest.settings ?? []).reduce(
        (acc, setting) => {
          if (setting.id) {
            acc[setting.id] = {
              type: normalizeInputType(setting.type),
              default: setting.default,
            };
          }
          return acc;
        },
        {} as Record<string, InputSpec>,
      ),
    }),
    [manifest, imageName],
  );

  useEffect(() => {
    if (!isReady || !containerRef.current || !source) return;

    let mounted: { unmount: () => void } | null = null;

    mount(source, compilerManifest, containerRef.current, inputs)
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
  }, [isReady, source, compilerManifest, mount, inputs]);

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
