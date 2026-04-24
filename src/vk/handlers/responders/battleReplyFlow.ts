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
  createKeyboardClear,
  createMainMenuKeyboard,
} from '../../keyboards';
import {
  renderBattle,
  renderExplorationEvent,
} from '../../presenters/messages';
import { replyWithPendingRewardCard } from './rewardReplyFlow';

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

const resolveViewerPlayerId = (battle: BattleView, vkId?: number): number | undefined => {
  if (vkId === undefined || !battle.party) {
    return undefined;
  }

  return battle.party.members.find((member) => member.vkId === vkId)?.playerId;
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

export const resolveBattleReplyKeyboard = (
  battle: BattleView,
  viewerPlayerId?: number,
  player?: PlayerState,
): ReturnType<typeof createBattleKeyboard> => {
  if (battle.status !== 'ACTIVE') {
    return createBattleResultKeyboard(battle);
  }

  if (battle.party && viewerPlayerId !== undefined && battle.party.currentTurnPlayerId !== viewerPlayerId) {
    return createKeyboardClear();
  }

  return createBattleKeyboard(battle, player);
};

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
  const viewerPlayerId = resolveViewerPlayerId(battle, vkId);

  if (battle.status === 'ACTIVE') {
    const player = vkId === undefined
      ? null
      : await services.getPlayerProfile.execute(vkId);

    await ctx.reply(
      renderBattle(battle, undefined, undefined, viewerPlayerId),
      { keyboard: resolveBattleReplyKeyboard(battle, viewerPlayerId, player ?? undefined) },
    );
    return;
  }

  const player = result.player ?? (vkId === undefined
    ? null
    : await services.getPlayerProfile.execute(vkId));

  if (battle.result === 'VICTORY' && player) {
    const pendingReward = await services.getPendingReward.execute(player.vkId);
    if (pendingReward.pendingReward) {
      await replyWithPendingRewardCard(ctx, pendingReward.pendingReward, result.acquisitionSummary);
      await telemetry.trackFirstSchoolPresented(player, result.acquisitionSummary);
      await telemetry.trackPostSessionNextGoalShown(player, battle);
      return;
    }
  }

  await ctx.reply(
    renderBattle(battle, player ?? undefined, result.acquisitionSummary, viewerPlayerId),
    { keyboard: createBattleResultKeyboard(battle, player ?? undefined) },
  );

  if (player) {
    await telemetry.trackFirstSchoolPresented(player, result.acquisitionSummary);
    await telemetry.trackPostSessionNextGoalShown(player, battle);
  }
};
