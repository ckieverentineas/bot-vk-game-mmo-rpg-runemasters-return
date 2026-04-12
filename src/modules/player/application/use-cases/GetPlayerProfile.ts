import type { PlayerState } from '../../../../shared/types/game';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class GetPlayerProfile {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    return requirePlayerByVkId(this.repository, vkId);
  }
}
