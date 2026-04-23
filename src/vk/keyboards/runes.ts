import { Keyboard } from 'vk-io';

import { gameBalance } from '../../config/game-balance';
import { buildCraftingIntentStateKey } from '../../modules/crafting/application/command-intent-state';
import {
  canPayCraftingRecipe,
  listCraftingRecipes,
} from '../../modules/crafting/domain/crafting-recipes';
import {
  getEquippedRune,
  getRuneEquippedSlot,
  getSelectedRune,
  resolveAutoEquipRuneSlot,
} from '../../modules/player/domain/player-stats';
import {
  buildCraftIntentStateKey,
  buildDestroyIntentStateKey,
  buildEquipIntentStateKey,
  buildMoveRuneCursorIntentStateKey,
  buildRerollIntentStateKey,
  buildSelectRunePageSlotIntentStateKey,
  buildUnequipIntentStateKey,
} from '../../modules/runes/application/command-intent-state';
import {
  buildRuneCollectionPage,
  runeCollectionPageSize,
  type RuneCollectionPageEntry,
  type RunePageSlot,
} from '../../modules/runes/domain/rune-collection';
import type { PlayerState } from '../../shared/types/game';
import type { GameCommand } from '../commands/catalog';
import { gameCommands, resolveCraftingRecipeCodeCommand } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

type RerollStat =
  | 'attack'
  | 'health'
  | 'defence'
  | 'magicDefence'
  | 'dexterity'
  | 'intelligence';

const runePageSlotCommands = [
  gameCommands.selectRuneSlot1,
  gameCommands.selectRuneSlot2,
  gameCommands.selectRuneSlot3,
  gameCommands.selectRuneSlot4,
  gameCommands.selectRuneSlot5,
] as const;

const truncateKeyboardLabelPart = (text: string, maxLength: number): string => (
  text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}…`
);

const formatRuneSelectionButtonLabel = (entry: RuneCollectionPageEntry): string => {
  const prefix = `${entry.slot + 1}. `;
  const status = getRuneEquippedSlot(entry.rune) !== null ? ' ✅' : '';
  const name = truncateKeyboardLabelPart(entry.rune.name, 38 - prefix.length - status.length);

  return `${prefix}${name}${status}`;
};

const resolveRunePageSlot = (slot: number): RunePageSlot => {
  if (slot === 0 || slot === 1 || slot === 2 || slot === 3 || slot === 4) {
    return slot;
  }

  throw new Error(`Unsupported rune page slot: ${slot}`);
};

const resolveRuneSelectionCommand = (slot: RunePageSlot): GameCommand => runePageSlotCommands[slot];

const createCraftingRecipeRows = (player?: PlayerState): KeyboardLayout => {
  const buttons = listCraftingRecipes().map((recipe) => ({
    label: recipe.buttonLabel,
    command: resolveCraftingRecipeCodeCommand(recipe.code),
    color: player && canPayCraftingRecipe(player, recipe) ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR,
    intentScoped: Boolean(player),
    stateKey: player ? buildCraftingIntentStateKey(player, recipe.code) : undefined,
  }));

  return [
    buttons.slice(0, 2),
    buttons.slice(2, 4),
  ].filter((row) => row.length > 0);
};

const createRuneListLayout = (player?: PlayerState): KeyboardLayout => {
  const craftStateKey = player ? buildCraftIntentStateKey(player) : undefined;
  if (!player || player.runes.length === 0) {
    return [
      [
        {
          label: '✨ Создать',
          command: gameCommands.craftRune,
          color: Keyboard.POSITIVE_COLOR,
          intentScoped: Boolean(player),
          stateKey: craftStateKey,
        },
      ],
      [
        { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
      ],
    ];
  }

  const page = buildRuneCollectionPage(player);
  const previousPageStateKey = buildMoveRuneCursorIntentStateKey(player, -runeCollectionPageSize);
  const nextPageStateKey = buildMoveRuneCursorIntentStateKey(player, runeCollectionPageSize);

  return [
    ...page.entries.map((entry) => {
      const pageSlot = resolveRunePageSlot(entry.slot);

      return [{
        label: formatRuneSelectionButtonLabel(entry),
        command: resolveRuneSelectionCommand(pageSlot),
        color: entry.isSelected ? Keyboard.PRIMARY_COLOR : Keyboard.SECONDARY_COLOR,
        intentScoped: true,
        stateKey: buildSelectRunePageSlotIntentStateKey(player, pageSlot),
      }] as const;
    }),
    [
      {
        label: '◀ Назад',
        command: gameCommands.previousRunePage,
        color: Keyboard.SECONDARY_COLOR,
        intentScoped: true,
        stateKey: previousPageStateKey,
      },
      {
        label: '▶ Вперёд',
        command: gameCommands.nextRunePage,
        color: Keyboard.SECONDARY_COLOR,
        intentScoped: true,
        stateKey: nextPageStateKey,
      },
    ],
    [
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

const createRuneDetailLayout = (player?: PlayerState): KeyboardLayout => {
  const selectedRune = player ? getSelectedRune(player) : null;
  const selectedEquippedSlot = selectedRune ? getRuneEquippedSlot(selectedRune) : null;
  const craftStateKey = player ? buildCraftIntentStateKey(player) : undefined;
  const destroyStateKey = player && selectedRune
    ? buildDestroyIntentStateKey(player, selectedRune.id, gameBalance.runes.profiles[selectedRune.rarity].shardField)
    : undefined;

  if (!player || player.runes.length === 0) {
    return createRuneListLayout(player);
  }

  const autoEquipSlot = player ? resolveAutoEquipRuneSlot(player) : 0;
  const autoEquipTargetRune = player ? getEquippedRune(player, autoEquipSlot) : null;
  const equipButton = selectedRune && selectedEquippedSlot === null
    ? [{
        label: autoEquipTargetRune ? '🔁 Заменить' : '✅ Надеть',
        command: gameCommands.equipRune,
        color: autoEquipTargetRune ? Keyboard.PRIMARY_COLOR : Keyboard.POSITIVE_COLOR,
        intentScoped: Boolean(player),
        stateKey: player ? buildEquipIntentStateKey(player, autoEquipSlot) : undefined,
      } as const]
    : [];
  const unequipButton = selectedRune && selectedEquippedSlot !== null
    ? [{
        label: `❌ Снять со слота ${selectedEquippedSlot + 1}`,
        command: gameCommands.unequipRune,
        color: Keyboard.NEGATIVE_COLOR,
        intentScoped: Boolean(player),
        stateKey: player ? buildUnequipIntentStateKey(player, selectedEquippedSlot) : undefined,
      } as const]
    : [];
  const selectedRuneActionRow = [
    ...equipButton,
    ...unequipButton,
    ...(selectedRune
      ? [{
          label: '🗑️ Распылить',
          command: gameCommands.destroyRune,
          color: Keyboard.NEGATIVE_COLOR,
          intentScoped: true,
          stateKey: destroyStateKey,
        } as const]
      : []),
  ];

  return [
    ...(selectedRuneActionRow.length > 0 ? [selectedRuneActionRow] : []),
    [
      {
        label: '✨ Создать',
        command: gameCommands.craftRune,
        color: Keyboard.POSITIVE_COLOR,
        intentScoped: true,
        stateKey: craftStateKey,
      },
      { label: '🔧 Перековать', command: gameCommands.rerollRuneMenu, color: Keyboard.PRIMARY_COLOR },
    ],
    [
      { label: '◀ К списку рун', command: gameCommands.runeCollection, color: Keyboard.SECONDARY_COLOR },
    ],
    [
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

const createRuneRerollLayout = (player?: PlayerState): KeyboardLayout => {
  const selectedRune = player ? getSelectedRune(player) : null;
  const rerollStateKey = (stat: RerollStat): string | undefined => (
    player && selectedRune ? buildRerollIntentStateKey(player, stat, selectedRune) : undefined
  );

  return [
    [
      {
        label: '↻ АТК',
        command: gameCommands.rerollAttack,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: rerollStateKey('attack'),
      },
      {
        label: '↻ ЗДР',
        command: gameCommands.rerollHealth,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: rerollStateKey('health'),
      },
    ],
    [
      {
        label: '↻ ЛВК',
        command: gameCommands.rerollDexterity,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: rerollStateKey('dexterity'),
      },
      {
        label: '↻ ИНТ',
        command: gameCommands.rerollIntelligence,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: rerollStateKey('intelligence'),
      },
    ],
    [
      {
        label: '↻ ФЗАЩ',
        command: gameCommands.rerollDefence,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: rerollStateKey('defence'),
      },
      {
        label: '↻ МЗАЩ',
        command: gameCommands.rerollMagicDefence,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: rerollStateKey('magicDefence'),
      },
    ],
    [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
  ];
};

export const createRuneKeyboard = (player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createRuneListLayout(player))
);

export const createRuneDetailKeyboard = (player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createRuneDetailLayout(player))
);

export const createAltarKeyboard = (player?: PlayerState): KeyboardBuilder => {
  const selectedRuneLayout = createRuneDetailLayout(player);
  const craftingRows = createCraftingRecipeRows(player);
  const menuRow = selectedRuneLayout.at(-1);
  const bodyRows = menuRow ? selectedRuneLayout.slice(0, -1) : selectedRuneLayout;

  return buildKeyboard([
    ...bodyRows,
    ...craftingRows,
    ...(menuRow ? [menuRow] : []),
  ]);
};

export const createRuneRerollKeyboard = (player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createRuneRerollLayout(player))
);
