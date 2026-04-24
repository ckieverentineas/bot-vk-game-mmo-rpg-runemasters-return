import type { PartyView, PlayerState } from '../../../../shared/types/game';
import { AppError } from '../../../../shared/domain/AppError';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

type JoinPartyRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'joinPartyByInviteCode'>;

export interface JoinPartyResult {
  readonly player: PlayerState;
  readonly party: PartyView;
}

export class JoinParty {
  public constructor(private readonly repository: JoinPartyRepository) {}

  public async execute(vkId: number, inviteCode: string | null | undefined): Promise<JoinPartyResult> {
    const normalizedInviteCode = inviteCode?.trim() ?? '';
    if (!normalizedInviteCode) {
      throw new AppError('party_invite_code_invalid', 'Введите код отряда: например, отряд ABC123.');
    }

    const player = await requirePlayerByVkId(this.repository, vkId);
    const party = await this.repository.joinPartyByInviteCode(player.playerId, normalizedInviteCode);

    return { player, party };
  }
}
