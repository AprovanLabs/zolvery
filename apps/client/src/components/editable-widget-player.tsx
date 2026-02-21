import { useState, useCallback, useEffect } from 'react';
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

  const source = project.project?.files.get('client/main.tsx')?.content ?? localSource;

  useEffect(() => {
    if (!project.isLoading && initialSource !== localSource) {
      setLocalSource(initialSource);
    }
  }, [initialSource]);

  const handleEditClose = useCallback(
    (finalCode: string, editCount: number) => {
      setIsEditing(false);
      if (editCount > 0 && finalCode !== source) {
        project.updateFile('client/main.tsx', finalCode);
        setLocalSource(finalCode);
        onSourceChange?.(finalCode);
      }
    },
    [source, onSourceChange, setIsEditing, project],
  );

  const handleSave = useCallback(async (code: string) => {
    await project.save([{ path: 'client/main.tsx', content: code }]);
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

      {editable && (
        <WidgetEditModal
          appId={appId}
          manifest={manifest}
          source={source}
          isOpen={isEditing}
          isDirty={project.isDirty}
          onClose={handleEditClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
