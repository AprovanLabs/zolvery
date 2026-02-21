import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PencilIcon } from '@heroicons/react/24/outline';
import { EditableWidgetPlayer } from './src/components/editable-widget-player';
import { useWidgetSource } from './src/hooks/use-widget-source';
import { useGamesCatalog, type GameEntry } from './src/hooks/use-games-catalog';
import { GameCatalog } from './src/components/game-catalog';
import { GameSetup, type GameConfig, type PlayMode } from './src/components/game-setup';
import { GameLobby, type GameLobbyConfig } from './src/components/game-lobby';

import './style.css';

declare global {
  interface Window {
    __peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
      secure?: boolean;
      iceServers?: RTCIceServer[];
    };
  }
}

// Share PeerJS settings between the lobby and boardgame transport
const peerHost = import.meta.env.VITE_PEER_HOST || window.location.hostname;
const peerPort = Number(import.meta.env.VITE_PEER_PORT) || 9500;
const peerPath = import.meta.env.VITE_PEER_PATH || '/';
const peerSecure =
  import.meta.env.VITE_PEER_SECURE === 'true' ||
  (import.meta.env.VITE_PEER_SECURE === undefined &&
    window.location.protocol === 'https:');
const turnUrl = import.meta.env.VITE_PEER_TURN_URL;
const turnUsername = import.meta.env.VITE_PEER_TURN_USERNAME;
const turnCredential = import.meta.env.VITE_PEER_TURN_CREDENTIAL;

const globalIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

if (turnUrl) {
  globalIceServers.push({
    urls: turnUrl,
    ...(turnUsername ? { username: turnUsername } : {}),
    ...(turnCredential ? { credential: turnCredential } : {}),
  });
}

window.__peerConfig = {
  host: peerHost,
  port: peerPort,
  path: peerPath,
  secure: peerSecure,
  iceServers: globalIceServers,
};

type AppState =
  | { view: 'catalog' }
  | { view: 'setup'; game: GameEntry }
  | { view: 'lobby'; config: GameConfig; mode: 'host' | 'join'; joinCode?: string }
  | { view: 'playing'; config: GameConfig; lobbyConfig?: GameLobbyConfig };

function parseJoinUrl(): { gameId: string; matchCode: string } | null {
  // Check hash-based route first (preferred for static hosting)
  const hashMatch = window.location.hash.match(/^#\/apps\/(.+)\/join\/([A-Z0-9]+)$/i);
  if (hashMatch) {
    return { gameId: hashMatch[1], matchCode: hashMatch[2].toUpperCase() };
  }
  // Fallback to pathname-based route (works with server-side routing or 404.html redirect)
  const pathMatch = window.location.pathname.match(/^\/apps\/(.+)\/join\/([A-Z0-9]+)$/i);
  if (pathMatch) {
    return { gameId: pathMatch[1], matchCode: pathMatch[2].toUpperCase() };
  }
  return null;
}

function App() {
  const [state, setState] = useState<AppState>({ view: 'catalog' });
  const [isEditing, setIsEditing] = useState(false);
  const { categories, isLoading: catalogLoading } = useGamesCatalog();

  // Handle join URLs on mount
  useEffect(() => {
    const joinInfo = parseJoinUrl();
    if (joinInfo && categories.length > 0) {
      // Find the game in categories
      for (const category of categories) {
        const game = category.games.find(g => g.appId === joinInfo.gameId);
        if (game) {
          setState({
            view: 'lobby',
            config: {
              game,
              playMode: 'join',
              playerCount: 2,
              botCount: 0,
              settings: {},
            },
            mode: 'join',
            joinCode: joinInfo.matchCode,
          });
          // Clear the URL to avoid re-triggering
          window.history.replaceState({}, '', '/');
          break;
        }
      }
    }
  }, [categories]);

  const appId = state.view === 'setup' 
    ? state.game.appId 
    : state.view === 'lobby' 
      ? state.config.game.appId 
      : state.view === 'playing' 
        ? state.config.game.appId 
        : null;

  const { manifest, source, isLoading: sourceLoading } = useWidgetSource(appId);

  const handleSelectGame = useCallback((game: GameEntry) => {
    setState({ view: 'setup', game });
  }, []);

  const handleStartGame = useCallback((config: GameConfig) => {
    if (config.playMode === 'host' || config.playMode === 'join') {
      setState({ view: 'lobby', config, mode: config.playMode });
    } else {
      setState({ view: 'playing', config });
    }
  }, []);

  const handleLobbyStart = useCallback(
    (lobbyConfig: GameLobbyConfig) => {
      if (state.view !== 'lobby') return;
      setState({ view: 'playing', config: state.config, lobbyConfig });
    },
    [state],
  );

  const handleBack = useCallback(() => {
    if (state.view === 'setup') {
      setState({ view: 'catalog' });
    } else if (state.view === 'lobby') {
      setState({ view: 'setup', game: state.config.game });
    } else if (state.view === 'playing') {
      setState({ view: 'catalog' });
    }
  }, [state]);

  // Catalog view
  if (state.view === 'catalog') {
    return (
      <div className="h-screen bg-slate-50">
        <GameCatalog
          categories={categories}
          isLoading={catalogLoading}
          onSelectGame={handleSelectGame}
        />
      </div>
    );
  }

  // Setup view
  if (state.view === 'setup') {
    return (
      <div className="h-screen bg-slate-50">
        <GameSetup
          game={state.game}
          onStart={handleStartGame}
          onBack={handleBack}
        />
      </div>
    );
  }

  // Lobby view
  if (state.view === 'lobby') {
    return (
      <div className="h-screen bg-slate-50">
        <GameLobby
          gameId={state.config.game.appId}
          initialMode={state.mode}
          initialCode={state.joinCode}
          onStart={handleLobbyStart}
          onCancel={handleBack}
        />
      </div>
    );
  }

  // Playing view
  const isLoading = sourceLoading;

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <button
          onClick={handleBack}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Games
        </button>
        <span className="text-sm font-medium text-slate-900">
          {state.config.game.name ?? state.config.game.appId}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <PencilIcon className="h-4 w-4" />
          Edit
        </button>
      </header>

      <main className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-slate-400">Loading...</span>
          </div>
        )}

        {manifest && source && !isLoading && (
          <EditableWidgetPlayer
            appId={state.config.game.appId}
            manifest={manifest}
            source={source}
            inputs={{
              ...state.config.settings,
              numPlayers: state.config.playerCount,
              ...(state.lobbyConfig && {
                multiplayer: {
                  matchID: state.lobbyConfig.matchID,
                  playerID: state.lobbyConfig.playerID,
                  credentials: state.lobbyConfig.credentials,
                  isHost: state.lobbyConfig.isHost,
                },
              }),
            }}
            className="w-full h-full"
            editable
            isEditing={isEditing}
            onEditingChange={setIsEditing}
          />
        )}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
