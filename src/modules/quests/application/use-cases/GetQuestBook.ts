import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import {
  buildQuestBookView,
  type QuestBookView,
} from '../read-models/quest-book';
import {
  buildQuestTelemetryPayload,
  trackQuestTelemetry,
} from '../quest-telemetry';

type GetQuestBookRepository = FindPlayerByVkIdRepository & Pick<
  GameRepository,
  'listClaimedQuestRewardCodes'
>;

export class GetQuestBook {
  public constructor(
    private readonly repository: GetQuestBookRepository,
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
