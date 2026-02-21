import { useState, useEffect } from 'react';

export interface GameSetting {
  id: string;
  label: string;
  type?: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface KossabosManifest {
  appId: string;
  name?: string;
  description?: string;
  runnerTag: string;
  version: string;
  authorId?: string;
  visibility?: string;
  tags?: string[];
  servers?: string[];
  players?: {
    min?: number;
    max?: number;
    /** Max players that can play on the same device. Defaults to players.max */
    maxLocal?: number;
  };
  settings?: GameSetting[];
}

export interface UseWidgetSourceReturn {
  manifest: KossabosManifest | null;
  source: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useWidgetSource(appId: string | null): UseWidgetSourceReturn {
  const [manifest, setManifest] = useState<KossabosManifest | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!appId) return;

    setIsLoading(true);
    setError(null);
    const base = import.meta.env.BASE_URL;

    Promise.all([
      fetch(`${base}apps/${appId}/kossabos.json`).then((r) => r.json()),
      fetch(`${base}apps/${appId}/client/main.tsx`).then((r) => r.text()),
    ])
      .then(([m, s]) => {
        setManifest(m);
        setSource(s);
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [appId]);

  return { manifest, source, isLoading, error };
}
