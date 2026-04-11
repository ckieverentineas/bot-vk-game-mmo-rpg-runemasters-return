import { VK } from 'vk-io';

import { assertVkEnv, env } from '../config/env';

export const createVkBot = (): VK => {
  assertVkEnv();

  return new VK({
    token: env.vkToken,
    pollingGroupId: env.vkGroupId ?? undefined,
  });
};
