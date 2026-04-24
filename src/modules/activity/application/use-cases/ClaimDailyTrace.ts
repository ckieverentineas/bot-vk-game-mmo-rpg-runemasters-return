import { Logger } from '../../../../utils/logger';
import type { PlayerState } from '../../../../shared/types/game';
import { sumResourceRewardShardDelta } from '../../../shared/application/resource-reward-summary';
import { trackRewardEconomyTelemetry } from '../../../rewards/application/reward-economy-telemetry';
import {
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type {
  DailyActivityRewardClaimResult,
  GameRepository,
} from '../../../shared/application/ports/GameRepository';
import type { CommandIntentReplayRepository } from '../../../shared/application/ports/repository-scopes';
import type {
  DailyTraceTelemetryPayload,
  GameTelemetry,
} from '../../../shared/application/ports/GameTelemetry';
import { buildDailyActivitySourceId } from '../../../shared/domain/contracts/daily-activity-ledger';
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

type ClaimDailyTraceRepository = CommandIntentReplayRepository & Pick<
  GameRepository,
  'findPlayerByVkId' | 'claimDailyActivityReward'
>;

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
    private readonly repository: ClaimDailyTraceRepository,
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
    await trackRewardEconomyTelemetry(this.telemetry, claim.player.userId, {
      sourceType: 'DAILY_TRACE',
      sourceId: buildDailyActivitySourceId(trace.activityCode, trace.gameDay),
      reward: claim.reward,
      claimed: claim.claimed,
      playerLevel: claim.player.level,
    });

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
}
