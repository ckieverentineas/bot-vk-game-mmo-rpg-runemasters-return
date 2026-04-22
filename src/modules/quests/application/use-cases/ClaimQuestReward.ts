import { AppError } from '../../../../shared/domain/AppError';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type {
  GameRepository,
  QuestRewardClaimResult,
} from '../../../shared/application/ports/GameRepository';
import {
  buildQuestBookView,
  findQuestBookEntry,
  type QuestBookView,
  type QuestView,
} from '../read-models/quest-book';
import {
  buildQuestRewardEconomyTelemetryPayload,
  buildQuestTelemetryPayload,
  trackEconomyTransactionTelemetry,
  trackQuestTelemetry,
} from '../quest-telemetry';

export interface ClaimQuestRewardView {
  readonly book: QuestBookView;
  readonly quest: QuestView;
  readonly claimedNow: boolean;
}

export interface ClaimQuestRewardRequest {
  readonly questCode?: string;
  readonly intentId?: string;
  readonly intentSource?: CommandIntentSource;
}

type ClaimQuestRewardInput = string | ClaimQuestRewardRequest | undefined;

const claimQuestRewardCommandKey = 'CLAIM_QUEST_REWARD' as const;

const normalizeClaimQuestRewardRequest = (request: ClaimQuestRewardInput): ClaimQuestRewardRequest => (
  typeof request === 'string' ? { questCode: request } : request ?? {}
);

export class ClaimQuestReward {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry?: GameTelemetry,
  ) {}

  public async execute(vkId: number, requestInput?: ClaimQuestRewardInput): Promise<ClaimQuestRewardView> {
    const request = normalizeClaimQuestRewardRequest(requestInput);
    const player = await requirePlayerByVkId(this.repository, vkId);
    const legacyIntent = this.resolveLegacyTextIntent(request);
    const replay = legacyIntent
      ? await this.tryReplayLegacyTextClaim(player.playerId, legacyIntent.intentId)
      : null;

    if (replay) {
      return replay;
    }

    const claimedQuestCodes = await this.repository.listClaimedQuestRewardCodes(player.playerId);
    const book = buildQuestBookView(player, claimedQuestCodes);
    const quest = this.resolveQuest(book, request.questCode);

    if (quest.status === 'CLAIMED') {
      await this.trackQuestReward('questRewardReplayed', player.userId, book, quest);

      return {
        book,
        quest,
        claimedNow: false,
      };
    }

    if (quest.status !== 'READY_TO_CLAIM') {
      await this.trackQuestReward('questRewardNotReady', player.userId, book, quest);
      throw new AppError('quest_not_ready', 'Эта запись ещё не закрыта. Пусть путь сначала станет частью летописи.');
    }

    const claim = legacyIntent
      ? await this.repository.claimQuestReward(player.playerId, quest.code, quest.reward, {
          commandKey: claimQuestRewardCommandKey,
          intentId: legacyIntent.intentId,
          intentStateKey: quest.code,
          currentStateKey: quest.code,
        })
      : await this.repository.claimQuestReward(player.playerId, quest.code, quest.reward);
    const nextClaimedCodes = claim.claimed
      ? [...claimedQuestCodes, quest.code]
      : claimedQuestCodes;
    const nextBook = buildQuestBookView(claim.player, nextClaimedCodes);
    const updatedQuest = findQuestBookEntry(nextBook, quest.code);

    if (!updatedQuest) {
      throw new AppError('quest_not_found', 'Эта запись выпала из книги путей. Откройте книгу заново.');
    }

    if (claim.claimed) {
      await trackEconomyTransactionTelemetry(
        this.telemetry,
        claim.player.userId,
        buildQuestRewardEconomyTelemetryPayload(quest.code, claim.reward, claim.player.level),
      );
    }

    await this.trackQuestReward(
      claim.claimed ? 'questRewardClaimed' : 'questRewardReplayed',
      claim.player.userId,
      nextBook,
      updatedQuest,
    );

    return {
      book: nextBook,
      quest: updatedQuest,
      claimedNow: claim.claimed,
    };
  }

  private resolveLegacyTextIntent(request: ClaimQuestRewardRequest): { intentId: string } | null {
    if (request.intentSource !== 'legacy_text') {
      return null;
    }

    return resolveCommandIntent(request.intentId, undefined, request.intentSource, false);
  }

  private async tryReplayLegacyTextClaim(
    playerId: number,
    intentId: string,
  ): Promise<ClaimQuestRewardView | null> {
    const replay = await this.repository.getCommandIntentResult<QuestRewardClaimResult>(
      playerId,
      intentId,
      [claimQuestRewardCommandKey],
    );

    if (replay?.status === 'APPLIED' && replay.result) {
      return this.buildViewFromClaimResult(replay.result);
    }

    if (replay?.status === 'PENDING') {
      throw new AppError('command_retry_pending', 'Прошлый жест к книге ещё в пути. Дождитесь ответа.');
    }

    return null;
  }

  private async buildViewFromClaimResult(claim: QuestRewardClaimResult): Promise<ClaimQuestRewardView> {
    const claimedQuestCodes = await this.repository.listClaimedQuestRewardCodes(claim.player.playerId);
    const book = buildQuestBookView(claim.player, claimedQuestCodes);
    const quest = findQuestBookEntry(book, claim.questCode);

    if (!quest) {
      throw new AppError('quest_not_found', 'Эта запись выпала из книги путей. Откройте книгу заново.');
    }

    return {
      book,
      quest,
      claimedNow: claim.claimed,
    };
  }

  private async trackQuestReward(
    method: 'questRewardClaimed' | 'questRewardReplayed' | 'questRewardNotReady',
    userId: number,
    book: QuestBookView,
    quest: QuestView,
  ): Promise<void> {
    await trackQuestTelemetry(
      this.telemetry,
      method,
      userId,
      buildQuestTelemetryPayload(book, quest),
    );
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
