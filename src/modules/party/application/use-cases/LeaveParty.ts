import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

type LeavePartyRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'leaveParty'>;

export interface LeavePartyResult {
  readonly player: PlayerState;
  readonly party: PartyView | null;
}

export class LeaveParty {
  public constructor(private readonly repository: LeavePartyRepository) {}

  public async execute(vkId: number): Promise<LeavePartyResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    await this.repository.leaveParty(player.playerId);

    return {
      player,
      party: null,
    };
  }
}
