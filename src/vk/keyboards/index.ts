import { randomUUID } from 'node:crypto';

import { Keyboard } from 'vk-io';

import { gameBalance } from '../../config/game-balance';
import { buildBattleActionIntentStateKey } from '../../modules/combat/application/command-intent-state';
import {
  buildExploreLocationIntentStateKey,
  buildReturnToAdventureIntentStateKey,
  buildSkipTutorialIntentStateKey,
} from '../../modules/exploration/application/command-intent-state';
import {
  buildAllocateStatIntentStateKey,
  buildResetAllocatedStatsIntentStateKey,
} from '../../modules/player/application/command-intent-state';
import { getSelectedRune, isPlayerInTutorial } from '../../modules/player/domain/player-stats';
import {
  buildCraftIntentStateKey,
  buildDestroyIntentStateKey,
  buildEquipIntentStateKey,
  buildMoveRuneCursorIntentStateKey,
  buildRerollIntentStateKey,
  buildSelectRunePageSlotIntentStateKey,
  buildUnequipIntentStateKey,
} from '../../modules/runes/application/command-intent-state';
import { runeCollectionPageSize } from '../../modules/runes/domain/rune-collection';
import type { BattleView, PlayerState } from '../../shared/types/game';
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
  readonly intentScoped?: boolean;
  readonly stateKey?: string;
}

type KeyboardLayout = readonly (readonly KeyboardButtonDefinition[])[];

const buildKeyboard = (layout: KeyboardLayout): KeyboardBuilder => {
  const keyboard = Keyboard.builder();

  layout.forEach((row, rowIndex) => {
    row.forEach(({ label, command, color, intentScoped, stateKey }) => {
      keyboard.textButton({
        label,
        payload: intentScoped && stateKey
          ? { command, intentId: randomUUID(), ...(stateKey ? { stateKey } : {}) }
          : { command },
        color,
      });
    });

    if (rowIndex < layout.length - 1) {
      keyboard.row();
    }
  });

  return keyboard.oneTime(false).inline(false);
};

const createMainMenuLayout = (player?: PlayerState): KeyboardLayout => {
  const exploreStateKey = player ? buildExploreLocationIntentStateKey(player) : undefined;

  return [
    [
      { label: '👤 Профиль', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
      { label: '🎒 Инвентарь', command: gameCommands.inventory, color: Keyboard.SECONDARY_COLOR },
    ],
    [
      { label: '📘 Обучение', command: gameCommands.location, color: Keyboard.PRIMARY_COLOR },
      { label: '⚔️ Исследовать', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: exploreStateKey },
    ],
    [
      { label: '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.POSITIVE_COLOR },
      { label: '🛠 Мастерская', command: gameCommands.altar, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

const entryLayout: KeyboardLayout = [
  [{ label: '🎮 Начать', command: gameCommands.start, color: Keyboard.POSITIVE_COLOR }],
];

const createProfileLayout = (player?: PlayerState): KeyboardLayout => {
  const allocateStateKey = (stat: 'attack' | 'health' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence') => (
    player ? buildAllocateStatIntentStateKey(player, stat) : undefined
  );
  const resetStateKey = player ? buildResetAllocatedStatsIntentStateKey(player) : undefined;

  return [
    [
      { label: '+АТК', command: gameCommands.increaseAttack, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: allocateStateKey('attack') },
      { label: '+ЗДР', command: gameCommands.increaseHealth, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: allocateStateKey('health') },
    ],
    [
      { label: '+ФЗАЩ', command: gameCommands.increaseDefence, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: allocateStateKey('defence') },
      { label: '+МЗАЩ', command: gameCommands.increaseMagicDefence, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: allocateStateKey('magicDefence') },
    ],
    [
      { label: '+ЛВК', command: gameCommands.increaseDexterity, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: allocateStateKey('dexterity') },
      { label: '+ИНТ', command: gameCommands.increaseIntelligence, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: allocateStateKey('intelligence') },
    ],
    [
      { label: '🔄 СБРОС', command: gameCommands.resetStats, color: Keyboard.NEGATIVE_COLOR, intentScoped: Boolean(player), stateKey: resetStateKey },
      { label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
    [{ label: '🗑️ Удалить персонажа', command: gameCommands.deletePlayer, color: Keyboard.NEGATIVE_COLOR }],
  ];
};

const createBattleSkillButton = (battle: BattleView): KeyboardButtonDefinition => {
  const activeAbility = battle.player.runeLoadout?.activeAbility ?? null;
  const stateKey = buildBattleActionIntentStateKey(battle, 'RUNE_SKILL');
  if (!activeAbility) {
    return { label: '🔮 Рунное действие', command: gameCommands.skills, color: Keyboard.SECONDARY_COLOR, intentScoped: true, stateKey };
  }

  const isReady = activeAbility.currentCooldown <= 0 && battle.player.currentMana >= activeAbility.manaCost;
  const labelSuffix = activeAbility.currentCooldown > 0
    ? ` · КД ${activeAbility.currentCooldown}`
    : battle.player.currentMana < activeAbility.manaCost
      ? ` · ${activeAbility.manaCost} маны`
      : '';

  return {
    label: `🌀 ${activeAbility.name}${labelSuffix}`,
    command: gameCommands.skills,
    color: isReady ? Keyboard.PRIMARY_COLOR : Keyboard.SECONDARY_COLOR,
    intentScoped: true,
    stateKey,
  };
};

const createBattleResultLayout = (battle: BattleView, player?: PlayerState): KeyboardLayout => {
  const exploreStateKey = player ? buildExploreLocationIntentStateKey(player) : undefined;

  return [
  battle.rewards?.droppedRune
    ? [
        { label: '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.PRIMARY_COLOR },
        { label: '⚔️ Новый бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: exploreStateKey },
      ]
    : [{ label: '⚔️ Новый бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: exploreStateKey }],
  [
    { label: '👤 Профиль', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
  ];
};

const createRuneLayout = (player?: PlayerState): KeyboardLayout => {
  const selectedRune = player ? getSelectedRune(player) : null;
  const craftStateKey = player ? buildCraftIntentStateKey(player) : undefined;
  const equipStateKey = player ? buildEquipIntentStateKey(player) : undefined;
  const unequipStateKey = player ? buildUnequipIntentStateKey(player) : undefined;
  const previousPageStateKey = player ? buildMoveRuneCursorIntentStateKey(player, -runeCollectionPageSize) : undefined;
  const nextPageStateKey = player ? buildMoveRuneCursorIntentStateKey(player, runeCollectionPageSize) : undefined;
  const destroyStateKey = player && selectedRune
    ? buildDestroyIntentStateKey(player, selectedRune.id, gameBalance.runes.profiles[selectedRune.rarity].shardField)
    : undefined;

    return [
      [
      { label: '1', command: gameCommands.selectRuneSlot1, color: Keyboard.PRIMARY_COLOR, intentScoped: Boolean(player), stateKey: player ? buildSelectRunePageSlotIntentStateKey(player, 0) : undefined },
      { label: '2', command: gameCommands.selectRuneSlot2, color: Keyboard.PRIMARY_COLOR, intentScoped: Boolean(player), stateKey: player ? buildSelectRunePageSlotIntentStateKey(player, 1) : undefined },
      { label: '3', command: gameCommands.selectRuneSlot3, color: Keyboard.PRIMARY_COLOR, intentScoped: Boolean(player), stateKey: player ? buildSelectRunePageSlotIntentStateKey(player, 2) : undefined },
      { label: '4', command: gameCommands.selectRuneSlot4, color: Keyboard.PRIMARY_COLOR, intentScoped: Boolean(player), stateKey: player ? buildSelectRunePageSlotIntentStateKey(player, 3) : undefined },
      ],
      [
      { label: '◀️ Стр', command: gameCommands.previousRunePage, color: Keyboard.SECONDARY_COLOR, intentScoped: Boolean(player), stateKey: previousPageStateKey },
      { label: '▶️ Стр', command: gameCommands.nextRunePage, color: Keyboard.SECONDARY_COLOR, intentScoped: Boolean(player), stateKey: nextPageStateKey },
      ],
    [
      { label: '✅ Надеть', command: gameCommands.equipRune, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: equipStateKey },
      { label: '❌ Снять', command: gameCommands.unequipRune, color: Keyboard.NEGATIVE_COLOR, intentScoped: Boolean(player), stateKey: unequipStateKey },
    ],
    [
      { label: '✨ Создать', command: gameCommands.craftRune, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: craftStateKey },
      { label: '🔧 Перековать', command: gameCommands.rerollRuneMenu, color: Keyboard.PRIMARY_COLOR },
    ],
    [
      { label: '🗑️ Распылить', command: gameCommands.destroyRune, color: Keyboard.NEGATIVE_COLOR, intentScoped: true, stateKey: destroyStateKey },
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

const createRuneRerollLayout = (player?: PlayerState): KeyboardLayout => {
  const selectedRune = player ? getSelectedRune(player) : null;
  const rerollStateKey = (stat: 'attack' | 'health' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence') => (
    player && selectedRune ? buildRerollIntentStateKey(player, stat, selectedRune) : undefined
  );

  return [
    [
      { label: '↻ АТК', command: gameCommands.rerollAttack, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: rerollStateKey('attack') },
      { label: '↻ ЗДР', command: gameCommands.rerollHealth, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: rerollStateKey('health') },
    ],
    [
      { label: '↻ ЛВК', command: gameCommands.rerollDexterity, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: rerollStateKey('dexterity') },
      { label: '↻ ИНТ', command: gameCommands.rerollIntelligence, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: rerollStateKey('intelligence') },
    ],
    [
      { label: '↻ ФЗАЩ', command: gameCommands.rerollDefence, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: rerollStateKey('defence') },
      { label: '↻ МЗАЩ', command: gameCommands.rerollMagicDefence, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: rerollStateKey('magicDefence') },
    ],
    [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
  ];
};

export const createMainMenuKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createMainMenuLayout(player));

export const createEntryKeyboard = (): KeyboardBuilder => buildKeyboard(entryLayout);

export const createProfileKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createProfileLayout(player));

export const createDeleteConfirmationKeyboard = (player: PlayerState): KeyboardBuilder => buildKeyboard([
  [{ label: '🗑️ Да, удалить', command: gameCommands.confirmDeletePlayer, color: Keyboard.NEGATIVE_COLOR, intentScoped: true, stateKey: player.updatedAt }],
  [{ label: '◀ Оставить персонажа', command: gameCommands.profile, color: Keyboard.SECONDARY_COLOR }],
]);

export const createBattleKeyboard = (battle: BattleView): KeyboardBuilder => buildKeyboard([
  [
    { label: '⚔️ Атака', command: gameCommands.attack, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: buildBattleActionIntentStateKey(battle, 'ATTACK') },
    { label: '🛡️ Защита', command: gameCommands.defend, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: buildBattleActionIntentStateKey(battle, 'DEFEND') },
  ],
  [createBattleSkillButton(battle)],
]);

export const createBattleResultKeyboard = (battle: BattleView, player?: PlayerState): KeyboardBuilder => buildKeyboard(createBattleResultLayout(battle, player));

export const createRuneKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createRuneLayout(player));

export const createAltarKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createRuneLayout(player));

export const createRuneRerollKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createRuneRerollLayout(player));

export const createTutorialKeyboard = (player: PlayerState): KeyboardBuilder => {
  const inTutorial = isPlayerInTutorial(player);
  const exploreStateKey = buildExploreLocationIntentStateKey(player);
  const skipTutorialStateKey = buildSkipTutorialIntentStateKey(player);
  const returnToAdventureStateKey = buildReturnToAdventureIntentStateKey(player);

  if (player.tutorialState === 'ACTIVE') {
    return buildKeyboard([
      [{ label: '⚔️ Учебный бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: exploreStateKey }],
      [{ label: '⏭️ Пропустить обучение', command: gameCommands.skipTutorial, color: Keyboard.NEGATIVE_COLOR, intentScoped: true, stateKey: skipTutorialStateKey }],
      [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
    ]);
  }

  if (inTutorial) {
    return buildKeyboard([
      [{ label: '⚔️ Тренировочный бой', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: exploreStateKey }],
      [{ label: '🌍 В приключения', command: gameCommands.returnToAdventure, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: returnToAdventureStateKey }],
      [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
    ]);
  }

  return buildKeyboard([
    [{ label: '⚔️ Исследовать', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: exploreStateKey }],
    [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
  ]);
};
