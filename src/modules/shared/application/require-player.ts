import { AppError } from '../../../shared/domain/AppError';
import type { PlayerState } from '../../../shared/types/game';

import type {
  FindPlayerByIdRepository,
  FindPlayerByVkIdRepository,
} from './ports/repository-scopes';

const playerNotFoundMessage = 'Напишите «начать», чтобы создать персонажа.';

const createPlayerNotFoundError = (): AppError => new AppError('player_not_found', playerNotFoundMessage);

export const requirePlayerByVkId = async (
  repository: FindPlayerByVkIdRepository,
  vkId: number,
): Promise<PlayerState> => {
  const player = await repository.findPlayerByVkId(vkId);

  if (!player) {
    throw createPlayerNotFoundError();
  }

  return player;
};

export const requirePlayerById = async (
  repository: FindPlayerByIdRepository,
  playerId: number,
): Promise<PlayerState> => {
  const player = await repository.findPlayerById(playerId);

  if (!player) {
    throw createPlayerNotFoundError();
  }

  return player;
};
