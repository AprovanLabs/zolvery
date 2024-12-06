import React, { useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AdjustmentsHorizontalIcon, ArrowLeftIcon, ChartBarIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid'

import { createMessageBus } from './core/message-bus';
import { User } from './core/user';

import './style.css';

const user: User = {
  name: 'Jack Sampson',
  email: 'jacob.samps@gmail.com',
};
// const projectId = 'card-games/buck-euchre';
// const projectId = 'classics/mancala';
const projectId = 'classics/tic-tac-toe';

// const project = loadProject(projectId);
const projects = [
  {
    id: 'classics/tic-tac-toe',
    name: 'Tic Tac Toe',
    author: user,
    description: 'A simple game of Tic Tac Toe',
    tags: ['game', 'classic'],
  },
  {
    id: 'classics/mancala',
    name: 'Mancala',
    author: user,
    description: 'A simple game of Mancala',
    tags: ['game', 'classic'],
  },
  {
    id: 'card-games/buck-euchre',
    name: 'Mancala',
    author: user,
    description: 'A card game',
    tags: ['game', 'classic'],
  },
];
const project = projects.find(({ id }) => id === projectId);

const App: React.FC = () => {
  const ref = useRef<HTMLIFrameElement>(null);

  const emit = useCallback((type: string, value: unknown | undefined = {}) => {
    const contentWindow = ref.current?.contentWindow;
    if (!contentWindow) return () => {};
    const eventBus = createMessageBus(contentWindow, (e) =>
      console.log('p', e),
    );
    return eventBus.postMessage(type, value);
  }, [ref]);

  return (
    <div>
      <header className="flex px-8 py-4 justify-between items-center border-b-1 border-slate-200">
        <div>
          <p>{project.name}</p>
          <span className="text-xs">{project.author.name}</span>
        </div>
        <div className="flex items-center gap-6">
          <AdjustmentsHorizontalIcon className="size-6 text-gray-900" />
          <ChartBarIcon className="size-6 text-gray-900" />
          <QuestionMarkCircleIcon className="size-6 text-gray-900" />

        </div>
      </header>
      <iframe
        ref={ref}
        src={`/environments/v1.html?projectId=${projectId}`}
        sandbox="allow-scripts allow-same-origin"
        className="b-none w-full h-screen"
      />

      <footer className="flex px-8 py-4 justify-between items-center border-b-1 border-slate-200 fixed w-full bottom-0">
        <div>
          <ArrowLeftIcon className="size-6 text-gray-900" />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => emit('reset')}>
            Reset
          </button>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
