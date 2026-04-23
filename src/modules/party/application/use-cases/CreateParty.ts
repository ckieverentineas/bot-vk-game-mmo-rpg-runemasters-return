import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export interface PartyMutationResult {
  readonly player: PlayerState;
  readonly party: PartyView;
}

export class CreateParty {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PartyMutationResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const party = await this.repository.createParty(player.playerId);

    return { player, party };
  }
}
