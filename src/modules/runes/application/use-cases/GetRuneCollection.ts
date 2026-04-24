import type { PlayerState } from '../../../../shared/types/game';
import { resolveNextGoalRuneFocusIndex } from '../../../player/application/read-models/next-goal';
import { normalizeRuneIndex } from '../../../player/domain/player-stats';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

type GetRuneCollectionRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'saveRuneCursor'>;

export class GetRuneCollection {
  public constructor(private readonly repository: GetRuneCollectionRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.runes.length === 0) {
      return player;
    }

    const normalizedIndex = normalizeRuneIndex(player.currentRuneIndex, player.runes.length);
    const nextGoalRuneFocusIndex = resolveNextGoalRuneFocusIndex(player);
    const targetIndex = nextGoalRuneFocusIndex ?? normalizedIndex;

    return targetIndex === player.currentRuneIndex
      ? player
      : this.repository.saveRuneCursor(player.playerId, targetIndex);
  }
}
