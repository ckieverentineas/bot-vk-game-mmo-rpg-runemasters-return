import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import {
  buildQuestBookView,
  type QuestBookView,
} from '../read-models/quest-book';

export class GetQuestBook {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<QuestBookView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const claimedQuestCodes = await this.repository.listClaimedQuestRewardCodes(player.playerId);

    return buildQuestBookView(player, claimedQuestCodes);
  }
}
