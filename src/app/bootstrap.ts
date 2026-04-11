import type { VK } from 'vk-io';

import { connectDatabase, disconnectDatabase } from '../database/client';
import { Logger } from '../utils/logger';
import { GameHandler } from '../vk/handlers/gameHandler';
import { createVkBot } from '../vk/bot';
import { createAppServices } from './composition-root';

export interface BootstrappedApp {
  vk: VK;
  stop(): Promise<void>;
}

export const bootstrap = async (): Promise<BootstrappedApp> => {
  await connectDatabase();

  const services = createAppServices();
  const handler = new GameHandler(services);
  const vk = createVkBot();

  vk.updates.on('message_new', async (ctx) => {
    await handler.handle(ctx);
  });

  vk.updates.on('unsupported_event', (event) => {
    const subTypes = Array.isArray((event as { subTypes?: unknown }).subTypes)
      ? ((event as { subTypes: string[] }).subTypes)
      : [];

    if (subTypes.includes('message_read')) {
      return;
    }

    Logger.warn('Unsupported VK event received', {
      type: (event as { type?: unknown }).type,
      subTypes,
    });
  });

  return {
    vk,
    stop: async () => {
      await vk.updates.stop();
      await disconnectDatabase();
    },
  };
};
