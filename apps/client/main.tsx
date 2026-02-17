import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WidgetPlayer } from './src/components/widget-player';
import { useWidgetSource } from './src/hooks/use-widget-source';
import { AppSelector } from './src/components/app-selector';
import { AppHeader } from './src/components/app-header';

import './style.css';

const DEFAULT_APP_ID = 'classics/mancala';
const LOCAL_STORAGE_KEY = 'kossabos-app-id';

function App() {
  const [apps, setApps] = useState<Array<{ appId: string }>>([]);
  const [appId, setAppId] = useState<string | null>(
    localStorage.getItem(LOCAL_STORAGE_KEY) ?? DEFAULT_APP_ID,
  );

  const { manifest, source, isLoading, error } = useWidgetSource(appId);

  // Fetch app list
  React.useEffect(() => {
    fetch('/apps/apps.json')
      .then((r) => r.json())
      .then(setApps);
  }, []);

  const updateAppId = useCallback((id: string) => {
    setAppId(id);
    localStorage.setItem(LOCAL_STORAGE_KEY, id);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {manifest && (
        <AppHeader
          app={manifest}
          onShowSettings={() => {}}
          onShowHelp={() => {}}
        />
      )}

      <main className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            Loading...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500">
            Error: {error.message}
          </div>
        )}

        {manifest && source && !isLoading && (
          <WidgetPlayer
            appId={appId!}
            manifest={manifest}
            source={source}
            className="w-full h-full"
          />
        )}
      </main>

      <AppSelector
        selectedAppId={appId}
        apps={apps}
        onAppChange={updateAppId}
      />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
