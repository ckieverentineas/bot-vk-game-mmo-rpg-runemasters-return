import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

type DisbandPartyRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'disbandParty'>;

export interface DisbandPartyResult {
  readonly player: PlayerState;
  readonly party: PartyView | null;
}

export class DisbandParty {
  public constructor(private readonly repository: DisbandPartyRepository) {}

  public async execute(vkId: number): Promise<DisbandPartyResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    await this.repository.disbandParty(player.playerId);

    return {
      player,
      party: null,
    };
  }
}
