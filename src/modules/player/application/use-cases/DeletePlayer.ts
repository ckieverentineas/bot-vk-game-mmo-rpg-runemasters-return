import { requirePlayerByVkId } from '../../../shared/application/require-player';

import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class DeletePlayer {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<void> {
    await requirePlayerByVkId(this.repository, vkId);

    await this.repository.deletePlayerByVkId(vkId);
  }
}
