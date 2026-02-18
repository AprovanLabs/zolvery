import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

declare global {
  interface Window {
    Peer?: new (id?: string, options?: object) => PeerInstance;
  }
}

interface DataConnection {
  on(
    event: 'data' | 'open' | 'close' | 'error',
    handler: (data?: unknown) => void,
  ): void;
  send(data: unknown): void;
  close(): void;
  peer: string;
}

interface PeerInstance {
  on(
    event: 'open' | 'connection' | 'error' | 'close' | 'disconnected',
    handler: (data?: unknown) => void,
  ): void;
  connect(
    peerId: string,
    options?: { reliable?: boolean; serialization?: string },
  ): DataConnection;
  destroy(): void;
  reconnect(): void;
  id: string;
  disconnected: boolean;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

type LobbyMessage =
  | { type: 'player-info'; player: LobbyPlayer }
  | { type: 'player-left'; playerId: string }
  | { type: 'start-game' };

interface UseP2PLobbyOptions {
  gameId: string;
  matchID: string;
  isHost: boolean;
  playerName?: string;
  enabled?: boolean;
  onGameStart?: () => void;
}

const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

async function loadPeerJS(): Promise<void> {
  if (window.Peer) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PEERJS_CDN;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PeerJS'));
    document.head.appendChild(script);
  });
}

export function useP2PLobby({
  gameId,
  matchID,
  isHost,
  playerName = 'Player',
  enabled = true,
  onGameStart,
}: UseP2PLobbyOptions) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isConnectedRef = useRef(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [lastIceState, setLastIceState] = useState<string | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [usingRelayOnly, setUsingRelayOnly] = useState(false);

  const peerRef = useRef<PeerInstance | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const onGameStartRef = useRef(onGameStart);
  const forceRelayOnly = import.meta.env.VITE_PEER_RELAY_ONLY === 'true';
  const relayFallbackTriedRef = useRef(false);
  const peerServerHost =
    import.meta.env.VITE_PEER_HOST || window.location.hostname;
  const peerServerPort = Number(import.meta.env.VITE_PEER_PORT) || 9500;
  const peerServerPath = import.meta.env.VITE_PEER_PATH || '/';
  const turnUrl = import.meta.env.VITE_PEER_TURN_URL;
  const turnUsername = import.meta.env.VITE_PEER_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_PEER_TURN_CREDENTIAL;
  const isSecure =
    import.meta.env.VITE_PEER_SECURE === 'true' ||
    (import.meta.env.VITE_PEER_SECURE === undefined &&
      window.location.protocol === 'https:');
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  const logEvent = useCallback((message: string) => {
    const stamped = `${new Date().toISOString()} ${message}`;
    setConnectionLog((prev) => [...prev.slice(-14), stamped]);
    console.log('[P2PLobby]', message);
  }, []);

  const updateIsConnected = useCallback((value: boolean) => {
    isConnectedRef.current = value;
    setIsConnected(value);
  }, []);

  // Keep onGameStart ref updated
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  }, [onGameStart]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // PeerJS IDs cannot contain slashes or other special characters
  const sanitizedGameId = gameId.replace(/[^a-zA-Z0-9-]/g, '-');
  const hostID = `lobby-${sanitizedGameId}-${matchID}`;

  // Memoize player ID to keep it stable across renders
  const myPlayerId = useMemo(
    () => (isHost ? 'host' : `player-${Date.now()}`),
    [isHost],
  );

  const myPlayer: LobbyPlayer = useMemo(
    () => ({
      id: myPlayerId,
      name: playerName,
      isHost,
      isReady: true,
    }),
    [myPlayerId, playerName, isHost],
  );

  const myPlayerRef = useRef(myPlayer);
  useEffect(() => {
    myPlayerRef.current = myPlayer;
  }, [myPlayer]);

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Broadcast message to all connected peers
  const broadcast = useCallback((message: LobbyMessage) => {
    connectionsRef.current.forEach((conn) => {
      try {
        conn.send(message);
      } catch (e) {
        console.error('[P2PLobby] Failed to send message:', e);
      }
    });
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: LobbyMessage, fromConnection?: DataConnection) => {
      switch (message.type) {
        case 'player-info': {
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === message.player.id);
            if (exists) {
              return prev.map((p) =>
                p.id === message.player.id ? message.player : p,
              );
            }
            return [...prev, message.player];
          });

          // If we're the host, send back our info and all current players
          if (isHost && fromConnection) {
            fromConnection.send({
              type: 'player-info',
              player: myPlayerRef.current,
            });
            // Also send all other connected players
            playersRef.current.forEach((p) => {
              if (p.id !== message.player.id) {
                fromConnection.send({ type: 'player-info', player: p });
              }
            });
          }
          break;
        }
        case 'player-left': {
          setPlayers((prev) => prev.filter((p) => p.id !== message.playerId));
          break;
        }
        case 'start-game': {
          onGameStartRef.current?.();
          break;
        }
      }
    },
    [isHost],
  );

  // Initialize peer connection
  useEffect(() => {
    if (!enabled) {
      setIsConnecting(false);
      return;
    }

    let mounted = true;
    let retryCount = 0;
    setConnectionLog([]);
    setPeerId(null);
    setLastIceState(null);

    const restartWithRelay = () => {
      if (forceRelayOnly || relayFallbackTriedRef.current || !mounted) return;
      relayFallbackTriedRef.current = true;
      setError('Retrying with relay-only connection...');
      updateIsConnected(false);
      logEvent('Retrying with relay-only connection');

      connectionsRef.current.forEach((c) => c.close());
      connectionsRef.current.clear();
      peerRef.current?.destroy();
      peerRef.current = null;

      setTimeout(() => {
        if (mounted) {
          retryCount = 0;
          init(true);
        }
      }, 100);
    };

    const handleIceStateChange = (state: unknown, role: 'host' | 'client') => {
      const asString = String(state);
      setLastIceState(asString);
      logEvent(`ICE state (${role}): ${asString}`);

      if (
        !isConnectedRef.current &&
        (asString === 'failed' ||
          asString === 'disconnected' ||
          asString === 'closed')
      ) {
        restartWithRelay();
      }
    };
    const createPeer = (useRelayOnly: boolean): Promise<PeerInstance> => {
      // Always offer STUN; include TURN when provided
      const iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
      if (turnUrl) {
        iceServers.push({
          urls: turnUrl,
          ...(turnUsername ? { username: turnUsername } : {}),
          ...(turnCredential ? { credential: turnCredential } : {}),
        });
      }

      const relayMode = useRelayOnly || forceRelayOnly;
      setUsingRelayOnly(relayMode);
      logEvent(
        `Creating peer (relay-only=${relayMode}, host=${peerServerHost}, port=${peerServerPort}, path=${peerServerPath}, iceServers=${iceServers.length})`,
      );

      return new Promise((resolve, reject) => {
        const peer = new window.Peer!(isHost ? hostID : undefined, {
          host: peerServerHost,
          port: peerServerPort,
          path: peerServerPath,
          secure: isSecure,
          debug: 1,
          config: {
            iceServers,
            ...(relayMode ? { iceTransportPolicy: 'relay' } : {}),
          },
        });

        const timeoutId = setTimeout(() => {
          peer.destroy();
          reject(new Error('Connection timeout'));
        }, 10000);

        peer.on('open', () => {
          clearTimeout(timeoutId);
          setPeerId(peer.id);
          logEvent(`Peer opened ${peer.id}`);
          resolve(peer);
        });

        peer.on('error', (err: unknown) => {
          clearTimeout(timeoutId);
          const error = err as Error & { type?: string };
          // Don't reject on peer-unavailable as that's a valid response when joining
          if (error.type !== 'peer-unavailable') {
            reject(error);
          }
        });
      });
    };

    const init = async (useRelayOnly: boolean) => {
      try {
        await loadPeerJS();

        if (!mounted || !window.Peer) return;

        let peer: PeerInstance | null = null;

        while (retryCount < MAX_RETRIES && mounted) {
          try {
            peer = await createPeer(useRelayOnly);
            break;
          } catch {
            retryCount++;
            logEvent(
              `Connection attempt ${retryCount} failed, ${
                retryCount < MAX_RETRIES ? 'retrying' : 'giving up'
              }`,
            );
            if (retryCount < MAX_RETRIES && mounted) {
              await new Promise((r) =>
                setTimeout(r, RETRY_DELAY_MS * retryCount),
              );
            }
          }
        }

        if (!peer || !mounted) {
          if (mounted) {
            setError('Failed to connect to signaling server');
            setIsConnecting(false);
          }
          logEvent('Failed to connect to signaling server');
          return;
        }

        peerRef.current = peer;
        logEvent(`Peer opened and ready: ${peer.id}`);
        setIsConnecting(false);

        if (isHost) {
          // Host is ready, add self to players
          setPlayers([myPlayerRef.current]);
          updateIsConnected(true);
          logEvent('Host ready and waiting for connections');
        } else {
          // Client connects to host
          logEvent(`Connecting to host ${hostID}`);
          const conn = peer.connect(hostID, {
            reliable: true,
            serialization: 'json',
          });

          conn.on('iceStateChanged', (state: unknown) => {
            handleIceStateChange(state, 'client');
          });

          // Fail if we cannot open the data channel in time
          const dataChannelTimeout = setTimeout(() => {
            if (!mounted) return;
            logEvent('Data channel open timed out');

            // Retry once with relay-only if not already forced
            if (!forceRelayOnly && !relayFallbackTriedRef.current) {
              restartWithRelay();
              return;
            }

            setError('Unable to establish a direct connection to the host');
            updateIsConnected(false);
            logEvent('Unable to establish a direct connection to the host');
          }, 20000);

          conn.on('open', () => {
            logEvent('Connected to host');
            if (!mounted) return;

            clearTimeout(dataChannelTimeout);

            connectionsRef.current.set(conn.peer, conn);
            updateIsConnected(true);

            // Ensure the joining client sees itself immediately
            setPlayers((prev) => {
              const exists = prev.some((p) => p.id === myPlayerRef.current.id);
              return exists ? prev : [...prev, myPlayerRef.current];
            });

            // Send our info to host
            conn.send({ type: 'player-info', player: myPlayerRef.current });
          });

          conn.on('data', (data) => {
            // Receiving any data implies the channel is up
            if (mounted) {
              updateIsConnected(true);
            }
            logEvent('Received data from host');
            handleMessage(data as LobbyMessage, conn);
          });

          conn.on('close', () => {
            logEvent('Connection to host closed');
            clearTimeout(dataChannelTimeout);
            connectionsRef.current.delete(conn.peer);
            if (mounted) {
              updateIsConnected(false);
              setError('Disconnected from host');
            }
          });

          conn.on('error', (err) => {
            logEvent(`Connection error: ${String(err)}`);
            clearTimeout(dataChannelTimeout);
            if (mounted) {
              setError('Failed to connect to host');
            }
          });
        }

        // Host listens for incoming connections
        if (isHost) {
          peer.on('connection', (conn: unknown) => {
            const dataConn = conn as DataConnection;
            logEvent(`Incoming connection from ${dataConn.peer}`);

            (
              dataConn as unknown as {
                on: (e: string, cb: (s: unknown) => void) => void;
              }
            ).on('iceStateChanged', (state: unknown) => {
              handleIceStateChange(state, 'host');
            });

            dataConn.on('open', () => {
              logEvent('Data connection opened');
              connectionsRef.current.set(dataConn.peer, dataConn);

              // Proactively send host + existing players so joiner knows we are ready
              try {
                dataConn.send({
                  type: 'player-info',
                  player: myPlayerRef.current,
                });
                playersRef.current.forEach((p) => {
                  if (!p.isHost) {
                    dataConn.send({ type: 'player-info', player: p });
                  }
                });
              } catch (e) {
                logEvent(
                  `Failed to send initial player info to joiner: ${String(e)}`,
                );
              }
            });

            dataConn.on('data', (data) => {
              handleMessage(data as LobbyMessage, dataConn);
            });

            dataConn.on('error', (err) => {
              logEvent(`Host data connection error: ${String(err)}`);
            });

            dataConn.on('close', () => {
              logEvent(`Connection closed: ${dataConn.peer}`);
              connectionsRef.current.delete(dataConn.peer);
              // Find and remove the player
              const connId = dataConn.peer;
              setPlayers((prev) => {
                const player = prev.find(
                  (p) => p.id.includes(connId) || !p.isHost,
                );
                if (player) {
                  broadcast({ type: 'player-left', playerId: player.id });
                }
                return prev.filter((p) => p.isHost); // Keep only host
              });
            });
          });
        }

        peer.on('disconnected', () => {
          logEvent(
            'Disconnected from signaling server, attempting to reconnect...',
          );
          if (!mounted) return;

          // Attempt to reconnect to the signaling server
          try {
            if (!peer.disconnected) return;
            peer.reconnect();
          } catch (e) {
            console.error('[P2PLobby] Failed to reconnect:', e);
            setError('Lost connection to server');
            updateIsConnected(false);
          }
        });

        peer.on('close', () => {
          logEvent('Peer connection closed');
          if (!mounted) return;
          updateIsConnected(false);
        });

        peer.on('error', (err: unknown) => {
          const error = err as Error & { type?: string };
          logEvent(
            `Peer error: ${error.type ?? 'unknown'} ${error.message ?? ''}`,
          );

          if (!mounted) return;

          if (error.type === 'peer-unavailable') {
            setError('Game not found. Is the host still waiting?');
          } else if (error.type === 'unavailable-id') {
            setError('A game with this code already exists');
          } else if (error.type === 'disconnected') {
            // Will be handled by 'disconnected' event
            return;
          } else if (error.type === 'network') {
            setError('Network error. Check your connection.');
          } else if (error.type === 'server-error') {
            setError('Server error. Please try again.');
          } else {
            setError(error.message || 'Connection error');
          }
          setIsConnecting(false);
        });
      } catch (err) {
        console.error('[P2PLobby] Init error:', err);
        logEvent(`Init error: ${String(err)}`);
        if (mounted) {
          setError('Failed to initialize connection');
          setIsConnecting(false);
        }
      }
    };

    init(forceRelayOnly);

    return () => {
      mounted = false;
      connectionsRef.current.forEach((conn) => conn.close());
      connectionsRef.current.clear();
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [enabled, isHost, hostID, handleMessage, broadcast, logEvent]);

  // Start the game (host only)
  const startGame = useCallback(() => {
    if (!isHost) return;

    // Broadcast start message to all players
    broadcast({ type: 'start-game' });

    // Trigger local start
    onGameStartRef.current?.();
  }, [isHost, broadcast]);

  return {
    isConnecting,
    isConnected,
    players,
    error,
    startGame,
    debug: {
      peerId,
      hostId: hostID,
      lastIceState,
      usingRelayOnly,
      log: connectionLog,
    },
  };
}
