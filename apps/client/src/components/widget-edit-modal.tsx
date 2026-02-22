import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { EditModal, type CompileFn } from '@aprovan/patchwork-editor';
import { usePatchwork } from '../hooks/use-patchwork';
import type { ZolveryManifest } from '../hooks/use-widget-source';
import type { Manifest, InputSpec, VirtualProject } from '@aprovan/patchwork-compiler';

const IMAGE_MAP: Record<string, string> = {
  shadcn: '@aprovan/patchwork-image-shadcn',
  vanilla: '@aprovan/patchwork-vanilla',
  boardgameio: '@zolvery/patchwork-image-boardgameio@0.1.0',
};

const CDN_BASE_URL = import.meta.env.DEV ? '/npm' : 'https://esm.sh';

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
    default:
      return 'string';
  }
};

export interface WidgetEditModalProps {
  appId: string;
  manifest: ZolveryManifest;
  project: VirtualProject;
  isOpen: boolean;
  isDirty?: boolean;
  onClose: (finalCode: string, editCount: number) => void;
  onSaveProject?: (project: VirtualProject) => Promise<void>;
}

export function WidgetEditModal({
  appId,
  manifest,
  project,
  isOpen,
  isDirty,
  onClose,
  onSaveProject,
}: WidgetEditModalProps) {
  const source = project.files.get(project.entry)?.content ?? '';
  const imageName = IMAGE_MAP[manifest.runnerTag] ?? manifest.runnerTag;
  const { compiler, isReady, error: compilerError } = usePatchwork({
    image: imageName,
    cdnBaseUrl: CDN_BASE_URL,
    widgetCdnBaseUrl: 'https://esm.sh',
  });

  const compilerManifest: Manifest = useMemo(
    () => ({
      name: manifest.appId,
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

  const compile: CompileFn = async (code: string) => {
    if (!compiler) return { success: false, error: 'Compiler not ready' };
    try {
      await compiler.compile(code, compilerManifest);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  const renderPreview = useCallback((code: string) => {
    return (
      <WidgetPreview
        code={code}
        manifest={manifest}
        compilerManifest={compilerManifest}
        imageName={imageName}
      />
    );
  }, [manifest, compilerManifest, imageName]);

  const patchworkProject: VirtualProject = useMemo(() => ({
    id: project.id,
    entry: project.entry,
    files: project.files,
  }), [project]);

  if (!isOpen) return null;

  if (compilerError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-500">Compiler error: {compilerError.message}</p>
          <button
            onClick={() => onClose(source, 0)}
            className="mt-4 px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      onSaveProject={onSaveProject}
      originalProject={patchworkProject}
      compile={compile}
      apiEndpoint="/api/edit"
      renderPreview={renderPreview}
      previewLoading={!isReady}
      initialState={{ showPreview: true, showTree: true }}
    />
  );
}

interface WidgetPreviewProps {
  code: string;
  manifest: ZolveryManifest;
  compilerManifest: Manifest;
  imageName: string;
}

function WidgetPreview({ code, manifest, compilerManifest, imageName }: WidgetPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { isReady, mount } = usePatchwork({
    image: imageName,
    cdnBaseUrl: CDN_BASE_URL,
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

  useEffect(() => {
    if (!isReady || !containerRef.current || !code) return;

    let mounted: { unmount: () => void } | null = null;
    setError(null);

    mount(code, compilerManifest, containerRef.current, inputs)
      .then((m) => {
        mounted = m;
      })
      .catch((e) => {
        console.error('Preview mount error:', e);
        setError(e.message);
      });

    return () => {
      if (mounted) mounted.unmount();
    };
  }, [isReady, code, compilerManifest, mount, inputs]);

  if (error) {
    return <div className="text-red-500 p-4">Preview error: {error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px]"
      data-widget-preview
    />
  );
}
