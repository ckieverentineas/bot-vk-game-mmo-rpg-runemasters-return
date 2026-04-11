import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class RegisterPlayer {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<{ player: PlayerState; created: boolean }> {
    const existing = await this.repository.findPlayerByVkId(vkId);
    if (existing) {
      return {
        player: existing,
        created: false,
      };
    }

    const player = await this.repository.createPlayer(vkId);
    await this.repository.log(player.userId, 'player_registered', { vkId });

    return {
      player,
      created: true,
    };
  }
}
