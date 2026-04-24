import { AppError } from '../../../shared/domain/AppError';
import type { AlchemyConsumableDefinition } from '../../consumables/domain/alchemy-consumables';
import type {
  BattleActionType,
  BattleView,
} from '../../../shared/types/game';
import { isBattleEncounterOffered } from './battle-encounter';
import { appendBattleLog, cloneBattle } from './battle-utils';
import {
  formatBattleActor,
  messageWhen,
} from './battle-log-lines';
import {
  performPlayerAttack,
  performPlayerDefend,
  performRuneSkill,
  useBattleConsumable,
} from './battle-player-actions';
import {
  resolveEnemyActionTurn,
  type EnemyTurnOptions,
} from './battle-enemy-actions';

interface PlayerActionOptions {
  readonly fleeSucceeded?: boolean;
}

export class BattleEngine {
  public static performPlayerAction(
    battle: BattleView,
    action: BattleActionType,
    options: PlayerActionOptions = {},
  ): BattleView {
    switch (action) {
      case 'ENGAGE':
        return this.engageEncounter(battle);
      case 'FLEE':
        return this.attemptFlee(battle, options.fleeSucceeded ?? false);
      case 'ATTACK':
        return this.attack(battle);
      case 'DEFEND':
        return this.defend(battle);
      case 'RUNE_SKILL':
      case 'RUNE_SKILL_SLOT_1':
      case 'RUNE_SKILL_SLOT_2':
        return this.useRuneSkill(battle, action);
      case 'USE_HEALING_PILL':
      case 'USE_FOCUS_PILL':
      case 'USE_GUARD_PILL':
      case 'USE_CLARITY_PILL':
        throw new AppError('unknown_battle_action', 'Для пилюли нужен выбранный алхимический состав.');
      default:
        throw new AppError('unknown_battle_action', `Неизвестное боевое действие: ${action}.`);
    }
  }

  public static attack(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    return performPlayerAttack(nextBattle);
  }

  public static defend(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    return performPlayerDefend(nextBattle);
  }

  public static useRuneSkill(battle: BattleView, action: BattleActionType = 'RUNE_SKILL_SLOT_1'): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    return performRuneSkill(nextBattle, action);
  }

  public static useConsumable(battle: BattleView, consumable: AlchemyConsumableDefinition): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    return useBattleConsumable(nextBattle, consumable);
  }

  public static resolveEnemyTurn(battle: BattleView, options: EnemyTurnOptions = {}): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertActive(nextBattle);

    return resolveEnemyActionTurn(nextBattle, options);
  }

  private static engageEncounter(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertActive(nextBattle);
    this.assertEncounterOffered(nextBattle);

    const initialTurnOwner = nextBattle.encounter?.initialTurnOwner ?? 'PLAYER';
    const encounterEffectLine = nextBattle.encounter?.effectLine ?? null;
    nextBattle.encounter = {
      ...nextBattle.encounter!,
      status: 'ENGAGED',
    };
    nextBattle.turnOwner = initialTurnOwner;
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `⚔️ ${formatBattleActor(nextBattle.player.name)} принимает встречу с ${formatBattleActor(nextBattle.enemy.name)}: бой начинается.`,
      ...messageWhen(
        encounterEffectLine !== null,
        `🧭 Условие встречи: ${encounterEffectLine ?? ''}`,
      ),
    );

    return nextBattle;
  }

  private static attemptFlee(battle: BattleView, fleeSucceeded: boolean): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertActive(nextBattle);
    this.assertEncounterOffered(nextBattle);

    if (fleeSucceeded) {
      nextBattle.encounter = {
        ...nextBattle.encounter!,
        status: 'FLED',
      };
      nextBattle.status = 'COMPLETED';
      nextBattle.result = 'FLED';
      nextBattle.turnOwner = 'PLAYER';
      nextBattle.rewards = null;
      nextBattle.log = appendBattleLog(
        nextBattle.log,
        `💨 ${formatBattleActor(nextBattle.player.name)} отступает от ${formatBattleActor(nextBattle.enemy.name)}: бой не начинается.`,
      );

      return nextBattle;
    }

    nextBattle.encounter = {
      ...nextBattle.encounter!,
      status: 'ENGAGED',
    };
    nextBattle.turnOwner = 'ENEMY';
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `💨 ${formatBattleActor(nextBattle.player.name)} пытается отступить от ${formatBattleActor(nextBattle.enemy.name)}, но ${formatBattleActor(nextBattle.enemy.name)} перехватывает путь.`,
    );

    return nextBattle;
  }

  private static assertPlayerTurn(battle: BattleView): void {
    this.assertActive(battle);

    if (isBattleEncounterOffered(battle)) {
      throw new AppError('battle_encounter_pending', 'Сначала выберите: вступить в бой или попробовать отступить.');
    }

    if (battle.turnOwner !== 'PLAYER') {
      throw new AppError('enemy_turn', 'Сейчас ход противника.');
    }
  }

  private static assertEncounterOffered(battle: BattleView): void {
    if (!isBattleEncounterOffered(battle)) {
      throw new AppError('battle_encounter_already_resolved', 'Встреча уже перешла в бой.');
    }
  }

  private static assertActive(battle: BattleView): void {
    if (battle.status !== 'ACTIVE') {
      throw new AppError('battle_completed', 'Бой уже завершен.');
    }
  }
}
