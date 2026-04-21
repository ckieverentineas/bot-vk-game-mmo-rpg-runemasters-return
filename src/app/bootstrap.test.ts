import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectDatabase = vi.fn();
const disconnectDatabase = vi.fn();
const recoverPendingRewardsOnStart = {
  execute: vi.fn().mockResolvedValue({
    scanned: 0,
    recovered: 0,
    skipped: 0,
  }),
};
const createAppServices = vi.fn(() => ({
  recoverPendingRewardsOnStart,
}));
const vk = {
  updates: {
    on: vi.fn(),
    stop: vi.fn(),
  },
};
const createVkBot = vi.fn(() => vk);
const handle = vi.fn();

vi.mock('../database/client', () => ({
  connectDatabase,
  disconnectDatabase,
}));

vi.mock('./composition-root', () => ({
  createAppServices,
}));

vi.mock('../vk/bot', () => ({
  createVkBot,
}));

vi.mock('../vk/handlers/gameHandler', () => ({
  GameHandler: class {
    public handle = handle;
  },
}));

describe('bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recovers pending rewards before registering VK update handlers', async () => {
    const { bootstrap } = await import('./bootstrap');

    await bootstrap();

    expect(connectDatabase).toHaveBeenCalledTimes(1);
    expect(recoverPendingRewardsOnStart.execute).toHaveBeenCalledTimes(1);
    expect(createVkBot).toHaveBeenCalledTimes(1);
    expect(vk.updates.on).toHaveBeenCalledWith('message_new', expect.any(Function));
  });
});
