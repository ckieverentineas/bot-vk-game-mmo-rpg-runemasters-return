import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export interface LeavePartyResult {
  readonly player: PlayerState;
  readonly party: PartyView | null;
}

export class LeaveParty {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<LeavePartyResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    await this.repository.leaveParty(player.playerId);

    return {
      player,
      party: null,
    };
  }
}
