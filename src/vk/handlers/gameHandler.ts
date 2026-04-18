import type { Context } from 'vk-io';

import type { AppServices } from '../../app/composition-root';
import { AppError, isAppError } from '../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../shared/types/game';
import { Logger } from '../../utils/logger';
import {
  gameCommands,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
  resolveStatAllocationCommand,
} from '../commands/catalog';
import {
  createBattleKeyboard,
  createBattleResultKeyboard,
  createDeleteConfirmationKeyboard,
  createEntryKeyboard,
  createMainMenuKeyboard,
  createProfileKeyboard,
  createRuneKeyboard,
  createRuneRerollKeyboard,
  createTutorialKeyboard,
} from '../keyboards';
import {
  renderAltar,
  renderBattle,
  renderInventory,
  renderLocation,
  renderMainMenu,
  renderProfile,
  renderReturnRecap,
  renderRuneScreen,
  renderWelcome,
} from '../presenters/messages';
import { resolveCommandEnvelope } from '../router/commandRouter';

type ReplyKeyboard = ReturnType<typeof createMainMenuKeyboard>;

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

export class GameHandler {
  public constructor(private readonly services: AppServices) {}

  public async handle(ctx: Context): Promise<void> {
    const vkId = this.resolveVkId(ctx);
    if (vkId === null) {
      return;
    }

    const commandEnvelope = resolveCommandEnvelope(ctx);
    if (!commandEnvelope.command) {
      await this.reply(ctx, 'Команда не распознана.', createMainMenuKeyboard());
      return;
    }

    const { command, intentId, stateKey, intentSource } = commandEnvelope;

    try {
      if (command === gameCommands.start) {
        const result = await this.services.registerPlayer.execute(vkId);
        const keyboard = result.created || result.player.tutorialState === 'ACTIVE'
          ? createTutorialKeyboard(result.player)
          : createMainMenuKeyboard(result.player);
        await this.reply(
          ctx,
          renderWelcome(result.player, result.created),
          keyboard,
        );
        return;
      }

      switch (command) {
        case gameCommands.backToMenu: {
          await this.showMainMenu(ctx, vkId);
          return;
        }
        case gameCommands.profile: {
          await this.showProfile(ctx, vkId);
          return;
        }
        case gameCommands.deletePlayer: {
          await this.confirmDeletePlayer(ctx, vkId);
          return;
        }
        case gameCommands.confirmDeletePlayer: {
          await this.deletePlayer(ctx, vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          return;
        }
        case gameCommands.inventory: {
          await this.showInventory(ctx, vkId);
          return;
        }
        case gameCommands.location: {
          await this.showLocation(ctx, vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          return;
        }
        case gameCommands.skipTutorial: {
          const player = await this.services.skipTutorial.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.reply(ctx, renderReturnRecap(player, '🧭 Возвращение в приключения'), createMainMenuKeyboard(player));
          return;
        }
        case gameCommands.returnToAdventure: {
          const player = await this.services.returnToAdventure.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.reply(ctx, renderReturnRecap(player, '🧭 Возвращение в приключения'), createMainMenuKeyboard(player));
          return;
        }
        case gameCommands.resetStats: {
          const player = await this.services.resetAllocatedStats.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.replyWithProfile(ctx, player);
          return;
        }
        case gameCommands.explore: {
          const battle = await this.services.exploreLocation.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.replyWithBattle(ctx, battle, vkId);
          return;
        }
        case gameCommands.attack: {
          await this.useBattleAction(ctx, vkId, 'ATTACK', intentId ?? undefined, stateKey ?? undefined, intentSource);
          return;
        }
        case gameCommands.defend: {
          await this.useBattleAction(ctx, vkId, 'DEFEND', intentId ?? undefined, stateKey ?? undefined, intentSource);
          return;
        }
        case gameCommands.skills:
        case gameCommands.spell: {
          await this.useBattleAction(ctx, vkId, 'RUNE_SKILL', intentId ?? undefined, stateKey ?? undefined, intentSource);
          return;
        }
        case gameCommands.runeCollection: {
          const player = await this.services.getRuneCollection.execute(vkId);
          await this.replyWithRuneHub(ctx, player);
          return;
        }
        case gameCommands.equipRune: {
          const player = await this.services.equipCurrentRune.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.replyWithRuneHub(ctx, player);
          return;
        }
        case gameCommands.unequipRune: {
          const player = await this.services.unequipCurrentRune.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.replyWithRuneHub(ctx, player);
          return;
        }
        case gameCommands.altar: {
          const player = await this.services.getRuneCollection.execute(vkId);
          await this.replyWithRuneHub(ctx, player);
          return;
        }
        case gameCommands.craftRune: {
          const player = await this.services.craftRune.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.replyWithRuneHub(ctx, player);
          return;
        }
        case gameCommands.rerollRuneMenu: {
          const player = await this.services.getRuneCollection.execute(vkId);
          await this.reply(ctx, renderAltar(player), createRuneRerollKeyboard(player));
          return;
        }
        case gameCommands.destroyRune: {
          const player = await this.services.destroyCurrentRune.execute(vkId, intentId ?? undefined, stateKey ?? undefined, intentSource);
          await this.replyWithRuneHub(ctx, player);
          return;
        }
        default: {
          await this.handleDynamicCommand(ctx, vkId, command, intentId, stateKey, intentSource);
          return;
        }
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
    intentId: string | null,
    stateKey: string | null,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'],
  ): Promise<void> {
    const allocationStat = resolveStatAllocationCommand(command);
    if (allocationStat) {
      const player = await this.services.allocateStatPoint.execute(vkId, allocationStat, intentId ?? undefined, stateKey ?? undefined, intentSource);
      await this.replyWithProfile(ctx, player);
      return;
    }

    const runeCursorDelta = resolveRuneCursorDeltaCommand(command);
    if (runeCursorDelta !== null) {
      const player = await this.services.moveRuneCursor.execute(vkId, runeCursorDelta, intentId ?? undefined, stateKey ?? undefined, intentSource);
      await this.replyWithRuneHub(ctx, player);
      return;
    }

    const runePageSlot = resolveRunePageSlotCommand(command);
    if (runePageSlot !== null) {
      const player = await this.services.selectRunePageSlot.execute(vkId, runePageSlot, intentId ?? undefined, stateKey ?? undefined, intentSource);
      await this.replyWithRuneHub(ctx, player);
      return;
    }

    const rerollStat = resolveRuneStatRerollCommand(command);
    if (rerollStat) {
      const player = await this.services.rerollCurrentRuneStat.execute(vkId, rerollStat, intentId ?? undefined, stateKey ?? undefined, intentSource);
      await this.reply(ctx, renderAltar(player), createRuneRerollKeyboard(player));
      return;
    }

    throw new AppError('unknown_command', 'Неизвестная команда. Используйте кнопки меню или старые текстовые команды.');
  }

  private resolveVkId(ctx: Context): number | null {
    const vkId = Number(ctx.senderId);
    return Number.isFinite(vkId) ? vkId : null;
  }

  private async showMainMenu(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(ctx, renderMainMenu(player), createMainMenuKeyboard(player));
  }

  private async showProfile(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.replyWithProfile(ctx, player);
  }

  private async tryRecoverCommandContext(ctx: Context, vkId: number, command: string, error: AppError): Promise<boolean> {
    if (!['stale_command_intent', 'command_retry_pending', 'battle_in_progress'].includes(error.code)) {
      return false;
    }

    try {
      if ([gameCommands.location, gameCommands.skipTutorial, gameCommands.returnToAdventure].includes(command as typeof gameCommands.location | typeof gameCommands.skipTutorial | typeof gameCommands.returnToAdventure) && error.code === 'battle_in_progress') {
        const battle = await this.services.getActiveBattle.execute(vkId);
        if (battle) {
          await this.reply(ctx, [error.message, '', renderBattle(battle)].join('\n'), this.resolveBattleKeyboard(battle));
          return true;
        }
      }

      if (command === gameCommands.resetStats || resolveStatAllocationCommand(command)) {
        const player = await this.services.getPlayerProfile.execute(vkId);
        await this.reply(
          ctx,
          [error.message, '', renderProfile(player)].join('\n'),
          createProfileKeyboard(player),
        );
        return true;
      }

      if (command === gameCommands.confirmDeletePlayer) {
        try {
          const player = await this.services.getPlayerProfile.execute(vkId);
          await this.reply(
            ctx,
            [error.message, '', renderProfile(player)].join('\n'),
            createProfileKeyboard(player),
          );
          return true;
        } catch {
          if (error.code === 'command_retry_pending') {
            await this.reply(ctx, 'Персонаж удалён. Можно начать заново в любой момент.', createEntryKeyboard());
            return true;
          }

          return false;
        }
      }

      if (command === gameCommands.explore) {
        const battle = await this.safeGetActiveBattle(vkId);
        if (battle) {
          await this.reply(
            ctx,
            [error.message, '', renderBattle(battle)].join('\n'),
            this.resolveBattleKeyboard(battle),
          );
          return true;
        }

        const player = await this.services.getPlayerProfile.execute(vkId);
        await this.reply(
          ctx,
          [error.message, '', renderLocation(player)].join('\n'),
          createTutorialKeyboard(player),
        );
        return true;
      }

      if ([gameCommands.location, gameCommands.skipTutorial, gameCommands.returnToAdventure].includes(command as typeof gameCommands.location | typeof gameCommands.skipTutorial | typeof gameCommands.returnToAdventure)) {
        const player = await this.services.getPlayerProfile.execute(vkId);
        await this.reply(
          ctx,
          [error.message, '', renderLocation(player)].join('\n'),
          createTutorialKeyboard(player),
        );
        return true;
      }

      if (resolveRuneCursorDeltaCommand(command) !== null || resolveRunePageSlotCommand(command) !== null) {
        const player = await this.services.getRuneCollection.execute(vkId);
        await this.reply(
          ctx,
          [error.message, '', renderRuneScreen(player)].join('\n'),
          createRuneKeyboard(player),
        );
        return true;
      }

      if ([gameCommands.equipRune, gameCommands.unequipRune, gameCommands.craftRune, gameCommands.destroyRune].includes(command as typeof gameCommands.equipRune | typeof gameCommands.destroyRune)) {
        const player = await this.services.getRuneCollection.execute(vkId);
        await this.reply(
          ctx,
          [error.message, '', renderRuneScreen(player)].join('\n'),
          createRuneKeyboard(player),
        );
        return true;
      }

      if (command === gameCommands.rerollRuneMenu || resolveRuneStatRerollCommand(command)) {
        const player = await this.services.getRuneCollection.execute(vkId);
        await this.reply(
          ctx,
          [error.message, '', renderAltar(player)].join('\n'),
          createRuneRerollKeyboard(player),
        );
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  private async confirmDeletePlayer(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(
      ctx,
      [
        '⚠️ Удаление персонажа',
        '',
        `Будет удалён герой уровня ${player.level}${player.runes.length > 0 ? ` и ${player.runes.length} ${formatRuneCountLabel(player.runes.length)}` : ''}.`,
        'Это действие необратимо: прогресс и сборка будут удалены.',
        'Нажмите «🗑️ Да, удалить» только если действительно хотите начать заново.',
      ].join('\n'),
      createDeleteConfirmationKeyboard(player),
    );
  }

  private async deletePlayer(
    ctx: Context,
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'] = null,
  ): Promise<void> {
    await this.services.deletePlayer.execute(vkId, intentId, intentStateKey, intentSource);
    await this.reply(ctx, 'Персонаж удалён. Можно начать заново в любой момент.', createEntryKeyboard());
  }

  private async showInventory(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(ctx, renderInventory(player), createMainMenuKeyboard(player));
  }

  private async showLocation(
    ctx: Context,
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'] = null,
  ): Promise<void> {
    const player = await this.services.enterTutorialMode.execute(vkId, intentId, intentStateKey, intentSource);
    await this.replyWithLocation(ctx, player);
  }

  private async replyWithProfile(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderProfile(player), createProfileKeyboard(player));
  }

  private async replyWithLocation(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderLocation(player), createTutorialKeyboard(player));
  }

  private async replyWithRuneHub(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderRuneScreen(player), createRuneKeyboard(player));
  }

  private async replyWithBattle(ctx: Context, battle: BattleView, vkId?: number): Promise<void> {
    if (battle.status === 'ACTIVE') {
      await this.reply(ctx, renderBattle(battle), this.resolveBattleKeyboard(battle));
      return;
    }

    const player = vkId === undefined
      ? undefined
      : await this.services.getPlayerProfile.execute(vkId);
    await this.reply(ctx, renderBattle(battle), createBattleResultKeyboard(battle, player));
  }

  private async useBattleAction(
    ctx: Context,
    vkId: number,
    action: BattleActionType,
    intentId?: string,
    intentStateKey?: string,
    intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'] = null,
  ): Promise<void> {
    try {
      const battle = await this.services.performBattleAction.execute(vkId, action, intentId, intentStateKey, intentSource);
      await this.replyWithBattle(ctx, battle, vkId);
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

  private async safeGetActiveBattle(vkId: number): Promise<BattleView | null> {
    try {
      return await this.services.getActiveBattle.execute(vkId);
    } catch {
      return null;
    }
  }

  private resolveBattleKeyboard(battle: BattleView): ReplyKeyboard {
    return battle.status === 'ACTIVE' ? createBattleKeyboard(battle) : createBattleResultKeyboard(battle);
  }

  private resolveErrorKeyboard(errorCode: string): ReplyKeyboard {
    if (errorCode === 'player_not_found') {
      return createEntryKeyboard();
    }

    if (['runes_not_found', 'rune_not_found', 'rune_slot_not_found'].includes(errorCode)) {
      return createRuneKeyboard();
    }

    return createMainMenuKeyboard();
  }

  private async reply(ctx: Context, message: string, keyboard: ReplyKeyboard): Promise<void> {
    await ctx.reply(message, { keyboard });
  }
}
