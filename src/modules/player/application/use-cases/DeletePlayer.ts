import { AppError } from '../../../../shared/domain/AppError';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';

import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class DeletePlayer {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<void> {
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    if (!intent) {
      throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
    }

    await this.repository.confirmDeletePlayer(vkId, intent.intentId, intent.intentStateKey);
  }
}
