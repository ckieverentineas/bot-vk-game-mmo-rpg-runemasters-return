import type { PlayerState } from '../../../../shared/types/game';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

export class GetPlayerProfile {
  public constructor(private readonly repository: FindPlayerByVkIdRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    return requirePlayerByVkId(this.repository, vkId);
  }
}
