import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  resolveEntry,
  type VirtualFile,
  type VirtualProject,
} from '@aprovan/patchwork-compiler';
import type { ZolveryManifest } from './use-widget-source';

export interface UseWidgetProjectReturn {
  project: VirtualProject | null;
  manifest: ZolveryManifest | null;
  isLoading: boolean;
  error: Error | null;
  isDirty: boolean;
  dirtyFiles: Set<string>;
  updateFile: (path: string, content: string) => void;
  resetFile: (path: string) => void;
  resetAll: () => void;
  save: (files?: Array<{ path: string; content: string }>) => Promise<void>;
}

export function useWidgetProject(appId: string | null): UseWidgetProjectReturn {
  const [originalFiles, setOriginalFiles] = useState<Map<string, VirtualFile>>(
    new Map(),
  );
  const [currentFiles, setCurrentFiles] = useState<Map<string, VirtualFile>>(
    new Map(),
  );
  const [manifest, setManifest] = useState<ZolveryManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!appId) {
      setOriginalFiles(new Map());
      setCurrentFiles(new Map());
      setManifest(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const base = import.meta.env.BASE_URL;

    // Binary file extensions that should store URL instead of content
    const BINARY_EXTENSIONS = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.ico',
      '.mp4',
      '.mov',
      '.webm',
    ];
    const isBinaryFile = (path: string) =>
      BINARY_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

    const loadProject = async () => {
      // Fetch manifest and file listing in parallel
      const [manifestRes, filesRes] = await Promise.all([
        fetch(`${base}apps/${appId}/zolvery.json`),
        fetch(`${base}apps/${appId}?files`),
      ]);

      const m: ZolveryManifest = await manifestRes.json();
      setManifest(m);

      const allFiles: string[] = await filesRes.json();

      // Fetch all file contents in parallel
      const filePromises = allFiles.map(async (filePath) => {
        const url = `${base}apps/${appId}/${filePath}`;

        // For binary files, store the URL instead of fetching content
        if (isBinaryFile(filePath)) {
          return { path: filePath, content: url, encoding: 'base64' as const };
        }

        const res = await fetch(url);
        if (!res.ok) return null;
        const content = await res.text();
        return { path: filePath, content };
      });

      const fileResults = await Promise.all(filePromises);

      const files = new Map<string, VirtualFile>();

      for (const file of fileResults) {
        if (file) {
          files.set(file.path, {
            path: file.path,
            content: file.content,
            encoding: file.encoding,
          });
        }
      }

      setOriginalFiles(files);
      setCurrentFiles(new Map(files));
    };

    loadProject()
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [appId]);

  const dirtyFiles = useMemo(() => {
    const dirty = new Set<string>();
    for (const [path, file] of currentFiles) {
      const original = originalFiles.get(path);
      if (!original || original.content !== file.content) {
        dirty.add(path);
      }
    }
    return dirty;
  }, [currentFiles, originalFiles]);

  const isDirty = dirtyFiles.size > 0;

  const updateFile = useCallback((path: string, content: string) => {
    setCurrentFiles((prev) => {
      const next = new Map(prev);
      const existing = next.get(path);
      next.set(path, {
        path,
        content,
        encoding: existing?.encoding,
      });
      return next;
    });
  }, []);

  const resetFile = useCallback(
    (path: string) => {
      const original = originalFiles.get(path);
      if (original) {
        setCurrentFiles((prev) => {
          const next = new Map(prev);
          next.set(path, { ...original });
          return next;
        });
      }
    },
    [originalFiles],
  );

  const resetAll = useCallback(() => {
    setCurrentFiles(new Map(originalFiles));
  }, [originalFiles]);

  const save = useCallback(
    async (explicitFiles?: Array<{ path: string; content: string }>) => {
      if (!appId) return;

      const filesToSave =
        explicitFiles ??
        Array.from(dirtyFiles).map((path) => {
          const file = currentFiles.get(path)!;
          return {
            path: file.path,
            content: file.content,
          };
        });

      if (filesToSave.length === 0) return;

      setIsSaving(true);
      try {
        const response = await fetch(`/api/v1/apps/${appId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesToSave }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || `Save failed: ${response.status}`);
        }

        if (explicitFiles) {
          setCurrentFiles((prev) => {
            const next = new Map(prev);
            for (const file of explicitFiles) {
              next.set(file.path, { path: file.path, content: file.content });
            }
            return next;
          });
          setOriginalFiles((prev) => {
            const next = new Map(prev);
            for (const file of explicitFiles) {
              next.set(file.path, { path: file.path, content: file.content });
            }
            return next;
          });
        } else {
          setOriginalFiles(new Map(currentFiles));
        }
      } finally {
        setIsSaving(false);
      }
    },
    [appId, dirtyFiles, currentFiles],
  );

  const project = useMemo<VirtualProject | null>(() => {
    if (currentFiles.size === 0 || !appId) return null;
    return {
      id: appId,
      entry: resolveEntry(currentFiles),
      files: currentFiles,
    };
  }, [appId, currentFiles]);

  return {
    project,
    manifest,
    isLoading: isLoading || isSaving,
    error,
    isDirty,
    dirtyFiles,
    updateFile,
    resetFile,
    resetAll,
    save,
  };
}
