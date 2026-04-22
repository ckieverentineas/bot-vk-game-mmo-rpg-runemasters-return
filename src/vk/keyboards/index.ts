import { randomUUID } from 'node:crypto';

import { Keyboard } from 'vk-io';

import { gameBalance } from '../../config/game-balance';
import { buildBattleActionIntentStateKey } from '../../modules/combat/application/command-intent-state';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import {
  getBattleRuneLoadout,
  resolveBattleRuneSkillAction,
  type BattleRuneSlotIndex,
} from '../../modules/combat/domain/battle-rune-loadouts';
import { resolveDefendGuardGain } from '../../modules/combat/domain/battle-tactics';
import {
  buildEnterTutorialModeIntentStateKey,
  buildExploreLocationIntentStateKey,
  buildReturnToAdventureIntentStateKey,
  buildSkipTutorialIntentStateKey,
} from '../../modules/exploration/application/command-intent-state';
import {
  buildBattleResultNextGoalView,
  buildPlayerNextGoalView,
} from '../../modules/player/application/read-models/next-goal';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import {
  getEquippedRune,
  getRuneEquippedSlot,
  getSelectedRune,
  isPlayerInTutorial,
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
import type { BattleView, PlayerState } from '../../shared/types/game';
import type { GameCommand } from '../commands/catalog';
import { gameCommands, resolveTrophyActionCodeCommand } from '../commands/catalog';

type KeyboardBuilder = ReturnType<typeof Keyboard.builder>;
type KeyboardColor =
  | typeof Keyboard.PRIMARY_COLOR
  | typeof Keyboard.SECONDARY_COLOR
  | typeof Keyboard.POSITIVE_COLOR
  | typeof Keyboard.NEGATIVE_COLOR;

interface KeyboardBuildOptions {
  readonly inline?: boolean;
}

interface KeyboardButtonDefinition {
  readonly label: string;
  readonly command: GameCommand;
  readonly color: KeyboardColor;
  readonly intentScoped?: boolean;
  readonly stateKey?: string;
}

type KeyboardLayout = readonly (readonly KeyboardButtonDefinition[])[];

const buildKeyboard = (layout: KeyboardLayout, options: KeyboardBuildOptions = {}): KeyboardBuilder => {
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

  return keyboard.oneTime(false).inline(options.inline === true);
};

const resolveSchoolContinuationLabel = (player: PlayerState | undefined, fallbackLabel: string): string => {
  if (!player) {
    return fallbackLabel;
  }

  const nextGoal = buildPlayerNextGoalView(player);
  return nextGoal.goalType === 'challenge_school_miniboss'
    ? nextGoal.primaryActionLabel
    : fallbackLabel;
};

const createMainMenuLayout = (player?: PlayerState): KeyboardLayout => {
  const locationStateKey = player ? buildEnterTutorialModeIntentStateKey(player) : undefined;
  const exploreStateKey = player ? buildExploreLocationIntentStateKey(player) : undefined;
  const exploreLabel = resolveSchoolContinuationLabel(player, '⚔️ Исследовать');

  return [
    [
      { label: '👤 Летопись', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
      { label: '🎒 Инвентарь', command: gameCommands.inventory, color: Keyboard.SECONDARY_COLOR },
    ],
    [
      { label: '📘 Обучение', command: gameCommands.location, color: Keyboard.PRIMARY_COLOR, intentScoped: Boolean(player), stateKey: locationStateKey },
      { label: exploreLabel, command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: exploreStateKey },
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

const createProfileLayout = (_player?: PlayerState): KeyboardLayout => [[
  { label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
], [
  { label: '🗑️ Удалить персонажа', command: gameCommands.deletePlayer, color: Keyboard.NEGATIVE_COLOR },
]];

const createBattleSkillButton = (battle: BattleView, slot: BattleRuneSlotIndex): KeyboardButtonDefinition | null => {
  const activeAbility = getBattleRuneLoadout(battle.player, slot)?.activeAbility ?? null;
  if (!activeAbility) {
    return null;
  }

  const action = resolveBattleRuneSkillAction(slot);
  const stateKey = buildBattleActionIntentStateKey(battle, action);
  const isReady = activeAbility.currentCooldown <= 0 && battle.player.currentMana >= activeAbility.manaCost;
  const labelSuffix = activeAbility.currentCooldown > 0
    ? ` · КД ${activeAbility.currentCooldown}`
    : battle.player.currentMana < activeAbility.manaCost
      ? ` · нужно ${activeAbility.manaCost} маны`
      : '';

  return {
    label: `🌀 ${slot + 1} ${activeAbility.name}${labelSuffix}`,
    command: slot === 0 ? gameCommands.skillSlot1 : gameCommands.skillSlot2,
    color: isReady ? Keyboard.PRIMARY_COLOR : Keyboard.SECONDARY_COLOR,
    intentScoped: true,
    stateKey,
  };
};

const createBattleEncounterActionLayout = (battle: BattleView): KeyboardLayout => {
  const fleeChance = battle.encounter?.fleeChancePercent ?? 0;
  const engageButton: KeyboardButtonDefinition = {
    label: '⚔️ В бой',
    command: gameCommands.engageBattle,
    color: Keyboard.POSITIVE_COLOR,
    intentScoped: true,
    stateKey: buildBattleActionIntentStateKey(battle, 'ENGAGE'),
  };
  const fleeButton: KeyboardButtonDefinition = {
    label: `💨 Отступить (${fleeChance}%)`,
    command: gameCommands.fleeBattle,
    color: Keyboard.PRIMARY_COLOR,
    intentScoped: true,
    stateKey: buildBattleActionIntentStateKey(battle, 'FLEE'),
  };

  return [[engageButton, fleeButton]];
};

const createBattleActionLayout = (battle: BattleView): KeyboardLayout => {
  if (isBattleEncounterOffered(battle)) {
    return createBattleEncounterActionLayout(battle);
  }

  const skillButtons = ([0, 1] as const)
    .map((slot) => createBattleSkillButton(battle, slot))
    .filter((button): button is KeyboardButtonDefinition => button !== null);

  return [
    [
      { label: '⚔️ Атака', command: gameCommands.attack, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: buildBattleActionIntentStateKey(battle, 'ATTACK') },
      { label: `🛡️ Защита (+${resolveDefendGuardGain(battle.player)} щит)`, command: gameCommands.defend, color: Keyboard.PRIMARY_COLOR, intentScoped: true, stateKey: buildBattleActionIntentStateKey(battle, 'DEFEND') },
    ],
    ...(skillButtons.length > 0 ? [skillButtons] : []),
  ];
};

const createBattleResultLayout = (battle: BattleView, player?: PlayerState): KeyboardLayout => {
  const exploreStateKey = player ? buildExploreLocationIntentStateKey(player) : undefined;
  const nextGoal = player ? buildBattleResultNextGoalView(battle, player) : null;
  const exploreLabel = nextGoal?.primaryAction === 'explore'
    ? nextGoal.primaryActionLabel
    : resolveSchoolContinuationLabel(player, '⚔️ Исследовать');

  return [
  battle.rewards?.droppedRune || nextGoal?.primaryAction === 'open_runes'
    ? [
        { label: nextGoal?.primaryActionLabel ?? '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.PRIMARY_COLOR },
        { label: exploreLabel, command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: exploreStateKey },
      ]
    : [{ label: exploreLabel, command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: exploreStateKey }],
  [
    { label: '👤 Летопись', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
  ];
};

const createPendingRewardLayout = (pendingReward: PendingRewardView): KeyboardLayout => {
  const actionRows = pendingReward.snapshot.trophyActions.map((action) => [{
    label: action.label,
    command: resolveTrophyActionCodeCommand(action.code),
    color: action.code === 'claim_all' ? Keyboard.SECONDARY_COLOR : Keyboard.POSITIVE_COLOR,
    intentScoped: true,
    stateKey: pendingReward.ledgerKey,
  }] as const);

  return [
    ...actionRows,
    [
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

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

const createRuneListLayout = (player?: PlayerState): KeyboardLayout => {
  const craftStateKey = player ? buildCraftIntentStateKey(player) : undefined;
  if (!player || player.runes.length === 0) {
    return [
      [
        { label: '✨ Создать', command: gameCommands.craftRune, color: Keyboard.POSITIVE_COLOR, intentScoped: Boolean(player), stateKey: craftStateKey },
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
      { label: '◀ Назад', command: gameCommands.previousRunePage, color: Keyboard.SECONDARY_COLOR, intentScoped: true, stateKey: previousPageStateKey },
      { label: '▶ Вперёд', command: gameCommands.nextRunePage, color: Keyboard.SECONDARY_COLOR, intentScoped: true, stateKey: nextPageStateKey },
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
      { label: '✨ Создать', command: gameCommands.craftRune, color: Keyboard.POSITIVE_COLOR, intentScoped: true, stateKey: craftStateKey },
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

export const createBattleKeyboard = (battle: BattleView): KeyboardBuilder => buildKeyboard(createBattleActionLayout(battle));

export const createBattleResultKeyboard = (battle: BattleView, player?: PlayerState): KeyboardBuilder => buildKeyboard(createBattleResultLayout(battle, player));

export const createPendingRewardKeyboard = (pendingReward: PendingRewardView): KeyboardBuilder => buildKeyboard(
  createPendingRewardLayout(pendingReward),
  { inline: true },
);

export const createRuneKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createRuneListLayout(player));

export const createRuneDetailKeyboard = (player?: PlayerState): KeyboardBuilder => buildKeyboard(createRuneDetailLayout(player));

export const createAltarKeyboard = (player?: PlayerState): KeyboardBuilder => createRuneDetailKeyboard(player);

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
