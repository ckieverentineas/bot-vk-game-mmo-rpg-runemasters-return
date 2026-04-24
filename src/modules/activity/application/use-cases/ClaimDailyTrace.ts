import { Logger } from '../../../../utils/logger';
import type { PlayerState, ResourceReward } from '../../../../shared/types/game';
import { sumResourceRewardShardDelta } from '../../../shared/application/resource-reward-summary';
import {
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type {
  DailyActivityRewardClaimResult,
  GameRepository,
} from '../../../shared/application/ports/GameRepository';
import type {
  DailyTraceTelemetryPayload,
  GameTelemetry,
} from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  resolveDailyTrace,
  type DailyTraceView,
} from '../../domain/daily-trace';

export interface ClaimDailyTraceView {
  readonly player: PlayerState;
  readonly trace: DailyTraceView;
  readonly claimedNow: boolean;
  readonly replayed?: true;
}

const claimDailyTraceCommandKey = 'CLAIM_DAILY_TRACE' as const;

const buildDailyTraceEconomySourceId = (trace: DailyTraceView): string => (
  `${trace.activityCode}:${trace.gameDay}`
);

const buildDailyTraceTelemetryPayload = (
  player: PlayerState,
  trace: DailyTraceView,
  claimedNow: boolean,
): DailyTraceTelemetryPayload => ({
  playerId: player.playerId,
  activityCode: trace.activityCode,
  gameDay: trace.gameDay,
  claimedNow,
  rewardDustDelta: trace.reward.gold ?? 0,
  rewardRadianceDelta: trace.reward.radiance ?? 0,
  rewardShardsDelta: sumResourceRewardShardDelta(trace.reward),
});

export class ClaimDailyTrace {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry?: GameTelemetry,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<ClaimDailyTraceView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const trace = resolveDailyTrace(this.getNow());
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, true);

    const replay = await loadCommandIntentReplay<ClaimDailyTraceView, DailyActivityRewardClaimResult>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intent?.intentId,
      expectedCommandKeys: [claimDailyTraceCommandKey],
      expectedStateKey: intent?.intentStateKey,
      pendingMessage: 'Прошлый жест к следу дня ещё в пути. Дождитесь ответа.',
      mapResult: (result) => this.buildViewFromClaim(result, true),
    });
    if (replay) {
      return replay;
    }

    const claim = await this.repository.claimDailyActivityReward(
      player.playerId,
      trace.activityCode,
      trace.gameDay,
      trace.reward,
      intent
        ? {
            commandKey: claimDailyTraceCommandKey,
            intentId: intent.intentId,
            intentStateKey: intent.intentStateKey,
            currentStateKey: intent.intentStateKey,
          }
        : undefined,
    );

    await this.trackDailyTrace(claim.player, trace, claim.claimed);
    await this.trackEconomy(claim.player, trace, claim.reward, claim.claimed);

    return {
      player: claim.player,
      trace,
      claimedNow: claim.claimed,
    };
  }

  private buildViewFromClaim(
    claim: DailyActivityRewardClaimResult,
    replayed: true,
  ): ClaimDailyTraceView {
    const trace = resolveDailyTrace(new Date(`${claim.gameDay}T00:00:00.000Z`));

    return {
      player: claim.player,
      trace,
      claimedNow: claim.claimed,
      replayed,
    };
  }

  private async trackDailyTrace(
    player: PlayerState,
    trace: DailyTraceView,
    claimedNow: boolean,
  ): Promise<void> {
    const method = claimedNow ? this.telemetry?.dailyTraceClaimed : this.telemetry?.dailyTraceAlreadyClaimed;
    if (!method) {
      return;
    }

    try {
      await method.call(this.telemetry, player.userId, buildDailyTraceTelemetryPayload(player, trace, claimedNow));
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }

  private async trackEconomy(
    player: PlayerState,
    trace: DailyTraceView,
    reward: ResourceReward,
    claimedNow: boolean,
  ): Promise<void> {
    if (!claimedNow || !this.telemetry) {
      return;
    }

    try {
      await this.telemetry.economyTransactionCommitted(player.userId, {
        transactionType: 'reward_claim',
        sourceType: 'DAILY_TRACE',
        sourceId: buildDailyTraceEconomySourceId(trace),
        resourceDustDelta: reward.gold ?? 0,
        resourceRadianceDelta: reward.radiance ?? 0,
        resourceShardsDelta: sumResourceRewardShardDelta(reward),
        runeDelta: 0,
        playerLevel: player.level,
      });
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }
}
