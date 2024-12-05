import React, { useMemo } from 'react';

import { Project } from '../core/project';
import { Renderer } from '../core/renderer';
import { User } from '../core/user';
import { loadAssets } from './assets';
import { AssetsContext } from './contexts/asset-context';
import { EventProvider } from './contexts/event-context';

const Scene: React.FC<{
  project: Project;
  user: User;
}> = ({ project, user }) => {
  return <div>Scene!</div>;
};

export class ReactRenderer implements Renderer<React.ReactNode> {
  public render(
    project: Project,
    user: User,
    eventTarget: EventTarget,
  ): React.ReactNode {
    const assets = useMemo(() => loadAssets(project), [project]);

    return (
      <AssetsContext.Provider value={assets}>
        <EventProvider project={project} eventTarget={eventTarget}>
          <Scene project={project} user={user} />
        </EventProvider>
      </AssetsContext.Provider>
    );
  }
}
