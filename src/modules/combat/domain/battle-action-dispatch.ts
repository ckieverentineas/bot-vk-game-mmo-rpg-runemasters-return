import { AppError } from '../../../shared/domain/AppError';
import type { AlchemyConsumableDefinition } from '../../consumables/domain/alchemy-consumables';
import type {
  BattleActionType,
  BattleView,
} from '../../../shared/types/game';
import {
  attemptBattleFlee,
  engageBattleEncounter,
} from './battle-encounter-actions';
import {
  resolveEnemyActionTurn,
  type EnemyTurnOptions,
} from './battle-enemy-actions';
import {
  performPlayerAttack,
  performPlayerDefend,
  performRuneSkill,
  useBattleConsumable,
} from './battle-player-actions';
import {
  assertActiveBattle,
  assertPlayerBattleTurn,
} from './battle-state-guards';

export interface PlayerActionOptions {
  readonly fleeSucceeded?: boolean;
}

export const resolveBattleAttack = (battle: BattleView): BattleView => {
  assertPlayerBattleTurn(battle);

  return performPlayerAttack(battle);
};

export const resolveBattleDefend = (battle: BattleView): BattleView => {
  assertPlayerBattleTurn(battle);

  return performPlayerDefend(battle);
};

export const resolveBattleRuneSkill = (
  battle: BattleView,
  action: BattleActionType = 'RUNE_SKILL_SLOT_1',
): BattleView => {
  assertPlayerBattleTurn(battle);

  return performRuneSkill(battle, action);
};

export const resolveBattleConsumable = (
  battle: BattleView,
  consumable: AlchemyConsumableDefinition,
): BattleView => {
  assertPlayerBattleTurn(battle);

  return useBattleConsumable(battle, consumable);
};

export const resolveBattleEnemyTurn = (
  battle: BattleView,
  options: EnemyTurnOptions = {},
): BattleView => {
  assertActiveBattle(battle);

  return resolveEnemyActionTurn(battle, options);
};

export const resolveBattlePlayerAction = (
  battle: BattleView,
  action: BattleActionType,
  options: PlayerActionOptions = {},
): BattleView => {
  switch (action) {
    case 'ENGAGE':
      return engageBattleEncounter(battle);
    case 'FLEE':
      return attemptBattleFlee(battle, options.fleeSucceeded ?? false);
    case 'ATTACK':
      return resolveBattleAttack(battle);
    case 'DEFEND':
      return resolveBattleDefend(battle);
    case 'RUNE_SKILL':
    case 'RUNE_SKILL_SLOT_1':
    case 'RUNE_SKILL_SLOT_2':
      return resolveBattleRuneSkill(battle, action);
    case 'USE_HEALING_PILL':
    case 'USE_FOCUS_PILL':
    case 'USE_GUARD_PILL':
    case 'USE_CLARITY_PILL':
      throw new AppError('unknown_battle_action', 'Для пилюли нужен выбранный алхимический состав.');
    default:
      throw new AppError('unknown_battle_action', `Неизвестное боевое действие: ${action}.`);
  }
};
