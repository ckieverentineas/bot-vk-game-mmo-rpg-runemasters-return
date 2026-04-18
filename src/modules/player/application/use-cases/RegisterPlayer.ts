import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class RegisterPlayer {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<{ player: PlayerState; created: boolean }> {
    const result = await this.repository.createPlayer(vkId);
    if (result.created) {
      await this.repository.log(result.player.userId, 'player_registered', { vkId });
    }

    return {
      player: result.player,
      created: result.created || result.recoveredFromRace,
    };
  }
}
