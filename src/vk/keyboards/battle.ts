import { Keyboard } from 'vk-io';

import { buildBattleActionIntentStateKey } from '../../modules/combat/application/command-intent-state';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import {
  getBattleRuneLoadout,
  resolveBattleRuneSkillAction,
  type BattleRuneSlotIndex,
} from '../../modules/combat/domain/battle-rune-loadouts';
import { resolveDefendGuardGain } from '../../modules/combat/domain/battle-tactics';
import { buildExploreLocationIntentStateKey } from '../../modules/exploration/application/command-intent-state';
import { buildBattleResultNextGoalView } from '../../modules/player/application/read-models/next-goal';
import type { BattleView, PlayerState } from '../../shared/types/game';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import { resolveSchoolContinuationLabel } from './goal-labels';
import type { KeyboardBuilder, KeyboardButtonDefinition, KeyboardLayout } from './types';

const createBattleSkillButton = (
  battle: BattleView,
  slot: BattleRuneSlotIndex,
): KeyboardButtonDefinition | null => {
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
      {
        label: '⚔️ Атака',
        command: gameCommands.attack,
        color: Keyboard.POSITIVE_COLOR,
        intentScoped: true,
        stateKey: buildBattleActionIntentStateKey(battle, 'ATTACK'),
      },
      {
        label: `🛡️ Защита (+${resolveDefendGuardGain(battle.player)} щит)`,
        command: gameCommands.defend,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: buildBattleActionIntentStateKey(battle, 'DEFEND'),
      },
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
          {
            label: nextGoal?.primaryActionLabel ?? '🔮 Руны',
            command: gameCommands.runeCollection,
            color: Keyboard.PRIMARY_COLOR,
          },
          {
            label: exploreLabel,
            command: gameCommands.explore,
            color: Keyboard.POSITIVE_COLOR,
            intentScoped: Boolean(player),
            stateKey: exploreStateKey,
          },
        ]
      : [{
          label: exploreLabel,
          command: gameCommands.explore,
          color: Keyboard.POSITIVE_COLOR,
          intentScoped: Boolean(player),
          stateKey: exploreStateKey,
        }],
    [
      { label: '👤 Летопись', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

export const createBattleKeyboard = (battle: BattleView): KeyboardBuilder => (
  buildKeyboard(createBattleActionLayout(battle))
);

export const createBattleResultKeyboard = (battle: BattleView, player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createBattleResultLayout(battle, player))
);
