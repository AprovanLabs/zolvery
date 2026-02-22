import { useState, useCallback, useEffect } from 'react';
import type { VirtualProject } from '@aprovan/patchwork-compiler';
import { WidgetPlayer, type WidgetPlayerProps } from './widget-player';
import { WidgetEditModal } from './widget-edit-modal';
import { useWidgetProject } from '../hooks/use-widget-project';

export interface EditableWidgetPlayerProps extends WidgetPlayerProps {
  editable?: boolean;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  onSourceChange?: (newSource: string) => void;
}

export function EditableWidgetPlayer({
  appId,
  manifest,
  source: initialSource,
  inputs,
  className,
  editable = false,
  isEditing: externalIsEditing,
  onEditingChange,
  onSourceChange,
}: EditableWidgetPlayerProps) {
  const project = useWidgetProject(appId);
  const [localSource, setLocalSource] = useState(initialSource);
  const [internalIsEditing, setInternalIsEditing] = useState(false);

  const isEditing = externalIsEditing ?? internalIsEditing;
  const setIsEditing = onEditingChange ?? setInternalIsEditing;

  const entryFile = project.project?.entry ?? 'client/main.tsx';
  const source = project.project?.files.get(entryFile)?.content ?? localSource;

  useEffect(() => {
    if (!project.isLoading && initialSource !== localSource) {
      setLocalSource(initialSource);
    }
  }, [initialSource]);

  const handleEditClose = useCallback(
    (finalCode: string, editCount: number) => {
      setIsEditing(false);
      if (editCount > 0 && finalCode !== source) {
        project.updateFile(entryFile, finalCode);
        setLocalSource(finalCode);
        onSourceChange?.(finalCode);
      }
    },
    [source, onSourceChange, setIsEditing, project, entryFile],
  );

  const handleSaveProject = useCallback(async (editedProject: VirtualProject) => {
    const filesToSave = Array.from(editedProject.files.values()).map((f) => ({
      path: f.path,
      content: f.content,
    }));
    await project.save(filesToSave);
  }, [project]);

  return (
    <div className="relative w-full h-full">
      <WidgetPlayer
        appId={appId}
        manifest={manifest}
        source={source}
        inputs={inputs}
        className={className}
      />

      {editable && project.project && (
        <WidgetEditModal
          appId={appId}
          manifest={manifest}
          project={project.project}
          isOpen={isEditing}
          isDirty={project.isDirty}
          onClose={handleEditClose}
          onSaveProject={handleSaveProject}
        />
      )}
    </div>
  );
}
