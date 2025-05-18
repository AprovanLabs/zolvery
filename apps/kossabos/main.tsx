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
    <div className="absolute top-0 left-0 w-full h-full bg-white">
      <header
        className="flex items-center justify-between px-8 py-4 border-b-1 border-slate-200"
        style={{ height: '4rem' }}
      >
        <div>
          <p>{app.name}</p>
          <span className="text-xs">{app.author.username}</span>
        </div>
        <div className="flex items-center gap-6">
          <AdjustmentsHorizontalIcon className="text-gray-900 size-6" />
          <ChartBarIcon className="text-gray-900 size-6" />
          <QuestionMarkCircleIcon className="text-gray-900 size-6" />
        </div>
      </header>

      <iframe
        ref={ref}
        src={`/runners/${app.runnerTag}?appId=${app.appId}`}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-max b-none"
        style={{ height: 'calc(100vh - 4rem)' }}
      />

      <footer className="fixed bottom-0 flex items-center justify-between w-full px-8 py-4 border-b-1 border-slate-200">
        <div>
          <ArrowLeftIcon className="text-gray-900 size-6" />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => emit(new CustomEvent('emit'))}>Reset</button>
        </div>
      </footer>
    </div>
  );
};

const DEFAULT_APP_ID = 'card-games/black-jack';
// const DEFAULT_APP_ID = 'card-games/buck-euchre';

const App: React.FC = () => {
  const [apps, setApps] = useState([]);
  const [appId, setAppId] = useState<string | null>(DEFAULT_APP_ID);
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
        {app && <Match app={app} />}
        <div className="fixed top-0 flex items-center gap-2 pt-2 pl-2 bg-white">
          <img
            src="/logo.svg"
            alt="logo"
            className="w-10 h-10"
          ></img>
          <Dropdown
            value={appId}
            onChange={(e) => setAppId(e.value)}
            options={apps.map(({ appId }) => appId)}
            optionLabel="name"
            placeholder="Select an App"
          />
        </div>
      </div>
    </PrimeReactProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
