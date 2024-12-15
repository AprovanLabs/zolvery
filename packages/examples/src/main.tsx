import React, { useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AdjustmentsHorizontalIcon, ArrowLeftIcon, ChartBarIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid'

import { createTransport } from './client';
import { User } from './core/user';

import './style.css';

const user: User = {
  userId: 'xxx',
  username: 'JacobSampson',
  isHost: true,
};
// const projectId = 'board-games/connect-4';
// const projectId = 'card-games/black-jack';
// const projectId = 'puzzles/lettered';
// const projectId = 'card-games/buck-euchre';
// const projectId = 'classics/mancala';
// const projectId = 'classics/tic-tac-toe';
const projectId = 'dice-games/yahtzee';

// const runnerTag = 'vue-vanilla';
const runnerTag = 'vue-boardgameio';

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
  {
    id: 'dice-games/yahtzee',
    name: 'Yahtzee',
    author: user,
    description: 'The classic probability dice game',
    tags: ['game', 'classic'],
  },
  {
    id: 'card-games/black-jack',
    name: 'Black Jack',
    author: user,
    description: 'A classic betting game',
    tags: ['game', 'classic'],
  },
  {
    id: 'board-games/connect-4',
    name: 'Connect 4',
    author: user,
    description: '2-player board game',
    tags: ['game', 'classic'],
  },
  {
    id: 'puzzles/lettered',
    name: 'Lettered',
    author: user,
    description: 'Word guessing game',
    tags: ['game', 'classic'],
  },
];
const project = projects.find(({ id }) => id === projectId);

const App: React.FC = () => {
  const ref = useRef<HTMLIFrameElement>(null);

  const emit = useCallback((event: Event) => {
    const contentWindow = ref.current?.contentWindow;
    if (!contentWindow) return () => {};
    const transport = createTransport(contentWindow);
    transport.addEventListener('message', (e) => {
      console.log('e', e)
    });
    return transport.dispatchEvent(event);
  }, [ref]);

  if (!project) {
    return <></>
  }

  return (
    <div>
      <header className="flex px-8 py-4 justify-between items-center border-b-1 border-slate-200">
        <div>
          <p>{project.name}</p>
          <span className="text-xs">{project.author.username}</span>
        </div>
        <div className="flex items-center gap-6">
          <AdjustmentsHorizontalIcon className="size-6 text-gray-900" />
          <ChartBarIcon className="size-6 text-gray-900" />
          <QuestionMarkCircleIcon className="size-6 text-gray-900" />

        </div>
      </header>
      <iframe
        ref={ref}
        src={`/runners/${runnerTag}.html?projectId=${projectId}`}
        sandbox="allow-scripts allow-same-origin"
        className="b-none w-full h-screen"
      />

      <footer className="flex px-8 py-4 justify-between items-center border-b-1 border-slate-200 fixed w-full bottom-0">
        <div>
          <ArrowLeftIcon className="size-6 text-gray-900" />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => emit(new CustomEvent('emit'))}>
            Reset
          </button>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
