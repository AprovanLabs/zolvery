import type {
  ChatMessage,
  CredentialedActionShape,
  Game,
  Server,
  State,
} from 'boardgame.io';
import { P2PDB } from './db.js';
import { authenticate } from './authentication.js';
import type { Client, ClientAction } from './types.js';
import {
  loadSession,
  saveSession,
  updateSessionState,
  type PersistedSession,
} from './session-storage.js';

type UpdateArgs = [string, State, CredentialedActionShape.Any];
type ChatArgs = [string, ChatMessage, string | undefined];

export class P2PHost {
  private clients = new Map<Client, Client>();
  private hostClient: Client | null = null;
  private matchID: string;
  private db: P2PDB;
  private game: Game;
  private numPlayers: number;
  private state: State;

  public constructor({
    game,
    numPlayers = 2,
    matchID,
  }: {
    game: Game;
    numPlayers?: number;
    matchID: string;
  }) {
    this.matchID = matchID;
    this.game = game;
    this.numPlayers = numPlayers;
    this.db = new P2PDB();

    // Try to restore from a previous session
    const gameName = game.name ?? 'unknown';
    console.log('[P2PHost] Checking for existing session:', { matchID, gameName });
    
    const existingSession = loadSession(matchID);
    if (existingSession) {
      console.log('[P2PHost] Found existing session:', {
        matchID,
        sessionGameName: existingSession.gameName,
        expectedGameName: gameName,
        stateID: existingSession.state._stateID,
      });
      
      if (existingSession.gameName === gameName) {
        console.log('[P2PHost] Restoring session from storage');

        this.state = existingSession.state;
        this.db.createMatch(matchID, {
          initialState: existingSession.initialState,
          metadata: existingSession.metadata,
        });
        this.db.setState(matchID, existingSession.state, existingSession.log);
        
        // Refresh the session timestamp to prevent expiry
        saveSession(existingSession);
        return;
      } else {
        console.log('[P2PHost] Game name mismatch, creating new session');
      }
    } else {
      console.log('[P2PHost] No existing session found, creating new');
    }

    // Create fresh state for new session
    const initialState = this.createInitialState();
    this.state = initialState;

    const players: Record<number, Server.PlayerMetadata> = {};
    for (let i = 0; i < numPlayers; i++) {
      players[i] = { id: i };
    }

    const metadata: Server.MatchData = {
      gameName: game.name ?? 'unknown',
      players,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.db.createMatch(matchID, {
      initialState,
      metadata,
    });

    // Persist the new session
    this.persistSession(initialState, [], metadata);
  }

  private persistSession(
    state: State,
    log: unknown[],
    metadata?: Server.MatchData,
  ): void {
    const existingSession = loadSession(this.matchID);
    const session: PersistedSession = {
      matchID: this.matchID,
      gameName: this.game.name ?? 'unknown',
      numPlayers: this.numPlayers,
      state,
      initialState: existingSession?.initialState ?? state,
      log: log as PersistedSession['log'],
      metadata: metadata ?? existingSession?.metadata ?? {
        gameName: this.game.name ?? 'unknown',
        players: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      createdAt: existingSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    saveSession(session);
  }

  private createInitialState(): State {
    // Mark all players as active in Stage.NULL ('') so they can all make moves
    const activePlayers: Record<string, string> = {};
    for (let i = 0; i < this.numPlayers; i++) {
      activePlayers[String(i)] = '';
    }

    const ctx = {
      numPlayers: this.numPlayers,
      turn: 1,
      currentPlayer: '0',
      playOrder: Array.from({ length: this.numPlayers }, (_, i) => String(i)),
      playOrderPos: 0,
      phase: '',
      activePlayers,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = this.game.setup?.({ ctx, ...ctx } as any) ?? {};

    return {
      G,
      ctx,
      plugins: {},
      _stateID: 0,
      _undo: [],
      _redo: [],
    } as State;
  }

  public registerClient(client: Client): void {
    if (!authenticate(this.matchID, client.metadata, this.db)) {
      console.log(
        '[P2PHost] Client auth failed for playerID:',
        client.metadata.playerID,
      );
      return;
    }

    console.log(
      '[P2PHost] Registered client for playerID:',
      client.metadata.playerID,
    );
    this.clients.set(client, client);
    this.syncClient(client);
  }

  public registerHostClient(client: Client): void {
    // Host client is always trusted, skip auth
    console.log(
      '[P2PHost] Registered host client for playerID:',
      client.metadata.playerID,
    );
    this.hostClient = client;
    this.syncClient(client);
  }

  public unregisterClient(client: Client): void {
    this.clients.delete(client);
  }

  public processAction(client: Client, data: ClientAction): void {
    switch (data.type) {
      case 'sync':
        this.syncClient(client);
        break;
      case 'update':
        this.handleUpdate(data.args as UpdateArgs);
        break;
      case 'chat':
        this.broadcastChat(data.args as ChatArgs);
        break;
    }
  }

  private syncClient(client: Client): void {
    const { state, log } = this.db.fetch(this.matchID);
    const playerID = client.metadata.playerID;
    const filteredState = this.filterStateForPlayer(state, playerID);
    client.send({
      type: 'sync',
      args: [this.matchID, { state: filteredState, log }],
    });
  }

  private filterStateForPlayer(
    state: State | undefined,
    _playerID: string | null,
  ): State | undefined {
    return state;
  }

  private handleUpdate([matchID, , action]: UpdateArgs): void {
    if (matchID !== this.matchID) return;

    const currentState = this.state;
    if (!currentState) return;

    const moveName = action.payload?.type;
    const moveArgs = action.payload?.args ?? [];
    const playerID = action.payload?.playerID;

    // Determine current player from either ctx.currentPlayer or G.current
    const ctxCurrentPlayer = currentState.ctx.currentPlayer;
    const gCurrent = (currentState.G as { current?: number })?.current;
    const currentPlayer = gCurrent !== undefined ? String(gCurrent) : ctxCurrentPlayer;

    console.log('[P2PHost] handleUpdate:', { moveName, moveArgs, playerID, currentPlayer });

    // Validate that the player making the move is the current player
    if (playerID !== currentPlayer) {
      console.log('[P2PHost] Rejected move: wrong player', { playerID, currentPlayer });
      return;
    }

    if (moveName && this.game.moves?.[moveName]) {
      const move = this.game.moves[moveName];
      const ctx = { ...currentState.ctx, playerID };
      // Deep clone G to avoid frozen state issues
      const G = JSON.parse(JSON.stringify(currentState.G));

      console.log(
        '[P2PHost] Before move, G.players:',
        G.players?.map((p: { id: number; bet: number }) => ({
          id: p.id,
          bet: p.bet,
        })),
      );

      if (typeof move === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        move({ G, ctx } as any, ...moveArgs);
      }

      console.log(
        '[P2PHost] After move, G.players:',
        G.players?.map((p: { id: number; bet: number }) => ({
          id: p.id,
          bet: p.bet,
        })),
      );

      const newState: State = {
        ...currentState,
        G,
        _stateID: currentState._stateID + 1,
      };

      this.state = newState;
      this.db.setState(this.matchID, newState);
      
      // Persist state to localStorage for host reconnection
      const { log } = this.db.fetch(this.matchID);
      updateSessionState(this.matchID, newState, log);
      
      console.log(
        '[P2PHost] State updated, broadcasting to',
        this.clients.size,
        'clients',
      );
      this.broadcastState();
    } else {
      console.log(
        '[P2PHost] Move not found:',
        moveName,
        'Available:',
        Object.keys(this.game.moves || {}),
      );
    }
  }

  private broadcastState(): void {
    const { state, log } = this.db.fetch(this.matchID);

    // Notify host client first
    if (this.hostClient) {
      const playerID = this.hostClient.metadata.playerID;
      const filteredState = this.filterStateForPlayer(state, playerID);
      this.hostClient.send({
        type: 'sync',
        args: [this.matchID, { state: filteredState, log }],
      });
    }

    // Notify remote clients
    for (const client of this.clients.values()) {
      const playerID = client.metadata.playerID;
      const filteredState = this.filterStateForPlayer(state, playerID);
      client.send({
        type: 'sync',
        args: [this.matchID, { state: filteredState, log }],
      });
    }
  }

  private broadcastChat(args: ChatArgs): void {
    if (this.hostClient) {
      this.hostClient.send({ type: 'chat', args });
    }
    for (const client of this.clients.values()) {
      client.send({ type: 'chat', args });
    }
  }
}
