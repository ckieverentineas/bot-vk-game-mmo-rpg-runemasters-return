import { AppError } from '../../../shared/domain/AppError';
import type {
  BattleActionType,
  BattlePlayerSnapshot,
  BattleResult,
  BattleRuneActionSnapshot,
  BattleView,
} from '../../../shared/types/game';
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

const getGuardPoints = (player: BattlePlayerSnapshot): number => player.guardPoints ?? 0;

const getActiveRuneAction = (battle: BattleView): BattleRuneActionSnapshot | null => (
  battle.player.runeLoadout?.activeAbility ?? null
);

const tickRuneCooldown = (battle: BattleView): void => {
  const activeAbility = getActiveRuneAction(battle);
  if (!activeAbility || activeAbility.currentCooldown <= 0) {
    return;
  }

  activeAbility.currentCooldown -= 1;
};

const spendRuneManaAndSetCooldown = (battle: BattleView, ability: BattleRuneActionSnapshot): void => {
  battle.player.currentMana = Math.max(0, battle.player.currentMana - ability.manaCost);
  ability.currentCooldown = ability.cooldownTurns;
};

export class BattleEngine {
  public static performPlayerAction(battle: BattleView, action: BattleActionType): BattleView {
    switch (action) {
      case 'ATTACK':
        return this.attack(battle);
      case 'RUNE_SKILL':
        return this.useRuneSkill(battle);
      default:
        throw new AppError('unknown_battle_action', `Неизвестное боевое действие: ${action}.`);
    }
  }

  public static attack(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);
    return this.performAttack(nextBattle);
  }

  public static useRuneSkill(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    const activeAbility = getActiveRuneAction(nextBattle);
    if (!activeAbility || !nextBattle.player.runeLoadout) {
      throw new AppError('rune_skill_not_available', 'Сейчас у экипированной руны нет активного боевого действия.');
    }

    if (activeAbility.currentCooldown > 0) {
      throw new AppError('ability_on_cooldown', `Навык «${activeAbility.name}» будет готов через ${activeAbility.currentCooldown} ход.`);
    }

    if (nextBattle.player.currentMana < activeAbility.manaCost) {
      throw new AppError('not_enough_mana', `Для навыка «${activeAbility.name}» нужно ${activeAbility.manaCost} маны.`);
    }

    switch (activeAbility.code) {
      case 'ember_pulse':
        return this.performEmberPulse(nextBattle, activeAbility);
      case 'gale_step':
        return this.performGaleStep(nextBattle, activeAbility);
      default:
        throw new AppError('rune_skill_not_available', `Навык «${activeAbility.name}» ещё не поддерживается в бою.`);
    }
  }

  public static resolveEnemyTurn(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertActive(nextBattle);

    if (nextBattle.turnOwner !== 'ENEMY') {
      return nextBattle;
    }

    const rawDamage = calculatePhysicalDamage(nextBattle.enemy.attack, nextBattle.player.defence);
    const guardPoints = getGuardPoints(nextBattle.player);
    const blockedDamage = Math.min(guardPoints, rawDamage);
    const dealtDamage = rawDamage - blockedDamage;

    nextBattle.player.guardPoints = Math.max(0, guardPoints - blockedDamage);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      ...(blockedDamage > 0 ? [`🛡️ Рунная защита смягчает удар на ${blockedDamage} урона.`] : []),
      dealtDamage > 0
        ? `👾 ${nextBattle.enemy.name} ${nextBattle.enemy.attackText} и наносит ${dealtDamage} урона.`
        : `👾 ${nextBattle.enemy.name} ${nextBattle.enemy.attackText}, но руна гасит весь урон.`,
    );

    nextBattle.player.currentHealth = Math.max(0, nextBattle.player.currentHealth - dealtDamage);
    if (nextBattle.player.currentHealth === 0) {
      return finalizeBattle(nextBattle, 'DEFEAT');
    }

    tickRuneCooldown(nextBattle);
    nextBattle.turnOwner = 'PLAYER';
    return nextBattle;
  }

  private static performAttack(nextBattle: BattleView): BattleView {
    const damage = calculatePhysicalDamage(nextBattle.player.attack, nextBattle.enemy.defence);
    nextBattle.enemy.currentHealth = Math.max(0, nextBattle.enemy.currentHealth - damage);
    nextBattle.log = appendBattleLog(nextBattle.log, `⚔️ Вы наносите ${damage} урона врагу ${nextBattle.enemy.name}.`);

    if (nextBattle.enemy.currentHealth === 0) {
      return finalizeBattle(nextBattle, 'VICTORY');
    }

    nextBattle.turnOwner = 'ENEMY';
    return nextBattle;
  }

  private static performEmberPulse(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const spellPower = nextBattle.player.attack + nextBattle.player.intelligence + 1;
    const damage = calculatePhysicalDamage(spellPower, nextBattle.enemy.magicDefence);
    nextBattle.enemy.currentHealth = Math.max(0, nextBattle.enemy.currentHealth - damage);
    spendRuneManaAndSetCooldown(nextBattle, activeAbility);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🌀 ${activeAbility.name} прожигает ${nextBattle.enemy.name} на ${damage} урона.`,
      `💙 Мана: ${nextBattle.player.currentMana}/${nextBattle.player.maxMana}.`,
    );

    if (nextBattle.enemy.currentHealth === 0) {
      return finalizeBattle(nextBattle, 'VICTORY');
    }

    nextBattle.turnOwner = 'ENEMY';
    return nextBattle;
  }

  private static performGaleStep(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const strikePower = Math.max(1, Math.floor(nextBattle.player.attack * 0.75) + Math.floor(nextBattle.player.dexterity / 2));
    const damage = calculatePhysicalDamage(strikePower, nextBattle.enemy.defence);
    const guardGain = 2 + Math.floor(nextBattle.player.dexterity / 2);
    const guardCap = 4 + nextBattle.player.defence + Math.floor(nextBattle.player.dexterity / 2);

    nextBattle.enemy.currentHealth = Math.max(0, nextBattle.enemy.currentHealth - damage);
    nextBattle.player.guardPoints = Math.min(guardCap, getGuardPoints(nextBattle.player) + guardGain);
    spendRuneManaAndSetCooldown(nextBattle, activeAbility);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🌀 ${activeAbility.name} наносит ${damage} урона и готовит защиту на ${guardGain} урона.`,
      `💙 Мана: ${nextBattle.player.currentMana}/${nextBattle.player.maxMana}.`,
    );

    if (nextBattle.enemy.currentHealth === 0) {
      return finalizeBattle(nextBattle, 'VICTORY');
    }

    nextBattle.turnOwner = 'ENEMY';
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
