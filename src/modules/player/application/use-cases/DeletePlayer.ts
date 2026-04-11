import { AppError } from '../../../../shared/domain/AppError';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class DeletePlayer {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<void> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Персонаж не найден. Нажмите «Начать», чтобы создать нового.');
    }

    await this.repository.deletePlayerByVkId(vkId);
  }
}
