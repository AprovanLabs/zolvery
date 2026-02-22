import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PencilIcon } from '@heroicons/react/24/outline';
import { EditableWidgetPlayer } from './src/components/editable-widget-player';
import { useWidgetSource } from './src/hooks/use-widget-source';
import { useGamesCatalog, type GameEntry } from './src/hooks/use-games-catalog';
import { GameCatalog } from './src/components/game-catalog';
import { GameSetup, type GameConfig } from './src/components/game-setup';
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

// Detect mobile (Capacitor) environment
const isMobileApp = (): boolean => {
  // Check for Capacitor's custom schemes or if window.Capacitor exists
  const protocol = window.location.protocol;
  return (
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    (typeof (window as { Capacitor?: unknown }).Capacitor !== 'undefined')
  );
};

// Share PeerJS settings between the lobby and boardgame transport
// On mobile, default to the public PeerJS server if not configured
const peerHost = import.meta.env.VITE_PEER_HOST || (isMobileApp() ? '0.peerjs.com' : window.location.hostname);
const peerPort = Number(import.meta.env.VITE_PEER_PORT) || (isMobileApp() ? 443 : 9500);
const peerPath = import.meta.env.VITE_PEER_PATH || '/';
const peerSecure =
  import.meta.env.VITE_PEER_SECURE === 'true' ||
  (import.meta.env.VITE_PEER_SECURE === undefined &&
    (isMobileApp() || window.location.protocol === 'https:'));
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

type ParsedRoute =
  | { type: 'catalog' }
  | { type: 'game'; gameId: string }
  | { type: 'host'; gameId: string; matchCode: string }
  | { type: 'join'; gameId: string; matchCode: string }
  | { type: 'play'; gameId: string; matchCode: string; playerID: string; isHost: boolean };

function parseHashRoute(): ParsedRoute {
  const hash = window.location.hash;
  
  // Play route (active game): #/apps/{gameId}/play/{code}/{playerID}/{host|client}
  const playMatch = hash.match(/^#\/apps\/(.+)\/play\/([A-Z0-9]+)\/(\d+)\/(host|client)$/i);
  if (playMatch) {
    return {
      type: 'play',
      gameId: playMatch[1],
      matchCode: playMatch[2].toUpperCase(),
      playerID: playMatch[3],
      isHost: playMatch[4].toLowerCase() === 'host',
    };
  }
  
  // Host lobby route: #/apps/{gameId}/host/{code}
  const hostMatch = hash.match(/^#\/apps\/(.+)\/host\/([A-Z0-9]+)$/i);
  if (hostMatch) {
    return { type: 'host', gameId: hostMatch[1], matchCode: hostMatch[2].toUpperCase() };
  }
  
  // Join route: #/apps/{gameId}/join/{code}
  const joinMatch = hash.match(/^#\/apps\/(.+)\/join\/([A-Z0-9]+)$/i);
  if (joinMatch) {
    return { type: 'join', gameId: joinMatch[1], matchCode: joinMatch[2].toUpperCase() };
  }
  
  // Game route: #/apps/{gameId}
  const gameMatch = hash.match(/^#\/apps\/(.+?)(?:\/)?$/);
  if (gameMatch) {
    return { type: 'game', gameId: gameMatch[1] };
  }
  
  // Fallback to pathname-based route for join (works with server-side routing or 404.html redirect)
  const pathMatch = window.location.pathname.match(/^\/apps\/(.+)\/join\/([A-Z0-9]+)$/i);
  if (pathMatch) {
    return { type: 'join', gameId: pathMatch[1], matchCode: pathMatch[2].toUpperCase() };
  }
  
  return { type: 'catalog' };
}

function setHashRoute(route: ParsedRoute): void {
  let hash = '';
  if (route.type === 'game') {
    hash = `#/apps/${route.gameId}`;
  } else if (route.type === 'host') {
    hash = `#/apps/${route.gameId}/host/${route.matchCode}`;
  } else if (route.type === 'join') {
    hash = `#/apps/${route.gameId}/join/${route.matchCode}`;
  } else if (route.type === 'play') {
    hash = `#/apps/${route.gameId}/play/${route.matchCode}/${route.playerID}/${route.isHost ? 'host' : 'client'}`;
  }
  
  if (window.location.hash !== hash) {
    window.history.pushState({}, '', hash || '/');
  }
}

function getSessionStorageKey(matchCode: string): string {
  return `zolvery-session-${matchCode}`;
}

function saveSessionCredentials(matchCode: string, credentials: string): void {
  try {
    localStorage.setItem(getSessionStorageKey(matchCode), credentials);
  } catch {
    // localStorage might be unavailable
  }
}

function loadSessionCredentials(matchCode: string): string | null {
  try {
    return localStorage.getItem(getSessionStorageKey(matchCode));
  } catch {
    return null;
  }
}

function clearSessionCredentials(matchCode: string): void {
  try {
    localStorage.removeItem(getSessionStorageKey(matchCode));
  } catch {
    // ignore
  }
}

function App() {
  const [state, setState] = useState<AppState>({ view: 'catalog' });
  const [isEditing, setIsEditing] = useState(false);
  const { categories, isLoading: catalogLoading } = useGamesCatalog();

  // Find a game by appId across all categories
  const findGame = useCallback((gameId: string): GameEntry | undefined => {
    for (const category of categories) {
      const game = category.games.find(g => g.appId === gameId);
      if (game) return game;
    }
    return undefined;
  }, [categories]);

  // Apply a parsed route to app state
  const applyRoute = useCallback((route: ParsedRoute) => {
    if (route.type === 'catalog') {
      setState({ view: 'catalog' });
    } else if (route.type === 'game') {
      const game = findGame(route.gameId);
      if (game) {
        setState({ view: 'setup', game });
      } else {
        setState({ view: 'catalog' });
      }
    } else if (route.type === 'host') {
      const game = findGame(route.gameId);
      if (game) {
        setState({
          view: 'lobby',
          config: {
            game,
            playMode: 'host',
            playerCount: 2,
            botCount: 0,
            settings: {},
          },
          mode: 'host',
          joinCode: route.matchCode, // Pass the code so lobby can restore it
        });
      } else {
        setState({ view: 'catalog' });
      }
    } else if (route.type === 'join') {
      const game = findGame(route.gameId);
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
          joinCode: route.matchCode,
        });
      } else {
        setState({ view: 'catalog' });
      }
    } else if (route.type === 'play') {
      const game = findGame(route.gameId);
      if (game) {
        // Load saved credentials for reconnection
        const savedCredentials = loadSessionCredentials(route.matchCode);
        // Reconnect directly to an active game
        setState({
          view: 'playing',
          config: {
            game,
            playMode: route.isHost ? 'host' : 'join',
            playerCount: 2,
            botCount: 0,
            settings: {},
          },
          lobbyConfig: {
            matchID: route.matchCode,
            playerID: route.playerID,
            credentials: savedCredentials || '', // Use saved or let transport regenerate
            isHost: route.isHost,
          },
        });
      } else {
        setState({ view: 'catalog' });
      }
    }
  }, [findGame]);

  // Handle route changes (initial load + hashchange)
  useEffect(() => {
    if (categories.length === 0) return;

    const handleRouteChange = () => {
      const route = parseHashRoute();
      applyRoute(route);
    };

    // Apply initial route
    handleRouteChange();

    // Listen for hash changes (back/forward, manual URL edits)
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [categories, applyRoute]);

  const appId = state.view === 'setup' 
    ? state.game.appId 
    : state.view === 'lobby' 
      ? state.config.game.appId 
      : state.view === 'playing' 
        ? state.config.game.appId 
        : null;

  const { manifest, source, isLoading: sourceLoading } = useWidgetSource(appId);

  const handleSelectGame = useCallback((game: GameEntry) => {
    setHashRoute({ type: 'game', gameId: game.appId });
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
      // Save credentials for reconnection
      if (lobbyConfig.credentials) {
        saveSessionCredentials(lobbyConfig.matchID, lobbyConfig.credentials);
      }
      // Update URL to allow reconnection on refresh
      setHashRoute({
        type: 'play',
        gameId: state.config.game.appId,
        matchCode: lobbyConfig.matchID,
        playerID: lobbyConfig.playerID,
        isHost: lobbyConfig.isHost,
      });
      setState({ view: 'playing', config: state.config, lobbyConfig });
    },
    [state],
  );

  const handleBack = useCallback(() => {
    if (state.view === 'setup') {
      setHashRoute({ type: 'catalog' });
      setState({ view: 'catalog' });
    } else if (state.view === 'lobby') {
      setHashRoute({ type: 'game', gameId: state.config.game.appId });
      setState({ view: 'setup', game: state.config.game });
    } else if (state.view === 'playing') {
      // Clear saved credentials when intentionally leaving a game
      if (state.lobbyConfig?.matchID) {
        clearSessionCredentials(state.lobbyConfig.matchID);
      }
      setHashRoute({ type: 'catalog' });
      setState({ view: 'catalog' });
    }
  }, [state]);

  // Handle when host generates a match code - update URL so refresh preserves it
  const handleCodeGenerated = useCallback((code: string) => {
    if (state.view !== 'lobby') return;
    setHashRoute({
      type: 'host',
      gameId: state.config.game.appId,
      matchCode: code,
    });
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
          onCodeGenerated={handleCodeGenerated}
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
