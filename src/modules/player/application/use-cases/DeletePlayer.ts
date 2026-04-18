import { AppError } from '../../../../shared/domain/AppError';
import { requirePlayerByVkId } from '../../../shared/application/require-player';

import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class DeletePlayer {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, expectedUpdatedAt?: string): Promise<void> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (!expectedUpdatedAt || player.updatedAt !== expectedUpdatedAt) {
      throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
    }

    await this.repository.deletePlayerByVkId(vkId, expectedUpdatedAt);
  }
}
