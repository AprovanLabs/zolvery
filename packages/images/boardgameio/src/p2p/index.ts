export { generateCredentials, generateKeyPair, signMessage, authenticate } from './authentication.js';
export { P2PDB } from './db.js';
export { P2PHost } from './host.js';
export { P2PTransport, createP2PTransport, type P2PTransportOpts, type TransportConfig } from './transport.js';
export type { Client, ClientAction, ClientMetadata } from './types.js';
