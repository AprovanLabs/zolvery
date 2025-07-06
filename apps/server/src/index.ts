#!/usr/bin/env node
import { app } from './app';
import { appConfig } from '@/config';
import { logger } from '@/config/logger';

const port = appConfig.port;

const server = app.listen(port, () => {
  logger.info({
    port,
    nodeEnv: appConfig.nodeEnv,
    environment: appConfig.environment,
    version: process.env.npm_package_version || '1.0.0',
  }, `🚀 Kossabos server started successfully on port ${port}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal, closing server...');
  
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during server shutdown');
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({
    err: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
  }, 'Uncaught exception, shutting down...');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({
    reason,
    promise,
  }, 'Unhandled promise rejection, shutting down...');
  process.exit(1);
});

export { server };
