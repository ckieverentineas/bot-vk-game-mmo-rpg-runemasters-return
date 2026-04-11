import type { Context } from 'vk-io';

import type { AppServices } from '../../app/composition-root';
import { AppError, isAppError } from '../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../shared/types/game';
import { Logger } from '../../utils/logger';
import {
  gameCommands,
  isSkillPreviewCommand,
  resolveLocationLevelDeltaCommand,
  resolveRuneCursorDeltaCommand,
  resolveRuneStatRerollCommand,
  resolveStatAllocationCommand,
} from '../commands/catalog';
import {
  createAltarKeyboard,
  createBattleKeyboard,
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
  renderRuneScreen,
  renderWelcome,
} from '../presenters/messages';
import { resolveCommand } from '../router/commandRouter';

type ReplyKeyboard = ReturnType<typeof createMainMenuKeyboard>;

export class GameHandler {
  public constructor(private readonly services: AppServices) {}

  public async handle(ctx: Context): Promise<void> {
    const vkId = this.resolveVkId(ctx);
    if (vkId === null) {
      return;
    }

    const command = resolveCommand(ctx);
    if (!command) {
      await this.reply(ctx, 'Команда не распознана.', createMainMenuKeyboard());
      return;
    }

    try {
      if (command === gameCommands.start) {
        const result = await this.services.registerPlayer.execute(vkId);
        await this.reply(ctx, renderWelcome(result.player, result.created), createMainMenuKeyboard());
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
          await this.deletePlayer(ctx, vkId);
          return;
        }
        case gameCommands.inventory: {
          await this.showInventory(ctx, vkId);
          return;
        }
        case gameCommands.location: {
          await this.showLocation(ctx, vkId);
          return;
        }
        case gameCommands.skipTutorial: {
          const player = await this.services.skipTutorial.execute(vkId);
          await this.replyWithLocation(ctx, player);
          return;
        }
        case gameCommands.returnToAdventure: {
          const player = await this.services.returnToAdventure.execute(vkId);
          await this.reply(ctx, renderMainMenu(player), createMainMenuKeyboard());
          return;
        }
        case gameCommands.resetStats: {
          const player = await this.services.resetAllocatedStats.execute(vkId);
          await this.replyWithProfile(ctx, player);
          return;
        }
        case gameCommands.explore: {
          const battle = await this.services.exploreLocation.execute(vkId);
          await this.replyWithBattle(ctx, battle);
          return;
        }
        case gameCommands.attack: {
          const battle = await this.services.performBattleAction.execute(vkId);
          await this.replyWithBattle(ctx, battle);
          return;
        }
        case gameCommands.skills:
        case gameCommands.spell: {
          await this.replyWithBattleSkillsPreview(ctx, vkId);
          return;
        }
        case gameCommands.runeCollection: {
          const player = await this.services.getRuneCollection.execute(vkId);
          await this.replyWithRuneCollection(ctx, player);
          return;
        }
        case gameCommands.equipRune: {
          const player = await this.services.equipCurrentRune.execute(vkId);
          await this.replyWithRuneCollection(ctx, player);
          return;
        }
        case gameCommands.unequipRune: {
          const player = await this.services.unequipCurrentRune.execute(vkId);
          await this.replyWithRuneCollection(ctx, player);
          return;
        }
        case gameCommands.altar: {
          const player = await this.services.getRuneCollection.execute(vkId);
          await this.replyWithAltar(ctx, player);
          return;
        }
        case gameCommands.craftRune: {
          const player = await this.services.craftRune.execute(vkId);
          await this.replyWithAltar(ctx, player);
          return;
        }
        case gameCommands.rerollRuneMenu: {
          const player = await this.services.getRuneCollection.execute(vkId);
          await this.reply(ctx, renderAltar(player), createRuneRerollKeyboard());
          return;
        }
        case gameCommands.destroyRune: {
          const player = await this.services.destroyCurrentRune.execute(vkId);
          await this.replyWithAltar(ctx, player);
          return;
        }
        default: {
          await this.handleDynamicCommand(ctx, vkId, command);
          return;
        }
      }
    } catch (error) {
      if (isAppError(error)) {
        await this.reply(ctx, error.message, this.resolveErrorKeyboard(error.code));
        return;
      }

      Logger.error('Unhandled command error:', error);
      await this.reply(ctx, 'Внутренняя ошибка игрового движка.', createMainMenuKeyboard());
    }
  }

  private async handleDynamicCommand(ctx: Context, vkId: number, command: string): Promise<void> {
    const allocationStat = resolveStatAllocationCommand(command);
    if (allocationStat) {
      const player = await this.services.allocateStatPoint.execute(vkId, allocationStat);
      await this.replyWithProfile(ctx, player);
      return;
    }

    const locationDelta = resolveLocationLevelDeltaCommand(command);
    if (locationDelta !== null) {
      const player = await this.services.changeLocationLevel.execute(vkId, locationDelta);
      await this.replyWithLocation(ctx, player);
      return;
    }

    const runeCursorDelta = resolveRuneCursorDeltaCommand(command);
    if (runeCursorDelta !== null) {
      const player = await this.services.moveRuneCursor.execute(vkId, runeCursorDelta);
      await this.replyWithRuneCollection(ctx, player);
      return;
    }

    const rerollStat = resolveRuneStatRerollCommand(command);
    if (rerollStat) {
      const player = await this.services.rerollCurrentRuneStat.execute(vkId, rerollStat);
      await this.reply(ctx, renderAltar(player), createRuneRerollKeyboard());
      return;
    }

    if (isSkillPreviewCommand(command)) {
      await this.replyWithBattleSkillsPreview(ctx, vkId);
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
    await this.reply(ctx, renderMainMenu(player), createMainMenuKeyboard());
  }

  private async showProfile(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.replyWithProfile(ctx, player);
  }

  private async deletePlayer(ctx: Context, vkId: number): Promise<void> {
    await this.services.deletePlayer.execute(vkId);
    await this.reply(ctx, 'Персонаж удалён. Можно начать заново в любой момент.', createEntryKeyboard());
  }

  private async showInventory(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.getPlayerProfile.execute(vkId);
    await this.reply(ctx, renderInventory(player), createMainMenuKeyboard());
  }

  private async showLocation(ctx: Context, vkId: number): Promise<void> {
    const player = await this.services.enterTutorialMode.execute(vkId);
    await this.replyWithLocation(ctx, player);
  }

  private async replyWithProfile(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderProfile(player), createProfileKeyboard());
  }

  private async replyWithLocation(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderLocation(player), createTutorialKeyboard(player));
  }

  private async replyWithRuneCollection(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderRuneScreen(player), createRuneKeyboard());
  }

  private async replyWithAltar(ctx: Context, player: PlayerState): Promise<void> {
    await this.reply(ctx, renderAltar(player), createAltarKeyboard());
  }

  private async replyWithBattle(ctx: Context, battle: BattleView): Promise<void> {
    await this.reply(ctx, renderBattle(battle), this.resolveBattleKeyboard(battle));
  }

  private async replyWithBattleSkillsPreview(ctx: Context, vkId: number): Promise<void> {
    const battle = await this.services.getActiveBattle.execute(vkId);

    await this.reply(
      ctx,
      [
        '🌀 Рунные навыки будут отдельной системой.',
        'Базовая боевая петля сейчас завязана на обычной атаке.',
        'Следующим слоем развития станут активные и пассивные эффекты от экипированных рун.',
        '',
        renderBattle(battle),
      ].join('\n'),
      this.resolveBattleKeyboard(battle),
    );
  }

  private resolveBattleKeyboard(battle: BattleView): ReplyKeyboard {
    return battle.status === 'ACTIVE' ? createBattleKeyboard() : createMainMenuKeyboard();
  }

  private resolveErrorKeyboard(errorCode: string): ReplyKeyboard {
    return errorCode === 'player_not_found' ? createEntryKeyboard() : createMainMenuKeyboard();
  }

  private async reply(ctx: Context, message: string, keyboard: ReplyKeyboard): Promise<void> {
    await ctx.reply(message, { keyboard });
  }
}
