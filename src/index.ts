import { bootstrap } from './app/bootstrap';
import { disconnectDatabase } from './database/client';
import { Logger } from './utils/logger';

async function main(): Promise<void> {
  Logger.info('🚀 Starting Runemasters Return...');

  try {
    const app = await bootstrap();
    let shuttingDown = false;

    const shutdown = async (signal: string): Promise<void> => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      Logger.info(`Received ${signal}. Shutting down gracefully...`);
      await app.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    await app.vk.updates.start();
    Logger.info('✅ Bot is running and listening for updates!');
  } catch (error) {
    Logger.error('Failed to start bot:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

void main();
