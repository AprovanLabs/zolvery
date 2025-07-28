import { PrimeReactProvider } from 'primereact/api';
import { App as KossabosApp, createTransport } from '@kossabos/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsDrawer } from './src/components/settings-drawer';
import { HelpDrawer } from './src/components/help-drawer';
import { AppHeader } from './src/components/app-header';
import { AppSelector } from './src/components/app-selector';
import {
  generateHelpContent,
  LocaleType,
  Locale,
} from './src/utils/help-content';

import './style.css';

type KossabosCtx = {
  locale: LocaleType;
};

const Player: React.FC<{ app: KossabosApp; ctx: KossabosCtx }> = ({
  app,
  ctx,
}) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [helpDialogVisible, setHelpDialogVisible] = useState<boolean>(false);
  const [helpContentMarkdown, setHelpContentMarkdown] = useState<string>('');
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const content = generateHelpContent(app, ctx.locale);
    setHelpContentMarkdown(content);
  }, [app, ctx.locale]);

  const showHelpMenu = useCallback(() => setHelpDialogVisible(true), []);

  const showSettingsMenu = useCallback(() => setSettingsVisible(true), []);

  const handleSettingsChange = useCallback((values: Record<string, any>) => {
    setSettingsValues(values);
    // You can also send these settings to the iframe app if needed
    console.log('Settings changed:', values);
  }, []);

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
      <AppHeader
        app={app}
        onShowSettings={showSettingsMenu}
        onShowHelp={showHelpMenu}
      />

      <iframe
        ref={ref}
        src={`/runners/${app.runnerTag}?appId=${app.appId}`}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-max b-none"
        style={{ height: 'calc(100vh - 4rem)' }}
      />

      <HelpDrawer
        visible={helpDialogVisible}
        onHide={() => setHelpDialogVisible(false)}
        helpContent={helpContentMarkdown}
        title={`${app.name} Help`}
      />

      {app.settings?.length > 0 && (
        <SettingsDrawer
          visible={true}
          onHide={() => setSettingsVisible(false)}
          settings={app.settings}
          onSettingsChange={handleSettingsChange}
          title={`${app.name} Settings`}
        />
      )}
    </div>
  );
};

const DEFAULT_APP_ID = 'card-games/black-jack';
// const DEFAULT_APP_ID = 'card-games/buck-euchre';

const LOCAL_STORAGE_KOSSABOS_APP_ID = 'kossabos-app-id';

const App: React.FC = () => {
  const [apps, setApps] = useState([]);
  const [appId, setAppId] = useState<string | null>(
    localStorage.getItem(LOCAL_STORAGE_KOSSABOS_APP_ID) || DEFAULT_APP_ID,
  );
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

  const updateAppId = useCallback((appId: string) => {
    setAppId(appId);
    localStorage.setItem(LOCAL_STORAGE_KOSSABOS_APP_ID, appId);
  }, []);

  return (
    <PrimeReactProvider>
      <div>
        {app && (
          <Player
            app={app}
            ctx={{ locale: Locale.EN_US }}
          />
        )}
        <AppSelector
          selectedAppId={appId}
          apps={apps}
          onAppChange={updateAppId}
        />
      </div>
    </PrimeReactProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
