import { AppError } from '../../../../shared/domain/AppError';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import {
  buildQuestBookView,
  findQuestBookEntry,
  type QuestBookView,
  type QuestView,
} from '../read-models/quest-book';

export interface ClaimQuestRewardView {
  readonly book: QuestBookView;
  readonly quest: QuestView;
  readonly claimedNow: boolean;
}

export class ClaimQuestReward {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, questCode?: string): Promise<ClaimQuestRewardView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const claimedQuestCodes = await this.repository.listClaimedQuestRewardCodes(player.playerId);
    const book = buildQuestBookView(player, claimedQuestCodes);
    const quest = this.resolveQuest(book, questCode);

    if (quest.status === 'CLAIMED') {
      return {
        book,
        quest,
        claimedNow: false,
      };
    }

    if (quest.status !== 'READY_TO_CLAIM') {
      throw new AppError('quest_not_ready', 'Эта запись ещё не закрыта. Пусть путь сначала станет частью летописи.');
    }

    const claim = await this.repository.claimQuestReward(player.playerId, quest.code, quest.reward);
    const nextClaimedCodes = claim.claimed
      ? [...claimedQuestCodes, quest.code]
      : claimedQuestCodes;
    const nextBook = buildQuestBookView(claim.player, nextClaimedCodes);
    const updatedQuest = findQuestBookEntry(nextBook, quest.code);

    if (!updatedQuest) {
      throw new AppError('quest_not_found', 'Эта запись выпала из книги путей. Откройте книгу заново.');
    }

    return {
      book: nextBook,
      quest: updatedQuest,
      claimedNow: claim.claimed,
    };
  }

  private resolveQuest(book: QuestBookView, questCode?: string): QuestView {
    if (questCode) {
      const quest = findQuestBookEntry(book, questCode);
      if (!quest) {
        throw new AppError('quest_not_found', 'Такой записи нет в книге путей.');
      }

      return quest;
    }

    const readyQuest = book.quests.find((quest) => quest.status === 'READY_TO_CLAIM');
    if (!readyQuest) {
      throw new AppError('quest_not_ready', 'В книге пока нет записей с готовой наградой.');
    }

    return readyQuest;
  }
}
