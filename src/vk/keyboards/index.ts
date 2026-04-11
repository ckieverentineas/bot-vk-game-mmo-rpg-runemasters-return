import { Keyboard } from 'vk-io';

import { isPlayerInTutorial } from '../../modules/player/domain/player-stats';
import type { PlayerState } from '../../shared/types/game';
import type { GameCommand } from '../commands/catalog';
import { gameCommands } from '../commands/catalog';

type KeyboardBuilder = ReturnType<typeof Keyboard.builder>;
type KeyboardColor =
  | typeof Keyboard.PRIMARY_COLOR
  | typeof Keyboard.SECONDARY_COLOR
  | typeof Keyboard.POSITIVE_COLOR
  | typeof Keyboard.NEGATIVE_COLOR;

interface KeyboardButtonDefinition {
  readonly label: string;
  readonly command: GameCommand;
  readonly color: KeyboardColor;
}

type KeyboardLayout = readonly (readonly KeyboardButtonDefinition[])[];

const buildKeyboard = (layout: KeyboardLayout): KeyboardBuilder => {
  const keyboard = Keyboard.builder();

  layout.forEach((row, rowIndex) => {
    row.forEach(({ label, command, color }) => {
      keyboard.textButton({
        label,
        payload: { command },
        color,
      });
    });

    if (rowIndex < layout.length - 1) {
      keyboard.row();
    }
  });

  return keyboard.oneTime(false).inline(false);
};

const mainMenuLayout: KeyboardLayout = [
  [
    { label: '👤 Профиль', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
    { label: '🎒 Инвентарь', command: gameCommands.inventory, color: Keyboard.SECONDARY_COLOR },
  ],
  [
    { label: '📘 Обучение', command: gameCommands.location, color: Keyboard.PRIMARY_COLOR },
    { label: '⚔️ Исследовать', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR },
  ],
  [
    { label: '🔮 Алтарь', command: gameCommands.altar, color: Keyboard.POSITIVE_COLOR },
    { label: '💎 Руна', command: gameCommands.runeCollection, color: Keyboard.NEGATIVE_COLOR },
  ],
];

const entryLayout: KeyboardLayout = [
  [{ label: '🎮 Начать', command: gameCommands.start, color: Keyboard.POSITIVE_COLOR }],
];

const profileLayout: KeyboardLayout = [
  [
    { label: '+АТК', command: gameCommands.increaseAttack, color: Keyboard.POSITIVE_COLOR },
    { label: '+ЗДР', command: gameCommands.increaseHealth, color: Keyboard.POSITIVE_COLOR },
  ],
  [
    { label: '+ФЗАЩ', command: gameCommands.increaseDefence, color: Keyboard.POSITIVE_COLOR },
    { label: '+МЗАЩ', command: gameCommands.increaseMagicDefence, color: Keyboard.POSITIVE_COLOR },
  ],
  [
    { label: '+ЛВК', command: gameCommands.increaseDexterity, color: Keyboard.POSITIVE_COLOR },
    { label: '+ИНТ', command: gameCommands.increaseIntelligence, color: Keyboard.POSITIVE_COLOR },
  ],
  [
    { label: '🔄 СБРОС', command: gameCommands.resetStats, color: Keyboard.NEGATIVE_COLOR },
    { label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
  [{ label: '🗑️ Удалить персонажа', command: gameCommands.deletePlayer, color: Keyboard.NEGATIVE_COLOR }],
];

const battleLayout: KeyboardLayout = [
  [{ label: '⚔️ Атака', command: gameCommands.attack, color: Keyboard.POSITIVE_COLOR }],
  [{ label: '🌀 Навыки рун', command: gameCommands.skills, color: Keyboard.SECONDARY_COLOR }],
];

const runeLayout: KeyboardLayout = [
  [
    { label: '✅ Надеть', command: gameCommands.equipRune, color: Keyboard.POSITIVE_COLOR },
    { label: '❌ Снять', command: gameCommands.unequipRune, color: Keyboard.NEGATIVE_COLOR },
  ],
  [
    { label: '+Руна', command: gameCommands.nextRune, color: Keyboard.SECONDARY_COLOR },
    { label: '-Руна', command: gameCommands.previousRune, color: Keyboard.SECONDARY_COLOR },
  ],
  [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
];

const altarLayout: KeyboardLayout = [
  [
    { label: '🔧 Изменить руну', command: gameCommands.rerollRuneMenu, color: Keyboard.PRIMARY_COLOR },
    { label: '✨ СОЗДАТЬ', command: gameCommands.craftRune, color: Keyboard.POSITIVE_COLOR },
  ],
  [
    { label: '+Руна', command: gameCommands.nextRune, color: Keyboard.SECONDARY_COLOR },
    { label: '-Руна', command: gameCommands.previousRune, color: Keyboard.SECONDARY_COLOR },
  ],
  [{ label: '💔 СЛОМАТЬ', command: gameCommands.destroyRune, color: Keyboard.NEGATIVE_COLOR }],
  [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
];

const runeRerollLayout: KeyboardLayout = [
  [
    { label: '~АТК', command: gameCommands.rerollAttack, color: Keyboard.PRIMARY_COLOR },
    { label: '~ЗДР', command: gameCommands.rerollHealth, color: Keyboard.PRIMARY_COLOR },
  ],
  [
    { label: '~ЛВК', command: gameCommands.rerollDexterity, color: Keyboard.PRIMARY_COLOR },
    { label: '~ИНТ', command: gameCommands.rerollIntelligence, color: Keyboard.PRIMARY_COLOR },
  ],
  [
    { label: '~ФЗАЩ', command: gameCommands.rerollDefence, color: Keyboard.PRIMARY_COLOR },
    { label: '~МЗАЩ', command: gameCommands.rerollMagicDefence, color: Keyboard.PRIMARY_COLOR },
  ],
  [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
];

const levelLayout: KeyboardLayout = [
  [
    { label: '+УР', command: gameCommands.increaseLocationLevel, color: Keyboard.POSITIVE_COLOR },
    { label: '-УР', command: gameCommands.decreaseLocationLevel, color: Keyboard.NEGATIVE_COLOR },
  ],
  [
    { label: '+УР10', command: gameCommands.increaseLocationLevelByTen, color: Keyboard.POSITIVE_COLOR },
    { label: '-УР10', command: gameCommands.decreaseLocationLevelByTen, color: Keyboard.NEGATIVE_COLOR },
  ],
  [
    { label: '+УР100', command: gameCommands.increaseLocationLevelByHundred, color: Keyboard.POSITIVE_COLOR },
    { label: '-УР100', command: gameCommands.decreaseLocationLevelByHundred, color: Keyboard.NEGATIVE_COLOR },
  ],
  [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
];

export const createMainMenuKeyboard = (): KeyboardBuilder => buildKeyboard(mainMenuLayout);

export const createEntryKeyboard = (): KeyboardBuilder => buildKeyboard(entryLayout);

export const createProfileKeyboard = (): KeyboardBuilder => buildKeyboard(profileLayout);

export const createBattleKeyboard = (): KeyboardBuilder => buildKeyboard(battleLayout);

export const createRuneKeyboard = (): KeyboardBuilder => buildKeyboard(runeLayout);

export const createAltarKeyboard = (): KeyboardBuilder => buildKeyboard(altarLayout);

export const createRuneRerollKeyboard = (): KeyboardBuilder => buildKeyboard(runeRerollLayout);

export const createLevelKeyboard = (): KeyboardBuilder => buildKeyboard(levelLayout);

export const createTutorialKeyboard = (player: PlayerState): KeyboardBuilder => {
  const inTutorial = isPlayerInTutorial(player);

  if (player.tutorialState === 'ACTIVE') {
    return buildKeyboard([
      [{ label: '⚔️ Учебный бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR }],
      [{ label: '⏭️ Пропустить обучение', command: gameCommands.skipTutorial, color: Keyboard.NEGATIVE_COLOR }],
      [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
    ]);
  }

  if (inTutorial) {
    return buildKeyboard([
      [{ label: '⚔️ Тренировочный бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR }],
      [{ label: '🌍 В приключения', command: gameCommands.returnToAdventure, color: Keyboard.PRIMARY_COLOR }],
      [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
    ]);
  }

  return buildKeyboard([
    [{ label: '⚔️ Исследовать', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR }],
    [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
  ]);
};
