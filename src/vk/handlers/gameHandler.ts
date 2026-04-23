import type { Context } from 'vk-io';

import type { AppServices } from '../../app/composition-root';
import type { ReturnToAdventureReplayResult } from '../../modules/exploration/application/use-cases/ReturnToAdventure';
import type { SkipTutorialReplayResult } from '../../modules/exploration/application/use-cases/SkipTutorial';
import { AppError, isAppError } from '../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../shared/types/game';
import { Logger } from '../../utils/logger';
import { createMainMenuKeyboard } from '../keyboards';
import { renderBattle, renderDailyTrace } from '../presenters/messages';
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
import { GameHandlerTelemetry } from './gameHandlerTelemetry';
import type { TrophyActionCode } from '../../modules/rewards/domain/trophy-actions';
import {
  replyWithBattle as sendBattle,
  replyWithExplorationResult as sendExplorationResult,
  resolveBattleReplyKeyboard,
  type BattleReplyState,
  type ExplorationReplyState,
} from './responders/battleReplyFlow';
import {
  replyWithCollectedPendingReward as sendCollectedPendingReward,
  replyWithPendingRewardIfAny as sendPendingRewardIfAny,
  replyWithPendingRewardScreen as sendPendingRewardScreen,
} from './responders/rewardReplyFlow';
import {
  replyWithQuestBook as sendQuestBook,
  replyWithQuestClaimResult as sendQuestClaimResult,
} from './responders/questReplyFlow';
import {
  replyWithDeleteConfirmation as sendDeleteConfirmation,
  replyWithDeletedPlayer as sendDeletedPlayer,
  replyWithInventory as sendInventory,
  replyWithLocation as sendLocation,
  replyWithMainMenu as sendMainMenu,
  replyWithProfile as sendProfile,
  replyWithReturnRecap as sendReturnRecap,
  replyWithWelcome as sendWelcome,
} from './responders/homeReplyFlow';
import {
  replyWithBestiary as sendBestiary,
  replyWithBestiaryLocation as sendBestiaryLocation,
} from './responders/bestiaryReplyFlow';
import {
  replyWithAltar as sendAltar,
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

const normalizeTutorialRouteReplyState = (state: TutorialRouteReplyState): { player: PlayerState; replayed: boolean } => (
  'player' in state
    ? { player: state.player, replayed: 'replayed' in state && state.replayed === true }
    : { player: state, replayed: false }
);

export class GameHandler {
  private readonly handlerTelemetry: GameHandlerTelemetry;

  public constructor(public readonly services: AppServices) {
    this.handlerTelemetry = new GameHandlerTelemetry(services.telemetry);
  }

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
    await sendMainMenu(ctx, player);
  }

  public async showProfile(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await sendProfile(ctx, player);
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
    await sendDeleteConfirmation(ctx, player);
  }

  public async deletePlayer(
    ctx: Context,
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'] = null,
  ): Promise<void> {
    await this.services.deletePlayer.execute(vkId, intentId, intentStateKey, intentSource);
    await sendDeletedPlayer(ctx);
  }

  public async showInventory(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await sendInventory(ctx, player);
  }

  public async claimDailyTrace(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const routeState = toRouteState(context);
    const result = await this.services.claimDailyTrace.execute(
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );

    await this.reply(ctx, renderDailyTrace(result), createMainMenuKeyboard(result.player));
  }

  public async openQuestBook(ctx: Context, vkId: number, pageNumber = 1): Promise<void> {
    const book = await this.services.getQuestBook.execute(vkId);
    await sendQuestBook(ctx, book, pageNumber);
  }

  public async openBestiary(ctx: Context, vkId: number, pageNumber = 1): Promise<void> {
    const bestiary = await this.services.getBestiary.execute(vkId, pageNumber);
    await sendBestiary(ctx, bestiary);
  }

  public async openBestiaryLocation(ctx: Context, vkId: number, biomeCode: string): Promise<void> {
    const bestiaryLocation = await this.services.getBestiary.executeLocation(vkId, biomeCode);
    await sendBestiaryLocation(ctx, bestiaryLocation);
  }

  public async claimQuestReward(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const result = context.intentSource === 'legacy_text'
      ? await this.services.claimQuestReward.execute(vkId, {
          intentId: context.intentId ?? undefined,
          intentSource: context.intentSource,
        })
      : await this.services.claimQuestReward.execute(vkId, context.stateKey ?? undefined);
    await sendQuestClaimResult(ctx, result);
  }

  public async startGame(ctx: Context, vkId: number): Promise<void> {
    const result = await this.services.registerPlayer.execute(vkId);
    if (!result.created && await sendPendingRewardIfAny(ctx, this.services, result.player)) {
      return;
    }

    await sendWelcome(ctx, result.player, result.created);

    if (!result.created) {
      await this.handlerTelemetry.trackReturnRecapShown(result.player, 'start_existing');
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
    await sendLocation(ctx, player);
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
    await sendReturnRecap(ctx, result.player);
    await this.handlerTelemetry.trackReturnRecapShown(result.player, entrySurface);
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
      await this.handlerTelemetry.trackSchoolNoviceRuneHubOpen(player);
    }
  }

  public async openRuneAltar(ctx: Context, vkId: number, trackSchoolNoviceOpen = false): Promise<void> {
    const player = await this.services.getRuneCollection.execute(vkId);
    await this.replyWithAltar(ctx, player);
    if (trackSchoolNoviceOpen) {
      await this.handlerTelemetry.trackSchoolNoviceRuneHubOpen(player);
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
    await this.replyWithAltar(ctx, result);
  }

  public async destroyCurrentRuneCommand(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const routeState = toRouteState(context);
    const player = await this.services.destroyCurrentRune.execute(
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
    await this.replyWithAltar(ctx, player);
  }

  public async replyWithRuneList(ctx: Context, state: RuneHubReplyState): Promise<void> {
    await sendRuneList(ctx, state);
  }

  public async replyWithRuneDetail(ctx: Context, state: RuneHubReplyState): Promise<void> {
    await sendRuneDetail(ctx, state);
  }

  public async replyWithAltar(ctx: Context, state: RuneHubReplyState): Promise<void> {
    await sendAltar(ctx, state);
  }

  public async replyWithRuneRerollMenu(ctx: Context, player: PlayerState): Promise<void> {
    await sendRuneRerollMenu(ctx, player);
  }

  private async replyWithExplorationResult(ctx: Context, state: ExplorationReplyState, vkId?: number): Promise<void> {
    await sendExplorationResult(ctx, this.services, state, this.handlerTelemetry.createBattleReplyTelemetry(), vkId);
  }

  private async replyWithBattle(ctx: Context, state: BattleReplyState, vkId?: number): Promise<void> {
    await sendBattle(ctx, this.services, state, this.handlerTelemetry.createBattleReplyTelemetry(), vkId);
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
}
