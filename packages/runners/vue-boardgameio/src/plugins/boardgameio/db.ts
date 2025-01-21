import { LogEntry, Server, State, StorageAPI } from 'boardgame.io';
import { Sync } from 'boardgame.io/internal';

/**
 * In-browser storage implementation for use by P2P hosts.
 *
 * Currently a simple in-memory store, but should be improved to provide
 * persistence across sessions using IndexedDB or similar.
 */
export class P2PDB extends Sync {
  private initialState: Map<string, State> = new Map();
  private state: Map<string, State> = new Map();
  private log: Map<string, LogEntry[]> = new Map();
  private metadata: Map<string, Server.MatchData> = new Map();

  public connect(): void {
    // Required by parent class interface.
  }

  public createMatch(matchID: string, opts: StorageAPI.CreateMatchOpts): void {
    this.initialState.set(matchID, opts.initialState);
    this.state.set(matchID, opts.initialState);
    this.log.set(matchID, []);
    this.metadata.set(matchID, opts.metadata);
  }

  public setState(matchID: string, state: State, deltalog?: LogEntry[]): void {
    this.state.set(matchID, state);
    if (deltalog) {
      this.log.set(matchID, [...(this.log.get(matchID) || []), ...deltalog]);
    }
  }

  public setMetadata(matchID: string, metadata: Server.MatchData): void {
    this.metadata.set(matchID, metadata);
  }

  public fetch<O extends StorageAPI.FetchOpts>(
    matchID: string,
  ): StorageAPI.FetchResult<O> {
    const res: StorageAPI.FetchFields = {
      initialState: this.initialState.get(matchID)!,
      state: this.state.get(matchID)!,
      log: this.log.get(matchID)!,
      metadata: this.metadata.get(matchID)!,
    };
    return res;
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
