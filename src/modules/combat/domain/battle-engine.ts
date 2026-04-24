import type { AlchemyConsumableDefinition } from '../../consumables/domain/alchemy-consumables';
import type {
  BattleActionType,
  BattleView,
} from '../../../shared/types/game';
import {
  resolveBattleAttack,
  resolveBattleConsumable,
  resolveBattleDefend,
  resolveBattleEnemyTurn,
  resolveBattlePlayerAction,
  resolveBattleRuneSkill,
  type PlayerActionOptions,
} from './battle-action-dispatch';
import type { EnemyTurnOptions } from './battle-enemy-actions';
import { cloneBattle } from './battle-utils';

export class BattleEngine {
  public static performPlayerAction(
    battle: BattleView,
    action: BattleActionType,
    options: PlayerActionOptions = {},
  ): BattleView {
    return resolveBattlePlayerAction(cloneBattle(battle), action, options);
  }

  public static attack(battle: BattleView): BattleView {
    return resolveBattleAttack(cloneBattle(battle));
  }

  public static defend(battle: BattleView): BattleView {
    return resolveBattleDefend(cloneBattle(battle));
  }

  public static useRuneSkill(
    battle: BattleView,
    action: BattleActionType = 'RUNE_SKILL_SLOT_1',
  ): BattleView {
    return resolveBattleRuneSkill(cloneBattle(battle), action);
  }

  public static useConsumable(
    battle: BattleView,
    consumable: AlchemyConsumableDefinition,
  ): BattleView {
    return resolveBattleConsumable(cloneBattle(battle), consumable);
  }

  public static resolveEnemyTurn(
    battle: BattleView,
    options: EnemyTurnOptions = {},
  ): BattleView {
    return resolveBattleEnemyTurn(cloneBattle(battle), options);
  }
}
