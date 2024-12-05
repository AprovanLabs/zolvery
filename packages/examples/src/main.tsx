import React from 'react';
import { createRoot } from 'react-dom/client';

import { KossabosEngine } from './core/server';
import { User } from './core/user';
import workerUrl from './examples/classics/tic-tac-toe/index?worker&url';
import { ReactRenderer } from './ui/renderer';
import { createWorkerBus } from './ui/worker-bus';

const hostUrl = new URL(import.meta.url).origin;
const worker = new Worker(
  new URL(`${hostUrl}${workerUrl}`),
  { type: 'module' },
);
const eventBus = createWorkerBus(worker);

const engine = new KossabosEngine();
const reactRenderer = new ReactRenderer();

const user: User = {
  name: 'Jack Sampson',
  email: 'jacob.samps@gmail.com',
};
const projectId = 'classics/tic-tac-toe';
// const project = loadProject(projectId);
const project = {
  id: projectId,
  name: 'Tic Tac Toe',
  author: user,
  description: 'A simple game of Tic Tac Toe',
  tags: ['game', 'classic'],
};

const App: React.FC = () => (
  <div>
    <header>Kossabos</header>
    <iframe
      src={`/sandbox.html?projectId=${projectId}`}
      sandbox="allow-scripts allow-same-origin"
      style={{ display: 'none' }}
    />

    {reactRenderer.render(project, user, eventBus.getEventTarget())}
    <footer>Footer</footer>
  </div>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
