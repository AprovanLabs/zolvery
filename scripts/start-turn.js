#!/usr/bin/env node

// Lightweight TURN server for local development using node-turn (loaded via createRequire for CJS compatibility).
// Credentials and port can be overridden via env:
// TURN_PORT (default 3478), TURN_USER, TURN_PASS, TURN_REALM.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Turn = require('node-turn');

const port = Number(process.env.TURN_PORT) || 3478;
const user = process.env.TURN_USER || 'turnuser';
const pass = process.env.TURN_PASS || 'turnpass';
const realm = process.env.TURN_REALM || 'localturn';

const server = new Turn({
  authMech: 'long-term',
  listeningPort: port,
  realm,
  users: [{ name: user, password: pass }],
  // Bind to all interfaces; adjust if you only want LAN exposure
  listeningIps: ['0.0.0.0'],
  relayIps: ['0.0.0.0'],
});

server.on('error', (err) => {
  console.error('[turn] server error:', err);
});

server.start();

console.log(`
[turn] TURN server started
[turn] URL: turn:127.0.0.1:${port}
[turn] Realm: ${realm}
[turn] User: ${user}
[turn] Pass: ${pass}
`);

const shutdown = (signal) => {
  console.log(`[turn] shutting down (${signal})`);
  try {
    server.stop();
  } catch (e) {
    // ignore
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
