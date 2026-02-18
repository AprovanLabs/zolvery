import type { LogEntry, Server, State, StorageAPI } from 'boardgame.io';

export class P2PDB {
  private initialState = new Map<string, State>();
  private state = new Map<string, State>();
  private log = new Map<string, LogEntry[]>();
  private metadata = new Map<string, Server.MatchData>();

  public connect(): void {}

  public createMatch(matchID: string, opts: StorageAPI.CreateMatchOpts): void {
    this.initialState.set(matchID, opts.initialState);
    this.state.set(matchID, opts.initialState);
    this.log.set(matchID, opts.initialState._stateID === 0 ? [] : []);
    this.metadata.set(matchID, opts.metadata);
  }

  public setState(matchID: string, state: State, deltalog?: LogEntry[]): void {
    this.state.set(matchID, state);
    if (deltalog) {
      const existing = this.log.get(matchID) ?? [];
      this.log.set(matchID, [...existing, ...deltalog]);
    }
  }

  public setMetadata(matchID: string, metadata: Server.MatchData): void {
    this.metadata.set(matchID, metadata);
  }

  public fetch<O extends StorageAPI.FetchOpts>(
    matchID: string,
  ): StorageAPI.FetchResult<O> {
    return {
      state: this.state.get(matchID),
      initialState: this.initialState.get(matchID),
      log: this.log.get(matchID),
      metadata: this.metadata.get(matchID),
    } as StorageAPI.FetchResult<O>;
  }

  public wipe(matchID: string): void {
    this.initialState.delete(matchID);
    this.state.delete(matchID);
    this.log.delete(matchID);
    this.metadata.delete(matchID);
  }

  public listMatches(): string[] {
    return [...this.metadata.keys()];
  }
}
