import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import {
  buildQuestBookView,
  type QuestBookView,
} from '../read-models/quest-book';
import {
  buildQuestTelemetryPayload,
  trackQuestTelemetry,
} from '../quest-telemetry';

export class GetQuestBook {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry?: GameTelemetry,
  ) {}

  public async execute(vkId: number): Promise<QuestBookView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const claimedQuestCodes = await this.repository.listClaimedQuestRewardCodes(player.playerId);

    const book = buildQuestBookView(player, claimedQuestCodes);
    await trackQuestTelemetry(
      this.telemetry,
      'questBookOpened',
      player.userId,
      buildQuestTelemetryPayload(book),
    );

    return book;
  }
}
