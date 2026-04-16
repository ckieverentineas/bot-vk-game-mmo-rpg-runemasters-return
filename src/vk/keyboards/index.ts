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
    { label: '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.POSITIVE_COLOR },
    { label: '🛠 Мастерская', command: gameCommands.altar, color: Keyboard.SECONDARY_COLOR },
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
  [{ label: '🔮 Бонус руны', command: gameCommands.skills, color: Keyboard.SECONDARY_COLOR }],
];

const battleResultLayout: KeyboardLayout = [
  [{ label: '⚔️ Новый бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR }],
  [
    { label: '👤 Профиль', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

const runeLayout: KeyboardLayout = [
  [
    { label: '1', command: gameCommands.selectRuneSlot1, color: Keyboard.PRIMARY_COLOR },
    { label: '2', command: gameCommands.selectRuneSlot2, color: Keyboard.PRIMARY_COLOR },
    { label: '3', command: gameCommands.selectRuneSlot3, color: Keyboard.PRIMARY_COLOR },
    { label: '4', command: gameCommands.selectRuneSlot4, color: Keyboard.PRIMARY_COLOR },
  ],
  [
    { label: '◀️ Стр', command: gameCommands.previousRunePage, color: Keyboard.SECONDARY_COLOR },
    { label: '▶️ Стр', command: gameCommands.nextRunePage, color: Keyboard.SECONDARY_COLOR },
  ],
  [
    { label: '✅ Надеть', command: gameCommands.equipRune, color: Keyboard.POSITIVE_COLOR },
    { label: '❌ Снять', command: gameCommands.unequipRune, color: Keyboard.NEGATIVE_COLOR },
  ],
  [
    { label: '✨ Создать', command: gameCommands.craftRune, color: Keyboard.POSITIVE_COLOR },
    { label: '🔧 Перековать', command: gameCommands.rerollRuneMenu, color: Keyboard.PRIMARY_COLOR },
  ],
  [
    { label: '🗑️ Распылить', command: gameCommands.destroyRune, color: Keyboard.NEGATIVE_COLOR },
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

const altarLayout: KeyboardLayout = runeLayout;

const runeRerollLayout: KeyboardLayout = [
  [
    { label: '↻ АТК', command: gameCommands.rerollAttack, color: Keyboard.PRIMARY_COLOR },
    { label: '↻ ЗДР', command: gameCommands.rerollHealth, color: Keyboard.PRIMARY_COLOR },
  ],
  [
    { label: '↻ ЛВК', command: gameCommands.rerollDexterity, color: Keyboard.PRIMARY_COLOR },
    { label: '↻ ИНТ', command: gameCommands.rerollIntelligence, color: Keyboard.PRIMARY_COLOR },
  ],
  [
    { label: '↻ ФЗАЩ', command: gameCommands.rerollDefence, color: Keyboard.PRIMARY_COLOR },
    { label: '↻ МЗАЩ', command: gameCommands.rerollMagicDefence, color: Keyboard.PRIMARY_COLOR },
  ],
  [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
];

export const createMainMenuKeyboard = (): KeyboardBuilder => buildKeyboard(mainMenuLayout);

export const createEntryKeyboard = (): KeyboardBuilder => buildKeyboard(entryLayout);

export const createProfileKeyboard = (): KeyboardBuilder => buildKeyboard(profileLayout);

export const createBattleKeyboard = (): KeyboardBuilder => buildKeyboard(battleLayout);

export const createBattleResultKeyboard = (): KeyboardBuilder => buildKeyboard(battleResultLayout);

export const createRuneKeyboard = (): KeyboardBuilder => buildKeyboard(runeLayout);

export const createAltarKeyboard = (): KeyboardBuilder => buildKeyboard(altarLayout);

export const createRuneRerollKeyboard = (): KeyboardBuilder => buildKeyboard(runeRerollLayout);

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
