#!/usr/bin/env node

import { shutdownTelemetry, telemetrySDK } from './config/telemetry';

import { app } from './app';
import { appConfig } from '@/config';
import { logger } from '@/config/logger';
import { PeerServer } from 'peer';

const port = appConfig.port;

const server = app.listen(port, () => {
  logger.info(
    {
      port,
      nodeEnv: appConfig.nodeEnv,
      environment: appConfig.environment,
      version: process.env.npm_package_version || '1.0.0',
      telemetryEnabled: !!telemetrySDK,
    },
    `🚀 Kossabos server started successfully on port ${port}`,
  );
});

// Setup PeerJS signaling server on separate port
const peerPort = appConfig.peerPort;
let peerHttpServer: import('http').Server | import('https').Server | null =
  null;

const peerServer = PeerServer(
  {
    port: peerPort,
    path: '/',
    allow_discovery: true,
    corsOptions: {
      origin: '*',
    },
  },
  (httpServer) => {
    peerHttpServer = httpServer;
    logger.info({ port: peerPort }, '🔗 PeerJS signaling server started');
  },
);

// Log peer connections
peerServer.on('connection', (client) => {
  logger.info(
    { clientId: client.getId() },
    `PeerJS client connected on port ${peerPort}`,
  );
});

peerServer.on('disconnect', (client) => {
  logger.info({ clientId: client.getId() }, 'PeerJS client disconnected');
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal, closing server...');

  peerHttpServer?.close();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during server shutdown');
    } else {
      logger.info('Server closed successfully');
    }

    await shutdownTelemetry(telemetrySDK);

    process.exit(err ? 1 : 0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.fatal(
    {
      err: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    },
    'Uncaught exception, shutting down...',
  );

  await shutdownTelemetry(telemetrySDK);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  logger.fatal(
    {
      reason,
      promise,
    },
    'Unhandled promise rejection, shutting down...',
  );

  await shutdownTelemetry(telemetrySDK);
  process.exit(1);
});

export { server };
