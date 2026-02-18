import type { ChatMessage, CredentialedActionShape, Game, Server, State } from 'boardgame.io';
import { P2PDB } from './db.js';
import { authenticate } from './authentication.js';
import type { Client, ClientAction } from './types.js';

type UpdateArgs = [string, State, CredentialedActionShape.Any];
type ChatArgs = [string, ChatMessage, string | undefined];

export class P2PHost {
  private clients = new Map<Client, Client>();
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

    const initialState = this.createInitialState();
    this.state = initialState;

    const players: Record<number, Server.PlayerMetadata> = {};
    for (let i = 0; i < numPlayers; i++) {
      players[i] = { id: i };
    }

    this.db.createMatch(matchID, {
      initialState,
      metadata: {
        gameName: game.name ?? 'unknown',
        players,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
  }

  private createInitialState(): State {
    const ctx = {
      numPlayers: this.numPlayers,
      turn: 1,
      currentPlayer: '0',
      playOrder: Array.from({ length: this.numPlayers }, (_, i) => String(i)),
      playOrderPos: 0,
      phase: '',
      activePlayers: null,
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
      return;
    }

    this.clients.set(client, client);
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

    if (moveName && this.game.moves?.[moveName]) {
      const move = this.game.moves[moveName];
      const ctx = { ...currentState.ctx, playerID };
      const G = { ...currentState.G };
      
      if (typeof move === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        move({ G, ctx } as any, ...moveArgs);
      }

      const newState: State = {
        ...currentState,
        G,
        _stateID: currentState._stateID + 1,
      };

      this.state = newState;
      this.db.setState(this.matchID, newState);
      this.broadcastState();
    }
  }

  private broadcastState(): void {
    const { state, log } = this.db.fetch(this.matchID);
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
    for (const client of this.clients.values()) {
      client.send({ type: 'chat', args });
    }
  }
}
