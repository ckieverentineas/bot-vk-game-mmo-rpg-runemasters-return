import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export interface PartyScreenView {
  readonly player: PlayerState;
  readonly party: PartyView | null;
}

export class GetParty {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PartyScreenView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const party = await this.repository.getActiveParty(player.playerId);

    return { player, party };
  }
}
