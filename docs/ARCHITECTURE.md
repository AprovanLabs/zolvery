# Kossabos Architecture

```mermaid

```

https://studio.boardgamearena.com/welcomestudio

https://github.com/boardgameio/p2p

https://github.com/lefun-fun

https://github.com/boardzilla https://github.com/boardzilla/boardzilla-devtools

## boardgame.io

Server

- PubSub

  - `publish`
  - `subscribe`
  - `unsubscribeAll`

- Storage

  - FetchFields { state: State; log: LogEntry[]; metadata: Server.MatchData;
    initialState: State; }
  - SYNC = 0, ASYNC = 1,
  - type() {}
  - connect() {}
  - createMatch( matchID: string, opts: StorageAPI.CreateMatchOpts ):
    Promise<void> {
  - async fetch<O extends StorageAPI.FetchOpts>( matchID: string, opts: O ):
    Promise<StorageAPI.FetchResult<O>> {
  - async clear() {}
  - async setState(id: string, state: State, deltalog?: LogEntry[]) {
  - setMetadata(matchID: string, metadata: Server.MatchData): void;
  - async wipe(id: string) {}
  - async listMatches(opts?: StorageAPI.ListMatchesOpts): Promise<string[]> {}

- Networking (SocketIO)
  - constructor({ https, socketAdapter, socketOpts, pubSub }: SocketOpts = {}) {
  - init( app: Server.App & { \_io?: IOTypes.Server }, games: Game[], origins:
    CorsOptions['origin'] = [] ) {
  - getMatchQueue(matchID: string): PQueue
  - deleteMatchQueue(matchID: string): void

Master

- game: Game, storageAPI: StorageAPI.Sync | StorageAPI.Async, transportAPI:
  TransportAPI, auth?: Auth
- constructor( game: Game, storageAPI: StorageAPI.Sync | StorageAPI.Async,
  transportAPI: TransportAPI, auth?: Auth ) {
- async onUpdate( credAction: CredentialedActionShape.Any, stateID: number,
  matchID: string, playerID: string ): Promise<void | { error: string }> {
- async onSync( matchID: string, playerID: string | null | undefined,
  credentials?: string, numPlayers = 2 ): Promise<void | { error: string }> {
- async onConnectionChange( matchID: string, playerID: string | null |
  undefined, credentials: string | undefined, connected: boolean ): Promise<void
  | { error: string }> {
- async onChatMessage( matchID: string, chatMessage: ChatMessage, credentials:
  string | undefined ): Promise<void | { error: string }> {

CLIENT Transport

- sendAction(state: State, action: CredentialedActionShape.Any): void {
- sendChatMessage(matchID: string, chatMessage: ChatMessage): void {
- connect(): void
- disconnect(): void {
- requestSync(): void {
- updateMatchID(id: string): void {
- updatePlayerID(id: PlayerID): void {
- updateCredentials(credentials?: string): void {

```js
// End-of-game
{ winner: ctx.currentPlayer }
{ draw: true }

// AI
ai: {
  enumerate: (G) => {
    let r = [];
    for (let i = 0; i < 9; i++) {
      if (G.cells[i] === null) {
        r.push({ move: 'clickCell', args: [i] });
      }
    }
    return r;
  },
},
```

Context

- Events endGame(gameover?: any): void; endPhase(): void; endStage(): void;
  endTurn(arg?: { next: PlayerID; }): void; pass(arg?: { remove: true; }): void;
  setActivePlayers(arg: ActivePlayersArg): void; setPhase(newPhase: string):
  void; setStage(newStage: string): void;
- Logs setMetadata(metadata: any): void;

      LogEntry {
      action: ActionShape.MakeMove | ActionShape.AppEvent | ActionShape.Undo | ActionShape.Redo;
      _stateID: number;
      turn: number;
      phase: string;
      redact?: boolean;
      automatic?: boolean;
      metadata?: any;
      patch?: Operation[];

  }

- Random D4(): number; D4(diceCount: number): number[]; D6(): number;
  D6(diceCount: number): number[]; D10(): number; D10(diceCount: number):
  number[]; D12(): number; D12(diceCount: number): number[]; D20(): number;
  D20(diceCount: number): number[]; Die(spotvalue?: number): number;
  Die(spotvalue: number, diceCount: number): number[]; Number(): number;
  Shuffle<T>(deck: T[]): T[];

Plugins

- PluginState { data: any; api?: any; }

https://github.com/boardgameio/boardgame.io/blob/main/scripts/proxy-dirs.js
https://github.com/boardgameio/p2p/blob/665a1e786d36f84e46a0fcaf9451d5b0a6ca48dc/src/index.ts
https://github.com/boardgameio/boardgame.io
https://codesandbox.io/p/sandbox/boardgame-io-p2p-demo-0loyd?file=%2Fsrc%2FBoard.tsx%3A26%2C44-26%2C49
https://github.com/lefun-fun/lefun/blob/main/packages/game/src/gameDef.ts
https://github.com/boardzilla/boardzilla-core
https://github.com/pjohannessen/yatzy https://github.com/SaFrMo/vue3-boardgame
https://boardgame.io/documentation/#/api/Server

## Modules

### `get`

Get a stored value. May be used for dynamic game configuration, including daily puzzles.

#### `context`

Game metadata and user information.

```ts
type KossabosContext = {
  metadata: {
    appId: string,
    name: string,
    description: string,
    tags: string[],
    leaderboard?: {
      // 'friends' Internal friends leaderboard
      // 'global' Aggregate votes for all users
      type: 'friends' | 'global',
      // Maximum number of users to vote for
      maximumNumberOfVotes?: number,
      // Maximum number of votes per user
      maximumVotesPerUser?: number,
    },
    version: string,
    // 'vue-vanilla' | 'vue-boardgameio'
    runnerTag: string,
    author: {
      id: string,
      username: string,
    },
    settings: [
      {
        id: string
        label: string,
        options: { value: string, label?: string }[],
        defaultValue?: string,
      }
    ]
  },
  user: {
    id: string,
    username: string,
  },
  settings: [
    { id: string, value: number },
  ],
}
```

#### `data`

Free-form data storage for game state. Initially populated by dynamic game configuration

```ts
type KossabosData = {
  [key: string]: any
}
```

#### `users`

Get a list of users in the game. This is used for multiplayer games to retrieve player information and user-provided data.

```ts
type KossabosUser = {
  id: string,
  username: string,
  // User-provided data, e.g. votes
  data?: {
    [key: string]: any
  }
}
```

### `emit`

Emit an event with a key and optional payload. Custom events are prepended with `custom:`. The latest event is stored and may be retrieved with `get('event:<event>')`.

```ts
type KossabosEmit = (
  key: string,
  payload?: any,
) => void
```

```ts
#### `ready`

Emit when user is ready to play.

```ts
type KossabosReadyEvent = {};
```

#### `start`

Emit when the game starts.

```ts
type KossabosStartEvent = {}
```

#### `end`

Final output with optional score.

```ts
type KossabosEndEvent = {
  winner?: boolean,
  score?: number,
  // 'You win!'
  label?: string,

  // Content-based games
  data?: unknown,
  votes?: {
    place: number,
    userId: string,
    score: number
  }[],
}
```

### `on`

Listen for events. Send 

### `env`

Get environment variables

#### `ENVIRONMENT`

One of `dev`, `stg`, and `prd`. Defaults to `dev` for local

- `dev`: Local development environment
- `stg`: Staging environment, for automatic testing and previewing
- `prd`: Production environment

### `t`

Translate a string. Defaults to string itself if no translation is found.

```ts
type KossabosTranslate = (
  key: string,
  defaultValue?: string,
) => string
```
