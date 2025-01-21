import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid';
import { PrimeReactProvider } from 'primereact/api';
import { App as KossabosApp, createTransport } from '@kossabos/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Dropdown } from 'primereact/dropdown';

import './style.css';

const COLOR_PALETTE = {
  players: [
    '#1E293B', // Prussian Blue (dark blue)
    '#FF8C42', // Pumpkin (orange)
    '#D5B942', // Old Gold (yellow)
    '#E3655B', // Bittersweet (red)
    '#48A8FF', // Argentinian Blue (blue)
    '#2DD881', // Emerald (green)
  ],
}

// const user: User = {
//   userId: 'xxx',
//   username: 'JacobSampson',
// };

const Match: React.FC<{ app: KossabosApp }> = ({ app }) => {
  const ref = useRef<HTMLIFrameElement>(null);

  const emit = useCallback(
    (event: Event) => {
      const contentWindow = ref.current?.contentWindow;
      if (!contentWindow) return () => {};
      const transport = createTransport(contentWindow);
      transport.addEventListener('message', (e: any) => {
        console.log('e', e);
      });
      return transport.dispatchEvent(event);
    },
    [ref],
  );

  return (
    <div>
      <header className="flex px-8 py-4 justify-between items-center border-b-1 border-slate-200">
        <div>
          <p>{app.name}</p>
          <span className="text-xs">{app.author.username}</span>
        </div>
        <div className="flex items-center gap-6">
          <AdjustmentsHorizontalIcon className="size-6 text-gray-900" />
          <ChartBarIcon className="size-6 text-gray-900" />
          <QuestionMarkCircleIcon className="size-6 text-gray-900" />
        </div>
      </header>

      <iframe
        ref={ref}
        src={`/runners/${app.runnerTag}?appId=${app.appId}`}
        sandbox="allow-scripts allow-same-origin"
        className="b-none w-full h-screen"
      />

      <footer className="flex px-8 py-4 justify-between items-center border-b-1 border-slate-200 fixed w-full bottom-0">
        <div>
          <ArrowLeftIcon className="size-6 text-gray-900" />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => emit(new CustomEvent('emit'))}>Reset</button>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const [apps, setApps] = useState([]);
  const [appId, setAppId] = useState<string | null>('card-games/buck-euchre');
  const [app, setApp] = useState();

  useEffect(() => {
    fetch(`/apps/apps.json`)
      .then((response) => response.json())
      .then((data) => setApps(data));
  }, []);

  useEffect(() => {
    if (!appId) return;
    fetch(`/apps/${appId}/kossabos.json`)
      .then((response) => response.json())
      .then((data) => setApp(data));
  }, [appId]);

  return (
    <PrimeReactProvider>
      <div>
        <div className="flex flex-row gap-2 items-center pl-2 pt-2">
          <img src="/logo.svg" alt="logo" className="h-10 w-10">

          </img>
          <Dropdown
            value={appId}
            onChange={(e) => setAppId(e.value)}
            options={apps.map(({ appId }) => appId)}
            optionLabel="name"
            placeholder="Select an App"
          />
                    </div>
        {app && <Match app={app} />}
      </div>
    </PrimeReactProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
