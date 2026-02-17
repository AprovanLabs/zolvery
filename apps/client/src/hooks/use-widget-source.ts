import { useState, useEffect } from 'react';

export interface KossabosManifest {
  appId: string;
  name?: string;
  runnerTag: string;
  version: string;
  authorId?: string;
  visibility?: string;
  tags?: string[];
  servers?: string[];
  settings?: Array<{
    id: string;
    label: string;
    type?: string;
    default?: unknown;
    options?: Array<{ value: string; label: string }>;
  }>;
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

    Promise.all([
      fetch(`/apps/${appId}/kossabos.json`).then((r) => r.json()),
      fetch(`/apps/${appId}/client/main.tsx`).then((r) => r.text()),
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
