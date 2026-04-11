import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class ChangeLocationLevel {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, delta: number): Promise<PlayerState> {
    void delta;

    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    throw new AppError(
      'manual_location_disabled',
      'Ручная смена локации отключена. Теперь сложность подбирается автоматически по уровню, статам и серии поражений.',
    );
  }
}
