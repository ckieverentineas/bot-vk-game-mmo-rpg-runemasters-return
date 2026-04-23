import type { Context } from 'vk-io';

import type { AppServices } from '../../../app/composition-root';
import type { BattleActionResultView } from '../../../modules/combat/application/use-cases/PerformBattleAction';
import {
  type ExploreLocationEventResult,
  type ExploreLocationReplayResult,
  isExploreLocationEventResult,
} from '../../../modules/exploration/application/use-cases/ExploreLocation';
import type { AcquisitionSummaryView } from '../../../modules/player/application/read-models/acquisition-summary';
import type { BattleView, PlayerState } from '../../../shared/types/game';
import {
  createBattleKeyboard,
  createBattleResultKeyboard,
  createMainMenuKeyboard,
  createPendingRewardKeyboard,
} from '../../keyboards';
import {
  renderBattle,
  renderExplorationEvent,
  renderPendingReward,
} from '../../presenters/messages';

type BattleReplyServices = Pick<AppServices, 'getPendingReward' | 'getPlayerProfile'>;

export type BattleReplyState = BattleView | BattleActionResultView | ExploreLocationReplayResult;
export type ExplorationReplyState = BattleReplyState | ExploreLocationEventResult;

export type BattleReplyTelemetry = {
  readonly trackFirstSchoolPresented: (
    player: PlayerState,
    acquisitionSummary: AcquisitionSummaryView | null | undefined,
  ) => Promise<void>;
  readonly trackPostSessionNextGoalShown: (player: PlayerState, battle: BattleView) => Promise<void>;
};

const normalizeBattleReplyState = (state: BattleReplyState): BattleActionResultView => (
  'battle' in state
    ? {
        battle: state.battle,
        player: 'player' in state ? state.player ?? null : null,
        acquisitionSummary: 'acquisitionSummary' in state ? state.acquisitionSummary ?? null : null,
        ...('replayed' in state && state.replayed === true ? { replayed: true as const } : {}),
      }
    : {
        battle: state,
        player: null,
        acquisitionSummary: null,
      }
);

export const resolveBattleReplyKeyboard = (battle: BattleView): ReturnType<typeof createBattleKeyboard> => (
  battle.status === 'ACTIVE' ? createBattleKeyboard(battle) : createBattleResultKeyboard(battle)
);

export const replyWithExplorationResult = async (
  ctx: Context,
  services: BattleReplyServices,
  state: ExplorationReplyState,
  telemetry: BattleReplyTelemetry,
  vkId?: number,
): Promise<void> => {
  if (isExploreLocationEventResult(state)) {
    await ctx.reply(
      renderExplorationEvent(state.event, state.player),
      { keyboard: createMainMenuKeyboard(state.player) },
    );
    return;
  }

  await replyWithBattle(ctx, services, state, telemetry, vkId);
};

export const replyWithBattle = async (
  ctx: Context,
  services: BattleReplyServices,
  state: BattleReplyState,
  telemetry: BattleReplyTelemetry,
  vkId?: number,
): Promise<void> => {
  const result = normalizeBattleReplyState(state);
  const battle = result.battle;

  if (battle.status === 'ACTIVE') {
    await ctx.reply(renderBattle(battle), { keyboard: resolveBattleReplyKeyboard(battle) });
    return;
  }

  const player = result.player ?? (vkId === undefined
    ? null
    : await services.getPlayerProfile.execute(vkId));

  if (battle.result === 'VICTORY' && player) {
    const pendingReward = await services.getPendingReward.execute(player.vkId);
    if (pendingReward.pendingReward) {
      await ctx.reply(
        renderPendingReward(pendingReward.pendingReward, result.acquisitionSummary),
        { keyboard: createPendingRewardKeyboard(pendingReward.pendingReward) },
      );
      await telemetry.trackFirstSchoolPresented(player, result.acquisitionSummary);
      await telemetry.trackPostSessionNextGoalShown(player, battle);
      return;
    }
  }

  await ctx.reply(
    renderBattle(battle, player ?? undefined, result.acquisitionSummary),
    { keyboard: createBattleResultKeyboard(battle, player ?? undefined) },
  );

  if (player) {
    await telemetry.trackFirstSchoolPresented(player, result.acquisitionSummary);
    await telemetry.trackPostSessionNextGoalShown(player, battle);
  }
};
