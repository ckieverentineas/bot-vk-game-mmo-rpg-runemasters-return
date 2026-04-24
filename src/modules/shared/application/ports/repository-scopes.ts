import type { GameRepository } from './GameRepository';

export type FindPlayerByVkIdRepository = Pick<GameRepository, 'findPlayerByVkId'>;

export type FindPlayerByIdRepository = Pick<GameRepository, 'findPlayerById'>;

export type PlayerLookupRepository = FindPlayerByVkIdRepository & FindPlayerByIdRepository;

export type CommandIntentReplayRepository = Pick<GameRepository, 'getCommandIntentResult'>;

export type CommandIntentResultRepository = Pick<
  GameRepository,
  'getCommandIntentResult' | 'recordCommandIntentResult' | 'storeCommandIntentResult'
>;
