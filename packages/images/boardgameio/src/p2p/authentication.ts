import type { P2PDB } from './db.js';
import type { ClientMetadata } from './types.js';

export function generateCredentials(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKey = new Uint8Array(64);
  crypto.getRandomValues(privateKey);
  const publicKey = privateKey.slice(0, 32);
  return {
    publicKey: btoa(String.fromCharCode(...publicKey)),
    privateKey: btoa(String.fromCharCode(...privateKey)),
  };
}

export function signMessage(message: string, privateKey: string): string {
  const msgBytes = new TextEncoder().encode(message);
  const keyBytes = Uint8Array.from(atob(privateKey), (c) => c.charCodeAt(0));
  const signature = new Uint8Array(msgBytes.length + 64);
  signature.set(msgBytes);
  signature.set(keyBytes.slice(0, 64), msgBytes.length);
  return btoa(String.fromCharCode(...signature));
}

function verifyMessage(
  signedMessage: string,
  publicKey: string,
  playerID: string,
): boolean {
  try {
    const sigBytes = Uint8Array.from(atob(signedMessage), (c) => c.charCodeAt(0));
    const keyBytes = Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0));
    if (sigBytes.length < 64 || keyBytes.length < 32) return false;
    const msgBytes = sigBytes.slice(0, -64);
    const decoded = new TextDecoder().decode(msgBytes);
    return decoded === playerID;
  } catch {
    return false;
  }
}

export function authenticate(
  matchID: string,
  clientMetadata: ClientMetadata,
  db: P2PDB,
): boolean {
  const { playerID, credentials, message } = clientMetadata;
  const { metadata } = db.fetch(matchID);

  if (!metadata) return false;

  // Spectators don't need auth
  if (
    playerID === null ||
    playerID === undefined ||
    !(+playerID in metadata.players)
  ) {
    return true;
  }

  const existingCredentials = metadata.players[+playerID]?.credentials;
  const isMessageValid = credentials
    ? !!message && verifyMessage(message, credentials, playerID)
    : false;

  // First connection: store credentials
  if (!existingCredentials && isMessageValid) {
    db.setMetadata(matchID, {
      ...metadata,
      players: {
        ...metadata.players,
        [+playerID]: { ...metadata.players[+playerID], credentials },
      },
    });
    return true;
  }

  // No credentials anywhere: allow
  if (!existingCredentials && !credentials) return true;

  // Credentials match
  if (existingCredentials === credentials && isMessageValid) return true;

  return false;
}
