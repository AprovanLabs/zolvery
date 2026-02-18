import type {
  ChatMessage,
  CredentialedActionShape,
  Game,
  State,
} from 'boardgame.io';
import { generateKeyPair, signMessage } from './authentication.js';
import { P2PHost } from './host.js';
import type { ClientAction, ClientMetadata } from './types.js';

declare global {
  interface Window {
    Peer?: new (id?: string, options?: object) => PeerInstance;
    __peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
      secure?: boolean;
      iceServers?: RTCIceServer[];
    };
  }
}

interface DataConnection {
  on(
    event: 'data' | 'open' | 'close' | 'error',
    handler: (data?: unknown) => void,
  ): void;
  send(data: unknown): void;
  close(): void;
}

interface PeerInstance {
  on(
    event: 'open' | 'connection' | 'error' | 'close',
    handler: (data?: unknown) => void,
  ): void;
  connect(
    peerId: string,
    options?: { reliable?: boolean; serialization?: string },
  ): DataConnection;
  destroy(): void;
  id: string;
}

type TransportData = {
  type: 'sync' | 'update' | 'chat';
  args: unknown[];
};

export interface P2PTransportOpts {
  isHost?: boolean;
  peerOptions?: object;
  onError?: (error: Error) => void;
}

// Default ICE servers for NAT traversal
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Free TURN servers from Open Relay Project
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export interface TransportConfig {
  gameName: string;
  playerID: string | null;
  matchID: string;
  credentials?: string;
  numPlayers: number;
  game: Game;
  transportDataCallback: (data: TransportData) => void;
}

export class P2PTransport {
  private peer: PeerInstance | null = null;
  private connection: DataConnection | null = null;
  private host: P2PHost | null = null;
  private isHost: boolean;
  private game: Game;
  private gameName: string;
  private playerID: string | null;
  private matchID: string;
  private credentials?: string;
  private numPlayers: number;
  private privateKey?: string;
  private transportDataCallback: (data: TransportData) => void;
  private peerOptions?: object;
  private onError?: (error: Error) => void;
  private connected = false;
  private connectionStatusCallbacks: Set<(connected: boolean) => void> =
    new Set();

  public constructor(config: TransportConfig, opts: P2PTransportOpts = {}) {
    console.log('[P2PTransport] Constructor called with config:', {
      gameName: config.gameName,
      playerID: config.playerID,
      matchID: config.matchID,
      numPlayers: config.numPlayers,
      credentials: config.credentials ? '(present)' : '(none)',
    });
    console.log('[P2PTransport] Options:', {
      isHost: opts.isHost,
    });

    this.gameName = config.gameName;
    this.playerID = config.playerID;
    this.matchID = config.matchID;
    this.numPlayers = config.numPlayers;
    this.game = config.game;
    this.transportDataCallback = config.transportDataCallback;
    this.isHost = opts.isHost ?? false;
    this.peerOptions = opts.peerOptions;
    this.onError = opts.onError;
    this.setCredentials(config.credentials);
  }

  private get hostID(): string {
    return `boardgameio-${this.gameName}-matchid-${this.matchID}`;
  }

  private setCredentials(credentials?: string): void {
    if (!credentials) {
      const { publicKey, privateKey } = generateKeyPair();
      this.credentials = publicKey;
      this.privateKey = privateKey;
    } else {
      this.credentials = credentials;
    }
  }

  private get metadata(): ClientMetadata {
    return {
      playerID: this.playerID,
      credentials: this.credentials,
      message:
        this.privateKey && this.playerID
          ? signMessage(this.playerID, this.privateKey)
          : undefined,
    };
  }

  public connect(): void {
    const Peer = window.Peer;
    if (!Peer) {
      this.onError?.(new Error('PeerJS not loaded'));
      return;
    }

    const globalPeerConfig = window.__peerConfig ?? {};
    const iceServers =
      globalPeerConfig.iceServers && globalPeerConfig.iceServers.length > 0
        ? globalPeerConfig.iceServers
        : DEFAULT_ICE_SERVERS;

    // Merge default ICE servers with any user-provided options
    const baseConfig = {
      host: globalPeerConfig.host,
      port: globalPeerConfig.port,
      path: globalPeerConfig.path,
      secure: globalPeerConfig.secure,
      debug: 2, // Warnings and errors
      config: {
        iceServers,
      },
    };

    const peerConfig = {
      ...baseConfig,
      ...this.peerOptions,
      config: {
        ...baseConfig.config,
        ...(this.peerOptions && (this.peerOptions as { config?: object }).config
          ? (this.peerOptions as { config?: object }).config
          : {}),
      },
    };

    console.log(
      `[P2PTransport] Connecting as ${
        this.isHost ? 'HOST' : 'CLIENT'
      }, hostID: ${this.hostID}`,
    );

    this.peer = new Peer(this.isHost ? this.hostID : undefined, peerConfig);

    this.peer.on('open', (id) => {
      console.log(`[P2PTransport] Peer opened with ID: ${id}`);
      if (this.isHost) {
        this.host = new P2PHost({
          game: this.game,
          numPlayers: this.numPlayers,
          matchID: this.matchID,
        });

        this.host.registerHostClient({
          metadata: this.metadata,
          send: (data) => this.notifyClient(data as TransportData),
        });
        // Host is ready immediately
        console.log('[P2PTransport] Host ready, waiting for connections');
        this.onConnect();
      } else {
        // Non-host connects to the host peer
        console.log(`[P2PTransport] Client connecting to host: ${this.hostID}`);
        this.connectToHost();
        // onConnect() will be called when data connection opens
      }
    });

    this.peer.on('connection', (conn) => {
      console.log(
        '[P2PTransport] Incoming connection from:',
        (conn as DataConnection & { peer?: string }).peer,
      );
      const dataConn = conn as DataConnection;
      if (!this.host) return;

      const client = {
        metadata: { playerID: null } as ClientMetadata,
        send: (data: unknown) => dataConn.send(data),
      };

      dataConn.on('open', () => {
        console.log('[P2PTransport] Data connection opened');
        this.host?.registerClient(client);
      });

      dataConn.on('data', (data) => {
        const action = data as ClientAction;
        if (action.type === 'sync' && 'metadata' in (data as object)) {
          client.metadata = (data as { metadata: ClientMetadata }).metadata;
        }
        this.host?.processAction(client, action);
      });

      dataConn.on('close', () => {
        this.host?.unregisterClient(client);
      });
    });

    this.peer.on('error', (err) => {
      const error = err as Error & { type?: string };
      console.error('[P2PTransport] Peer error:', error.type, error.message);

      // Handle specific PeerJS error types
      if (error.type === 'peer-unavailable') {
        console.error(
          '[P2PTransport] Host peer not found. Is the host connected?',
        );
      } else if (error.type === 'unavailable-id') {
        console.error('[P2PTransport] Peer ID already taken');
      }

      this.onError?.(error);
    });

    this.peer.on('close', () => {
      console.log('[P2PTransport] Peer connection closed');
      this.connected = false;
      this.notifyConnectionStatus(false);
    });
  }

  private retryCount = 0;
  private maxRetries = 3;

  private connectToHost(): void {
    if (!this.peer) return;

    console.log(
      `[P2PTransport] Attempting connection to host (attempt ${
        this.retryCount + 1
      }/${this.maxRetries + 1})`,
    );

    // Connect with reliable data channel
    this.connection = this.peer.connect(this.hostID, {
      reliable: true,
      serialization: 'json',
    });

    // Connection timeout - retry if not connected within 10 seconds
    const connectionTimeout = setTimeout(() => {
      if (!this.connected && this.connection) {
        this.retryCount++;
        if (this.retryCount <= this.maxRetries) {
          console.warn(
            `[P2PTransport] Connection timeout, retrying (${this.retryCount}/${this.maxRetries})...`,
          );
          this.connection.close();
          this.connectToHost();
        } else {
          console.error(
            '[P2PTransport] Max retries reached. Could not connect to host.',
          );
          this.onError?.(
            new Error(
              'Could not connect to host after multiple attempts. Is the host online?',
            ),
          );
        }
      }
    }, 10000);

    this.connection.on('open', () => {
      clearTimeout(connectionTimeout);
      console.log('[P2PTransport] Connected to host successfully!');
      this.retryCount = 0;
      this.connection?.send({ type: 'sync', metadata: this.metadata });
      // Now we're actually connected to the host
      this.onConnect();
    });

    this.connection.on('data', (data) => {
      this.notifyClient(data as TransportData);
    });

    this.connection.on('close', () => {
      clearTimeout(connectionTimeout);
      console.log('[P2PTransport] Connection to host closed');
      this.connected = false;
      this.notifyConnectionStatus(false);
    });

    this.connection.on('error', (err) => {
      clearTimeout(connectionTimeout);
      const error = err as Error & { type?: string };
      console.error(
        '[P2PTransport] Connection error:',
        error.type,
        error.message,
      );
      this.onError?.(error);
    });
  }

  private onConnect(): void {
    this.connected = true;
    this.notifyConnectionStatus(true);
    this.requestSync();
  }

  private notifyConnectionStatus(connected: boolean): void {
    for (const callback of this.connectionStatusCallbacks) {
      callback(connected);
    }
  }

  private notifyClient(data: TransportData): void {
    this.transportDataCallback(data);
  }

  public disconnect(): void {
    this.connection?.close();
    this.peer?.destroy();
    this.peer = null;
    this.connection = null;
    this.host = null;
    this.connected = false;
    this.notifyConnectionStatus(false);
  }

  public requestSync(): void {
    if (this.isHost && this.host) {
      this.host.processAction(
        {
          metadata: this.metadata,
          send: (d) => this.notifyClient(d as TransportData),
        },
        { type: 'sync' },
      );
    } else {
      this.connection?.send({ type: 'sync', metadata: this.metadata });
    }
  }

  public sendAction(state: State, action: CredentialedActionShape.Any): void {
    const msg: ClientAction = {
      type: 'update',
      args: [this.matchID, state, action],
    };
    if (this.isHost && this.host) {
      this.host.processAction(
        {
          metadata: this.metadata,
          send: (d) => this.notifyClient(d as TransportData),
        },
        msg,
      );
    } else {
      this.connection?.send(msg);
    }
  }

  public sendChatMessage(matchID: string, chatMessage: ChatMessage): void {
    const msg: ClientAction = {
      type: 'chat',
      args: [matchID, chatMessage, this.credentials],
    };
    if (this.isHost && this.host) {
      this.host.processAction(
        {
          metadata: this.metadata,
          send: (d) => this.notifyClient(d as TransportData),
        },
        msg,
      );
    } else {
      this.connection?.send(msg);
    }
  }

  public updateMatchID(id: string): void {
    this.matchID = id;
    this.disconnect();
    this.connect();
  }

  public updatePlayerID(id: string): void {
    this.playerID = id;
    this.disconnect();
    this.connect();
  }

  public updateCredentials(credentials?: string): void {
    this.setCredentials(credentials);
    this.disconnect();
    this.connect();
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public subscribeToConnectionStatus(
    callback: (connected: boolean) => void,
  ): () => void {
    this.connectionStatusCallbacks.add(callback);
    // Immediately notify current status
    callback(this.connected);
    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }
}

export function createP2PTransport(opts: P2PTransportOpts = {}) {
  return (config: TransportConfig) => new P2PTransport(config, opts);
}
