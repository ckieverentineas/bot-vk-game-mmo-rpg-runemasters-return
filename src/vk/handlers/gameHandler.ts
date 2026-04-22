import type { Context } from 'vk-io';

import type { AppServices } from '../../app/composition-root';
import { getSchoolNovicePathDefinitionForEnemy } from '../../modules/player/domain/school-novice-path';
import type { ReturnToAdventureReplayResult } from '../../modules/exploration/application/use-cases/ReturnToAdventure';
import type { SkipTutorialReplayResult } from '../../modules/exploration/application/use-cases/SkipTutorial';
import {
  type AcquisitionSummaryView,
} from '../../modules/player/application/read-models/acquisition-summary';
import { buildBattleResultNextGoalView, buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import { getEquippedRune } from '../../modules/player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../modules/runes/domain/rune-schools';
import { AppError, isAppError } from '../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../shared/types/game';
import { Logger } from '../../utils/logger';
import {
  createDeleteConfirmationKeyboard,
  createEntryKeyboard,
  createMainMenuKeyboard,
  createProfileKeyboard,
  createTutorialKeyboard,
} from '../keyboards';
import {
  renderBattle,
  renderInventory,
  renderLocation,
  renderMainMenu,
  renderProfile,
  renderReturnRecap,
  renderWelcome,
} from '../presenters/messages';
import { resolveCommandEnvelope } from '../router/commandRouter';
import {
  config,
  dynamicCommandConfig,
  errorCodeKeyboardFactoryByCode,
  GameCommandType,
  isErrorKeyboardCode,
  toRouteState,
  type CommandIntentContext,
  type StaticCommandHandler,
} from './gameCommandRoutes';
import {
  recoverableCommandErrorCodes,
  recoveryRules,
} from './gameCommandRecovery';
import type { TrophyActionCode } from '../../modules/rewards/domain/trophy-actions';
import {
  replyWithBattle as sendBattle,
  replyWithExplorationResult as sendExplorationResult,
  resolveBattleReplyKeyboard,
  type BattleReplyTelemetry,
  type BattleReplyState,
  type ExplorationReplyState,
} from './responders/battleReplyFlow';
import {
  replyWithCollectedPendingReward as sendCollectedPendingReward,
  replyWithPendingRewardIfAny as sendPendingRewardIfAny,
  replyWithPendingRewardScreen as sendPendingRewardScreen,
} from './responders/rewardReplyFlow';
import {
  replyWithRuneDetail as sendRuneDetail,
  replyWithRuneList as sendRuneList,
  replyWithRuneRerollMenu as sendRuneRerollMenu,
  type RuneHubReplyState,
} from './responders/runeReplyFlow';

type ReplyKeyboard = ReturnType<typeof createMainMenuKeyboard>;
type TutorialRouteReplyState = PlayerState | SkipTutorialReplayResult | ReturnToAdventureReplayResult;

type TutorialRouteExecutor = (
  intentId?: string,
  stateKey?: string,
  intentSource?: ReturnType<typeof resolveCommandEnvelope>['intentSource'],
) => Promise<TutorialRouteReplyState>;




const formatRuneCountLabel = (count: number): string => {
  const remainder10 = count % 10;
  const remainder100 = count % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return 'руна';
  }

  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return 'руны';
  }

  return 'рун';
};

const normalizeTutorialRouteReplyState = (state: TutorialRouteReplyState): { player: PlayerState; replayed: boolean } => (
  'player' in state
    ? { player: state.player, replayed: 'replayed' in state && state.replayed === true }
    : { player: state, replayed: false }
);

export class GameHandler {
  public constructor(public readonly services: AppServices) {}

  public async handle(ctx: Context): Promise<void> {
    const vkId = this.resolveVkId(ctx);
    if (vkId === null) {
      return;
    }

    const commandEnvelope = resolveCommandEnvelope(ctx);
    if (!commandEnvelope.command) {
      await this.reply(ctx, 'Рунный след неясен. Вернитесь к стоянке и выберите путь заново.', createMainMenuKeyboard());
      return;
    }

    const { command, intentId, stateKey, intentSource } = commandEnvelope;
    const commandContext: CommandIntentContext = {
      intentId,
      stateKey,
      intentSource,
    };

    try {
      const commandHandler = config[command as GameCommandType];
      const isHandled = commandHandler === undefined
        ? await this.handleDynamicCommand(ctx, vkId, command, commandContext)
        : await this.executeStaticCommand(commandHandler, ctx, vkId, commandContext);
      if (!isHandled) {
        throw new AppError('unknown_command', 'Такого пути мастер не знает. Вернитесь к стоянке и выберите другой след.');
      }

    } catch (error) {
      if (isAppError(error)) {
        const recovered = await this.tryRecoverCommandContext(ctx, vkId, command, error);
        if (recovered) {
          return;
        }

        await this.reply(ctx, error.message, this.resolveErrorKeyboard(error.code));
        return;
      }

      Logger.error('Unhandled command error:', error);
      await this.reply(ctx, 'Внутренняя ошибка игрового движка.', createMainMenuKeyboard());
    }
  }

  private async handleDynamicCommand(
    ctx: Context,
    vkId: number,
    command: string,
    context: CommandIntentContext,
  ): Promise<boolean> {
    for (const route of dynamicCommandConfig) {
      if (await route.tryHandle(this, ctx, vkId, command, context)) {
        return true;
      }
    }

    return false;
  }

  private async executeStaticCommand(
    handlerFunction: StaticCommandHandler,
    ctx: Context,
    vkId: number,
    context: CommandIntentContext,
  ): Promise<boolean> {
    await handlerFunction(this, ctx, vkId, context);
    return true;
  }

  private resolveVkId(ctx: Context): number | null {
    const vkId = Number(ctx.senderId);
    return Number.isFinite(vkId) ? vkId : null;
  }

  public async showMainMenu(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(ctx, renderMainMenu(player), createMainMenuKeyboard(player));
  }

  public async showProfile(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.replyWithProfile(ctx, player);
  }

  private async tryRecoverCommandContext(ctx: Context, vkId: number, command: string, error: AppError): Promise<boolean> {
    if (!recoverableCommandErrorCodes.has(error.code)) {
      return false;
    }

    for (const { matches, handle } of recoveryRules) {
      if (!matches(command, error)) {
        continue;
      }

      try {
        const isRecovered = await handle(this, ctx, vkId, command, error);
        if (isRecovered) {
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  public async confirmDeletePlayer(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(
      ctx,
      [
        '⚠️ Удаление персонажа',
        '',
        `Будет удалён герой уровня ${player.level}${player.runes.length > 0 ? ` и ${player.runes.length} ${formatRuneCountLabel(player.runes.length)}` : ''}.`,
        'Это действие необратимо: прогресс и сборка будут удалены.',
        '«🗑️ Да, удалить» — только если действительно хотите начать заново.',
      ].join('\n'),
      createDeleteConfirmationKeyboard(player),
    );
  }

  public async deletePlayer(
    ctx: Context,
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'] = null,
  ): Promise<void> {
    await this.services.deletePlayer.execute(vkId, intentId, intentStateKey, intentSource);
    await this.reply(ctx, 'Персонаж удалён. Можно начать заново в любой момент.', createEntryKeyboard());
  }

  public async showInventory(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(ctx, renderInventory(player), createMainMenuKeyboard(player));
  }

  public async startGame(ctx: Context, vkId: number): Promise<void> {
    const result = await this.services.registerPlayer.execute(vkId);
    if (!result.created && await sendPendingRewardIfAny(ctx, this.services, result.player)) {
      return;
    }

    const keyboard = result.created || result.player.tutorialState === 'ACTIVE'
      ? createTutorialKeyboard(result.player)
      : createMainMenuKeyboard(result.player);
    const message = renderWelcome(result.player, result.created);
    await this.reply(
      ctx,
      message,
      keyboard,
    );

    if (!result.created) {
      await this.trackReturnRecapShown(result.player, 'start_existing');
    }
  }

  public async exploreLocationScreen(
    ctx: Context,
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'] = null,
  ): Promise<void> {
    const player = await this.services.enterTutorialMode.execute(vkId, intentId, intentStateKey, intentSource);
    await this.replyWithLocation(ctx, player);
  }

  public async returnRecapRoute(
    ctx: Context,
    executeRoute: TutorialRouteExecutor,
    entrySurface: 'skip_tutorial' | 'return_to_adventure',
    context: CommandIntentContext,
  ): Promise<void> {
    const routeState = toRouteState(context);
    const result = normalizeTutorialRouteReplyState(await executeRoute(
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    ));
    await this.reply(ctx, renderReturnRecap(result.player, '🧭 Возвращение в приключения'), createMainMenuKeyboard(result.player));
    await this.trackReturnRecapShown(result.player, entrySurface);
  }

  public async exploreNewBattle(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    if (await sendPendingRewardIfAny(ctx, this.services, player)) {
      return;
    }

    const routeState = toRouteState(context);
    const result = await this.services.exploreLocation.execute(vkId, routeState.intentId, routeState.stateKey, routeState.intentSource);
    await this.replyWithExplorationResult(ctx, result, vkId);
  }

  public async showPendingReward(ctx: Context, vkId: number): Promise<void> {
    await sendPendingRewardScreen(ctx, this.services, vkId);
  }

  public async collectPendingReward(
    ctx: Context,
    vkId: number,
    actionCode: TrophyActionCode,
    context: CommandIntentContext,
  ): Promise<void> {
    await sendCollectedPendingReward(ctx, this.services, vkId, actionCode, context.stateKey ?? undefined);
  }

  public async executeBattleAction(
    ctx: Context,
    vkId: number,
    action: BattleActionType,
    context: CommandIntentContext,
  ): Promise<void> {
    try {
      const routeState = toRouteState(context);
      const result = await this.services.performBattleAction.execute(
        vkId,
        action,
        routeState.intentId,
        routeState.stateKey,
        routeState.intentSource,
      );
      await this.replyWithBattle(ctx, result, vkId);
    } catch (error) {
      if (isAppError(error)) {
        const activeBattle = await this.safeGetActiveBattle(vkId);
        if (activeBattle) {
          await this.reply(
            ctx,
            [error.message, '', renderBattle(activeBattle)].join('\n'),
            this.resolveBattleKeyboard(activeBattle),
          );
          return;
        }
      }

      throw error;
    }
  }

  public async openRuneCollection(ctx: Context, vkId: number, trackSchoolNoviceOpen = false): Promise<void> {
    const player = await this.services.getRuneCollection.execute(vkId);
    await this.replyWithRuneList(ctx, player);
    if (trackSchoolNoviceOpen) {
      await this.trackSchoolNoviceRuneHubOpen(player);
    }
  }

  public async openRuneWorkshop(ctx: Context, vkId: number, trackSchoolNoviceOpen = false): Promise<void> {
    const player = await this.services.getRuneCollection.execute(vkId);
    await this.replyWithRuneDetail(ctx, player);
    if (trackSchoolNoviceOpen) {
      await this.trackSchoolNoviceRuneHubOpen(player);
    }
  }

  public async openRuneRerollMenu(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getRuneCollection.execute(vkId);
    await this.replyWithRuneRerollMenu(ctx, player);
  }

  public async equipCurrentRuneSlot(
    ctx: Context,
    vkId: number,
    slotIndex: 0 | 1 | null,
    context: CommandIntentContext,
  ): Promise<void> {
    const routeState = toRouteState(context);
    const player = await this.services.equipCurrentRune.execute(
      vkId,
      slotIndex,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
    await this.replyWithRuneDetail(ctx, player);
  }

  public async unequipCurrentRuneSlot(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const routeState = toRouteState(context);
    const player = await this.services.unequipCurrentRune.execute(
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
    await this.replyWithRuneDetail(ctx, player);
  }

  public async craftRuneCommand(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const routeState = toRouteState(context);
    const result = await this.services.craftRune.execute(
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
    await this.replyWithRuneDetail(ctx, result);
  }

  public async destroyCurrentRuneCommand(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const routeState = toRouteState(context);
    const player = await this.services.destroyCurrentRune.execute(
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
    await this.replyWithRuneDetail(ctx, player);
  }

  private async replyWithProfile(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderProfile(player), createProfileKeyboard(player));
  }

  private async replyWithLocation(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderLocation(player), createTutorialKeyboard(player));
  }

  public async replyWithRuneList(ctx: Context, state: RuneHubReplyState): Promise<void> {
    await sendRuneList(ctx, state);
  }

  public async replyWithRuneDetail(ctx: Context, state: RuneHubReplyState): Promise<void> {
    await sendRuneDetail(ctx, state);
  }

  public async replyWithRuneRerollMenu(ctx: Context, player: PlayerState): Promise<void> {
    await sendRuneRerollMenu(ctx, player);
  }

  private createBattleReplyTelemetry(): BattleReplyTelemetry {
    return {
      trackFirstSchoolPresented: (player, acquisitionSummary) => (
        this.trackFirstSchoolPresented(player, acquisitionSummary)
      ),
      trackPostSessionNextGoalShown: (player, battle) => (
        this.trackPostSessionNextGoalShown(player, battle)
      ),
    };
  }

  private async replyWithExplorationResult(ctx: Context, state: ExplorationReplyState, vkId?: number): Promise<void> {
    await sendExplorationResult(ctx, this.services, state, this.createBattleReplyTelemetry(), vkId);
  }

  private async replyWithBattle(ctx: Context, state: BattleReplyState, vkId?: number): Promise<void> {
    await sendBattle(ctx, this.services, state, this.createBattleReplyTelemetry(), vkId);
  }

  public async safeGetActiveBattle(vkId: number): Promise<BattleView | null> {
    try {
      return await this.services.getActiveBattle.execute(vkId);
    } catch {
      return null;
    }
  }

  public resolveBattleKeyboard(battle: BattleView): ReplyKeyboard {
    return resolveBattleReplyKeyboard(battle);
  }

  private resolveErrorKeyboard(errorCode: string): ReplyKeyboard {
    return isErrorKeyboardCode(errorCode)
      ? errorCodeKeyboardFactoryByCode[errorCode]?.() ?? createMainMenuKeyboard()
      : createMainMenuKeyboard();
  }

  public async reply(ctx: Context, message: string, keyboard: ReplyKeyboard): Promise<void> {
    await ctx.reply(message, { keyboard });
  }

  private async trackReturnRecapShown(
    player: PlayerState,
    entrySurface: 'start_existing' | 'skip_tutorial' | 'return_to_adventure',
  ): Promise<void> {
    const nextGoal = buildPlayerNextGoalView(player);
    await this.safeTrack(async () => {
      await this.services.telemetry.returnRecapShown(player.userId, {
        entrySurface,
        hasEquippedRune: getEquippedRune(player) !== null,
        currentSchoolCode: getSchoolDefinitionForArchetype(getEquippedRune(player)?.archetypeCode)?.code ?? null,
        nextStepType: nextGoal.goalType,
      });
    });
  }

  private async trackPostSessionNextGoalShown(player: PlayerState, battle: BattleView): Promise<void> {
    const nextGoal = buildBattleResultNextGoalView(battle, player);
    if (!nextGoal || !battle.result || battle.result === 'FLED') {
      return;
    }

    const battleOutcome = battle.result;
    const battleSchoolCode = battle.player.runeLoadout?.schoolCode
      ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
      ?? null;
    const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
    const isSchoolNoviceElite = novicePath !== null && novicePath.schoolCode === battleSchoolCode;

    await this.safeTrack(async () => {
      await this.services.telemetry.postSessionNextGoalShown(player.userId, {
        battleOutcome,
        hadRuneDrop: battle.rewards?.droppedRune != null,
        suggestedGoalType: nextGoal.goalType,
        enemyCode: battle.enemy.code,
        battleSchoolCode,
        isSchoolNoviceElite,
      });
    });
  }

  private async trackFirstSchoolPresented(
    player: PlayerState,
    acquisitionSummary: AcquisitionSummaryView | null | undefined,
  ): Promise<void> {
    const recognition = buildPlayerSchoolRecognitionView(player);
    const selectedRune = player.runes[player.currentRuneIndex] ?? player.runes[0] ?? null;
    const firstRuneSchoolCode = getSchoolDefinitionForArchetype(selectedRune?.archetypeCode)?.code ?? null;

    const schoolPresentation = acquisitionSummary?.kind === 'school_trial_completed'
      ? {
        schoolCode: recognition?.schoolCode ?? null,
        presentationReason: 'school_trial_completed' as const,
      }
      : acquisitionSummary?.kind === 'new_rune' && player.runes.length === 1
        ? {
          schoolCode: firstRuneSchoolCode,
          presentationReason: 'first_rune_reward' as const,
        }
        : null;

    const schoolCode = schoolPresentation?.schoolCode;
    if (!schoolPresentation || !schoolCode) {
      return;
    }

    await this.safeTrack(async () => {
      await this.services.telemetry.firstSchoolPresented(player.userId, {
        schoolCode,
        presentationSurface: 'battle_result',
        presentationReason: schoolPresentation.presentationReason,
      });
    });
  }

  private async trackSchoolNoviceRuneHubOpen(player: PlayerState): Promise<void> {
    const recognition = buildPlayerSchoolRecognitionView(player);
    const nextGoal = buildPlayerNextGoalView(player);

    if (!recognition || recognition.signEquipped || nextGoal.goalType !== 'equip_school_sign') {
      return;
    }

    await this.safeTrack(async () => {
      await this.services.telemetry.schoolNoviceFollowUpActionTaken(player.userId, {
        schoolCode: recognition.schoolCode,
        currentGoalType: nextGoal.goalType,
        actionType: 'open_runes',
        signEquipped: false,
        usedSchoolSign: false,
        battleId: null,
        enemyCode: null,
      });
    });
  }

  private async safeTrack(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }
}



