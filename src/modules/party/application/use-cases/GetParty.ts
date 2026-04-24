import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

type GetPartyRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'getActiveParty'>;

export interface PartyScreenView {
  readonly player: PlayerState;
  readonly party: PartyView | null;
}

export class GetParty {
  public constructor(private readonly repository: GetPartyRepository) {}

  public async execute(vkId: number): Promise<PartyScreenView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const party = await this.repository.getActiveParty(player.playerId);

    return { player, party };
  }
}
