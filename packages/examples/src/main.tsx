import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { createMessageBus } from './core/message-bus';
import { User } from './core/user';

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

const App: React.FC = () => {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const contentWindow = ref.current?.contentWindow;
    if (!contentWindow) return;
    const eventBus = createMessageBus(contentWindow, (e) =>
      console.log('p', e),
    );
    setTimeout(() => eventBus.postMessage('turn', {}), 500);
  }, [ref]);

  return (
    <div>
      <header>Kossabos</header>
      <iframe
        ref={ref}
        src={`/environments/v1.html?projectId=${projectId}`}
        sandbox="allow-scripts allow-same-origin"
        style={{
          border: 'none',
          width: '100%',
          height: '100vh',
        }}
      />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
