import type { ChatMessage, CredentialedActionShape, State } from 'boardgame.io';

export interface ClientMetadata {
  playerID: string | null;
  credentials?: string;
  message?: string;
}

export interface Client {
  metadata: ClientMetadata;
  send: (data: unknown) => void;
}

export type ClientAction =
  | { type: 'sync' }
  | { type: 'update'; args: [string, State, CredentialedActionShape.Any] }
  | { type: 'chat'; args: [string, ChatMessage, string | undefined] };
