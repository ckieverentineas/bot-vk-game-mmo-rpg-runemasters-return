import { Keyboard } from 'vk-io';

import { buildBattleActionIntentStateKey } from '../../modules/combat/application/command-intent-state';
import { buildBattleRuneActionReadinessView } from '../../modules/combat/application/read-models/battle-rune-action-readiness';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import {
  getAlchemyConsumableCount,
  listAlchemyConsumables,
} from '../../modules/consumables/domain/alchemy-consumables';
import {
  getBattleRuneLoadout,
  resolveBattleRuneSkillAction,
  type BattleRuneSlotIndex,
} from '../../modules/combat/domain/battle-rune-loadouts';
import {
  type EnemyIntentReading,
  isEnemyIntentReadable,
  resolveEnemyIntentReading,
} from '../../modules/combat/domain/enemy-intent-reading';
import { resolveDefendGuardGain, resolveIntentDefendGuardBonus } from '../../modules/combat/domain/battle-tactics';
import { buildExploreLocationIntentStateKey } from '../../modules/exploration/application/command-intent-state';
import { buildBattleResultNextGoalView } from '../../modules/player/application/read-models/next-goal';
import type { BattleView, PlayerState } from '../../shared/types/game';
import { gameCommands, resolveUseConsumableCodeCommand } from '../commands/catalog';
import { buildKeyboard } from './builder';
import { resolveSchoolContinuationLabel } from './goal-labels';
import { createPostVictoryNavigationRows } from './post-victory-navigation';
import type { KeyboardBuilder, KeyboardButtonDefinition, KeyboardLayout } from './types';

const createBattleSkillButton = (
  battle: BattleView,
  slot: BattleRuneSlotIndex,
  reading: EnemyIntentReading,
): KeyboardButtonDefinition | null => {
  const activeAbility = getBattleRuneLoadout(battle.player, slot)?.activeAbility ?? null;
  if (!activeAbility) {
    return null;
  }

  const action = resolveBattleRuneSkillAction(slot);
  const stateKey = buildBattleActionIntentStateKey(battle, action);
  const readiness = buildBattleRuneActionReadinessView(battle, activeAbility);
  const isRuneAnswerHighlighted = readiness.isReady && isEnemyIntentReadable(reading);

  return {
    label: `🌀 ${slot + 1} ${activeAbility.name}${readiness.buttonSuffix}`,
    command: slot === 0 ? gameCommands.skillSlot1 : gameCommands.skillSlot2,
    color: isRuneAnswerHighlighted
      ? Keyboard.POSITIVE_COLOR
      : readiness.isReady
        ? Keyboard.PRIMARY_COLOR
        : Keyboard.SECONDARY_COLOR,
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

const createBattleConsumableRows = (battle: BattleView, player?: PlayerState): KeyboardLayout => {
  if (!player || isBattleEncounterOffered(battle)) {
    return [];
  }

  const buttons = listAlchemyConsumables()
    .filter((consumable) => getAlchemyConsumableCount(player.inventory, consumable) > 0)
    .map((consumable) => ({
      label: `${consumable.battleButtonLabel} x${getAlchemyConsumableCount(player.inventory, consumable)}`,
      command: resolveUseConsumableCodeCommand(consumable.code),
      color: Keyboard.PRIMARY_COLOR,
      intentScoped: true,
      stateKey: buildBattleActionIntentStateKey(battle, consumable.battleAction),
    }));

  const rows: KeyboardButtonDefinition[][] = [];
  for (let index = 0; index < buttons.length; index += 2) {
    rows.push(buttons.slice(index, index + 2));
  }

  return rows;
};

const createBattleActionLayout = (battle: BattleView, player?: PlayerState): KeyboardLayout => {
  if (isBattleEncounterOffered(battle)) {
    return createBattleEncounterActionLayout(battle);
  }

  const reading = resolveEnemyIntentReading(battle);
  const readableIntent = isEnemyIntentReadable(reading) ? reading.intent : null;
  const skillButtons = ([0, 1] as const)
    .map((slot) => createBattleSkillButton(battle, slot, reading))
    .filter((button): button is KeyboardButtonDefinition => button !== null);
  const defendGuardGain = resolveDefendGuardGain(battle.player) + resolveIntentDefendGuardBonus(readableIntent);

  return [
    [
      {
        label: '⚔️ Атака',
        command: gameCommands.attack,
        color: readableIntent?.code === 'HEAVY_STRIKE'
          ? Keyboard.SECONDARY_COLOR
          : Keyboard.POSITIVE_COLOR,
        intentScoped: true,
        stateKey: buildBattleActionIntentStateKey(battle, 'ATTACK'),
      },
      {
        label: `🛡️ Защита (+${defendGuardGain} щит)`,
        command: gameCommands.defend,
        color: readableIntent?.code === 'HEAVY_STRIKE'
          ? Keyboard.POSITIVE_COLOR
          : readableIntent?.code === 'GUARD_BREAK'
            ? Keyboard.SECONDARY_COLOR
            : Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: buildBattleActionIntentStateKey(battle, 'DEFEND'),
      },
    ],
    ...(skillButtons.length > 0 ? [skillButtons] : []),
    ...createBattleConsumableRows(battle, player),
  ];
};

const createBattleResultLayout = (battle: BattleView, player?: PlayerState): KeyboardLayout => {
  const isPartyVictory = battle.battleType === 'PARTY_PVE'
    && battle.party !== undefined
    && battle.party !== null
    && battle.result === 'VICTORY';
  const exploreStateKey = !isPartyVictory && player
    ? buildExploreLocationIntentStateKey(player)
    : undefined;
  const nextGoal = player ? buildBattleResultNextGoalView(battle, player) : null;

  if (battle.result === 'VICTORY') {
    return [
      ...createPostVictoryNavigationRows({
        includeLootButton: true,
        exploreLabel: isPartyVictory ? '⚔️ Исследовать вместе' : '⚔️ Исследовать',
        exploreCommand: isPartyVictory ? gameCommands.exploreParty : gameCommands.explore,
        exploreIntentScoped: !isPartyVictory && Boolean(player),
        exploreStateKey,
      }),
      [
        { label: '👤 Летопись', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
        { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
      ],
    ];
  }

  const exploreLabel = isPartyVictory
    ? '⚔️ Исследовать вместе'
    : battle.result === 'DEFEAT'
    ? '⚔️ Осторожно дальше'
    : nextGoal?.primaryAction === 'explore'
      ? nextGoal.primaryActionLabel
      : resolveSchoolContinuationLabel(player, '⚔️ Исследовать');
  const exploreCommand = isPartyVictory ? gameCommands.exploreParty : gameCommands.explore;
  const isExploreIntentScoped = !isPartyVictory && Boolean(player);

  return [
    battle.rewards?.droppedRune || nextGoal?.primaryAction === 'open_runes'
      ? [
          {
            label: nextGoal?.primaryActionLabel ?? '🔮 Руны',
            command: gameCommands.runeCollection,
            color: Keyboard.PRIMARY_COLOR,
          },
          {
            label: exploreLabel,
            command: exploreCommand,
            color: Keyboard.POSITIVE_COLOR,
            intentScoped: isExploreIntentScoped,
            stateKey: exploreStateKey,
          },
        ]
      : [{
          label: exploreLabel,
          command: exploreCommand,
          color: Keyboard.POSITIVE_COLOR,
          intentScoped: isExploreIntentScoped,
          stateKey: exploreStateKey,
        }],
    [
      { label: '👤 Летопись', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

export const createBattleKeyboard = (battle: BattleView, player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createBattleActionLayout(battle, player))
);

export const createBattleResultKeyboard = (battle: BattleView, player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createBattleResultLayout(battle, player))
);
