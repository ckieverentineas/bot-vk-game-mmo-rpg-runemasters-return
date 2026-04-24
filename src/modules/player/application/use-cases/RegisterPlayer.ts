import type { PlayerState } from '../../../../shared/types/game';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

type RegisterPlayerRepository = Pick<GameRepository, 'createPlayer' | 'log'>;

export class RegisterPlayer {
  public constructor(
    private readonly repository: RegisterPlayerRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(vkId: number): Promise<{ player: PlayerState; created: boolean }> {
    const result = await this.repository.createPlayer(vkId);
    if (result.created) {
      await this.repository.log(result.player.userId, 'player_registered', { vkId });
      await this.telemetry.onboardingStarted(result.player.userId, {
        entrySurface: 'start',
        tutorialState: result.player.tutorialState,
      });
    }

    return {
      player: result.player,
      created: result.created || result.recoveredFromRace,
    };
  }
}
