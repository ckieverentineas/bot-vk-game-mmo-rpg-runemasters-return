import { AppError } from '../../../shared/domain/AppError';
import type { BattleResult, BattleView } from '../../../shared/types/game';
import { appendBattleLog, calculatePhysicalDamage, cloneBattle } from './battle-utils';

const finalizeBattle = (battle: BattleView, result: BattleResult): BattleView => {
  battle.status = 'COMPLETED';
  battle.result = result;
  battle.turnOwner = 'PLAYER';
  battle.rewards = result === 'VICTORY'
    ? {
        experience: battle.enemy.experienceReward,
        gold: battle.enemy.goldReward,
        shards: {},
        droppedRune: null,
      }
    : {
        experience: 0,
        gold: 0,
        shards: {},
        droppedRune: null,
      };

  return battle;
};

export class BattleEngine {
  public static attack(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    const damage = calculatePhysicalDamage(nextBattle.player.attack, nextBattle.enemy.defence);
    nextBattle.enemy.currentHealth = Math.max(0, nextBattle.enemy.currentHealth - damage);
    nextBattle.log = appendBattleLog(nextBattle.log, `⚔️ Вы наносите ${damage} урона врагу ${nextBattle.enemy.name}.`);

    if (nextBattle.enemy.currentHealth === 0) {
      return finalizeBattle(nextBattle, 'VICTORY');
    }

    nextBattle.turnOwner = 'ENEMY';
    return nextBattle;
  }

  public static resolveEnemyTurn(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertActive(nextBattle);

    if (nextBattle.turnOwner !== 'ENEMY') {
      return nextBattle;
    }

    const damage = calculatePhysicalDamage(nextBattle.enemy.attack, nextBattle.player.defence);
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `👾 ${nextBattle.enemy.name} ${nextBattle.enemy.attackText} и наносит ${damage} урона.`,
    );

    nextBattle.player.currentHealth = Math.max(0, nextBattle.player.currentHealth - damage);
    if (nextBattle.player.currentHealth === 0) {
      return finalizeBattle(nextBattle, 'DEFEAT');
    }

    nextBattle.turnOwner = 'PLAYER';
    return nextBattle;
  }

  private static assertPlayerTurn(battle: BattleView): void {
    this.assertActive(battle);

    if (battle.turnOwner !== 'PLAYER') {
      throw new AppError('enemy_turn', 'Сейчас ход противника.');
    }
  }

  private static assertActive(battle: BattleView): void {
    if (battle.status !== 'ACTIVE') {
      throw new AppError('battle_completed', 'Бой уже завершен.');
    }
  }
}
