import type { Context } from 'vk-io';

import type { AppServices } from '../../app/composition-root';
import type { ReturnToAdventureReplayResult } from '../../modules/exploration/application/use-cases/ReturnToAdventure';
import type { SkipTutorialReplayResult } from '../../modules/exploration/application/use-cases/SkipTutorial';
import {
  isExplorePartyEventResult,
  type ExplorePartyEventResult,
} from '../../modules/party/application/use-cases/ExploreParty';
import type { JoinPartyResult } from '../../modules/party/application/use-cases/JoinParty';
import { AppError, isAppError } from '../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../shared/types/game';
import { Logger } from '../../utils/logger';
import { createEntryKeyboard, createMainMenuKeyboard, createPartyKeyboard } from '../keyboards';
import { renderBattle } from '../presenters/messages';
import { renderPartyLeaderJoinNotification } from '../presenters/partyMessages';
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
  getAlchemyConsumable,
  type AlchemyConsumableCode,
} from '../../modules/consumables/domain/alchemy-consumables';
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
  replyWithSchoolMastery as sendSchoolMastery,
  replyWithWelcome as sendWelcome,
} from './responders/homeReplyFlow';
import {
  replyWithBestiary as sendBestiary,
  replyWithBestiaryEnemy as sendBestiaryEnemy,
  replyWithBestiaryLocation as sendBestiaryLocation,
} from './responders/bestiaryReplyFlow';
import {
  replyWithAltar as sendAltar,
  replyWithRuneDetail as sendRuneDetail,
  replyWithRuneList as sendRuneList,
  replyWithRuneRerollMenu as sendRuneRerollMenu,
  type RuneHubReplyState,
} from './responders/runeReplyFlow';
import {
  replyWithWorkshop as sendWorkshop,
  type WorkshopReplyState,
} from './responders/workshopReplyFlow';
import { replyWithDailyTrace as sendDailyTrace } from './responders/activityReplyFlow';
import {
  replyWithParty as sendParty,
  replyWithPartyExplorationEvent as sendPartyExplorationEvent,
} from './responders/partyReplyFlow';

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

const registrationPromptMessage = [
  'Персонаж ещё не создан.',
  'Нажмите «Начать» или напишите: Начать Лианна.',
].join('\n');

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
      commandArgument: commandEnvelope.commandArgument,
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

        if (await this.replyWithRegistrationPromptIfNeeded(ctx, vkId, error)) {
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

  private async replyWithRegistrationPromptIfNeeded(
    ctx: Context,
    vkId: number,
    error: AppError,
  ): Promise<boolean> {
    if (error.code === 'player_not_found') {
      await this.reply(ctx, error.message, createEntryKeyboard());
      return true;
    }

    if (error.code !== 'unknown_command') {
      return false;
    }

    try {
      await this.services.getPlayerProfile.execute(vkId);
      return false;
    } catch (profileError) {
      if (isAppError(profileError) && profileError.code === 'player_not_found') {
        await this.reply(ctx, registrationPromptMessage, createEntryKeyboard());
        return true;
      }

      return false;
    }
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

  public async showSchoolMastery(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await sendSchoolMastery(ctx, player);
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

  public async showParty(ctx: Context, vkId: number): Promise<void> {
    const view = await this.services.getParty.execute(vkId);
    await sendParty(ctx, view);
  }

  public async createParty(ctx: Context, vkId: number): Promise<void> {
    const result = await this.services.createParty.execute(vkId);
    await sendParty(ctx, result);
  }

  public async joinParty(ctx: Context, vkId: number, inviteCode: string): Promise<void> {
    const result = await this.services.joinParty.execute(vkId, inviteCode);
    await sendParty(ctx, result);
    await this.notifyPartyLeaderAboutJoin(ctx, result);
  }

  public async leaveParty(ctx: Context, vkId: number): Promise<void> {
    const result = await this.services.leaveParty.execute(vkId);
    await sendParty(ctx, result);
  }

  public async disbandParty(ctx: Context, vkId: number): Promise<void> {
    const result = await this.services.disbandParty.execute(vkId);
    await sendParty(ctx, result);
  }

  public async claimDailyTrace(ctx: Context, vkId: number, context: CommandIntentContext): Promise<void> {
    const routeState = toRouteState(context);
    const result = await this.services.claimDailyTrace.execute(
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );

    await sendDailyTrace(ctx, result);
  }

  public async openQuestBook(ctx: Context, vkId: number, pageNumber = 1): Promise<void> {
    const book = await this.services.getQuestBook.execute(vkId);
    await sendQuestBook(ctx, book, pageNumber);
  }

  public async openBestiary(ctx: Context, vkId: number, pageNumber = 1): Promise<void> {
    const bestiary = await this.services.getBestiary.execute(vkId, pageNumber);
    await sendBestiary(ctx, bestiary);
  }

  public async openBestiaryLocation(
    ctx: Context,
    vkId: number,
    biomeCode: string,
    enemyPageNumber = 1,
  ): Promise<void> {
    const bestiaryLocation = await this.services.getBestiary.executeLocation(vkId, biomeCode, enemyPageNumber);
    await sendBestiaryLocation(ctx, bestiaryLocation);
  }

  public async openBestiaryEnemy(
    ctx: Context,
    vkId: number,
    biomeCode: string,
    enemyCode: string,
  ): Promise<void> {
    const bestiaryEnemy = await this.services.getBestiary.executeEnemy(vkId, biomeCode, enemyCode);
    await sendBestiaryEnemy(ctx, bestiaryEnemy);
  }

  public async claimBestiaryLocationReward(ctx: Context, vkId: number, biomeCode: string): Promise<void> {
    const bestiaryLocation = await this.services.getBestiary.claimLocationReward(vkId, biomeCode);
    await sendBestiaryLocation(ctx, bestiaryLocation);
  }

  public async claimBestiaryEnemyReward(
    ctx: Context,
    vkId: number,
    biomeCode: string,
    enemyCode: string,
  ): Promise<void> {
    const bestiaryEnemy = await this.services.getBestiary.claimEnemyReward(vkId, biomeCode, enemyCode);
    await sendBestiaryEnemy(ctx, bestiaryEnemy);
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

  public async startGame(ctx: Context, vkId: number, requestedName?: string): Promise<void> {
    const result = requestedName
      ? await this.services.registerPlayer.execute(vkId, requestedName)
      : await this.services.registerPlayer.execute(vkId);
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

  public async exploreParty(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    if (await sendPendingRewardIfAny(ctx, this.services, player)) {
      return;
    }

    const result = await this.services.exploreParty.execute(vkId);
    if (isExplorePartyEventResult(result)) {
      await sendPartyExplorationEvent(ctx, result, vkId);
      await this.notifyPartyExplorationEventPeers(ctx, result, vkId);
      return;
    }

    await this.replyWithBattle(ctx, result, vkId);
    await this.notifyPartyBattlePeers(ctx, result, vkId);
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
      if (result.replayed !== true) {
        await this.notifyPartyBattlePeers(ctx, result.battle, vkId);
      }
    } catch (error) {
      if (isAppError(error)) {
        const activeBattle = await this.safeGetActiveBattle(vkId);
        if (activeBattle) {
          await this.reply(
            ctx,
            [error.message, '', renderBattle(
              activeBattle,
              undefined,
              undefined,
              this.resolveBattleViewerPlayerId(activeBattle, vkId),
            )].join('\n'),
            this.resolveBattleKeyboard(activeBattle, vkId),
          );
          return;
        }
      }

      throw error;
    }
  }

  public async useConsumableCommand(
    ctx: Context,
    vkId: number,
    consumableCode: AlchemyConsumableCode,
    context: CommandIntentContext,
  ): Promise<void> {
    const activeBattle = await this.safeGetActiveBattle(vkId);
    if (activeBattle) {
      await this.executeBattleAction(ctx, vkId, getAlchemyConsumable(consumableCode).battleAction, context);
      return;
    }

    const routeState = toRouteState(context);
    const result = await this.services.useConsumable.execute(
      vkId,
      consumableCode,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
    const view = await this.services.getWorkshop.execute(vkId);
    await this.replyWithWorkshop(ctx, {
      view,
      acquisitionSummary: result.acquisitionSummary,
    });
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

  public async openWorkshop(ctx: Context, vkId: number): Promise<void> {
    const view = await this.services.getWorkshop.execute(vkId);
    await this.replyWithWorkshop(ctx, view);
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

  public async replyWithWorkshop(ctx: Context, state: WorkshopReplyState): Promise<void> {
    await sendWorkshop(ctx, state);
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

  public resolveBattleKeyboard(battle: BattleView, viewerVkId?: number): ReplyKeyboard {
    return resolveBattleReplyKeyboard(battle, this.resolveBattleViewerPlayerId(battle, viewerVkId));
  }

  private resolveErrorKeyboard(errorCode: string): ReplyKeyboard {
    return isErrorKeyboardCode(errorCode)
      ? errorCodeKeyboardFactoryByCode[errorCode]?.() ?? createMainMenuKeyboard()
      : createMainMenuKeyboard();
  }

  public async reply(ctx: Context, message: string, keyboard: ReplyKeyboard): Promise<void> {
    await ctx.reply(message, { keyboard });
  }

  private async notifyPartyBattlePeers(ctx: Context, battle: BattleView, actorVkId: number): Promise<void> {
    if (!battle.party) {
      return;
    }

    for (const member of battle.party.members) {
      if (member.vkId === actorVkId) {
        continue;
      }

      const peerContext = this.createPeerReplyContext(ctx, member.vkId);
      if (!peerContext) {
        continue;
      }

      await this.replyWithBattle(peerContext, battle, member.vkId);
    }
  }

  private async notifyPartyExplorationEventPeers(
    ctx: Context,
    result: ExplorePartyEventResult,
    actorVkId: number,
  ): Promise<void> {
    for (const member of result.members) {
      if (member.player.vkId === actorVkId) {
        continue;
      }

      const peerContext = this.createPeerReplyContext(ctx, member.player.vkId);
      if (!peerContext) {
        continue;
      }

      await sendPartyExplorationEvent(peerContext, result, member.player.vkId);
    }
  }

  private async notifyPartyLeaderAboutJoin(ctx: Context, result: JoinPartyResult): Promise<void> {
    if (!result.joinedNow) {
      return;
    }

    const leader = result.party.members.find((member) => member.playerId === result.party.leaderPlayerId);
    if (!leader || leader.vkId === result.player.vkId) {
      return;
    }

    const leaderContext = this.createPeerReplyContext(ctx, leader.vkId);
    if (!leaderContext) {
      return;
    }

    await this.reply(
      leaderContext,
      renderPartyLeaderJoinNotification(result.player, result.party),
      createPartyKeyboard(result.party, leader.playerId),
    );
  }

  private createPeerReplyContext(ctx: Context, vkId: number): Context | null {
    const send = (ctx as Context & {
      readonly api?: {
        readonly messages?: {
          readonly send?: (options: {
            readonly user_id: number;
            readonly message: string;
            readonly keyboard: ReplyKeyboard;
            readonly random_id: number;
          }) => Promise<unknown>;
        };
      };
    }).api?.messages?.send;

    if (typeof send !== 'function') {
      return null;
    }

    let nextRandomId = Date.now() + vkId;

    const peerContext = {
      reply: async (message: string, options?: { keyboard?: ReplyKeyboard }) => {
        await send({
          user_id: vkId,
          message,
          keyboard: options?.keyboard ?? createMainMenuKeyboard(),
          random_id: nextRandomId++,
        });
      },
    } satisfies Pick<Context, 'reply'>;

    return peerContext as unknown as Context;
  }

  private resolveBattleViewerPlayerId(battle: BattleView, viewerVkId?: number): number | undefined {
    if (viewerVkId === undefined || !battle.party) {
      return undefined;
    }

    return battle.party.members.find((member) => member.vkId === viewerVkId)?.playerId;
  }
}
