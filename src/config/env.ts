import dotenv from 'dotenv';

dotenv.config();

const readInt = (name: string, fallback: number): number => {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received "${raw}".`);
  }

  return parsed;
};

const readOptionalInt = (name: string): number | null => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  vkToken: process.env.VK_TOKEN ?? '',
  vkGroupId: readOptionalInt('VK_GROUP_ID'),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  game: {
    startingLevel: readInt('GAME_STARTING_LEVEL', 1),
    startingUsualShards: readInt('GAME_STARTING_USUAL_SHARDS', 25),
    startingUnusualShards: readInt('GAME_STARTING_UNUSUAL_SHARDS', 10),
    startingRareShards: readInt('GAME_STARTING_RARE_SHARDS', 3),
  },
});

export const assertVkEnv = (): void => {
  if (!env.vkToken) {
    throw new Error('VK_TOKEN is required to launch the VK bot.');
  }
};
