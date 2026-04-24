import type {
  BattleEnemyIntentSnapshot,
  BattleView,
} from '../../../shared/types/game';
import { isBattleEncounterOffered } from './battle-encounter';
import { consumeGuardAgainstDamage, getGuardPoints } from './battle-damage';
import {
  createGuardBreakIntent,
  createHeavyStrikeIntent,
  shouldEnemyPrepareGuardBreak,
  shouldEnemyPrepareHeavyStrike,
} from './battle-tactics';
import {
  finishEnemyAction,
  finishEnemyPreparation,
  preparePartyEnemyTarget,
} from './battle-turn-flow';
import { appendBattleLog, calculatePhysicalDamage } from './battle-utils';
import {
  formatBattleActor,
  formatEnemyAttackLine,
} from './battle-log-lines';
import { resolveEnemyIntentReading } from './enemy-intent-reading';

export interface EnemyTurnOptions {
  readonly signatureReactionSucceeded?: boolean;
  readonly signatureReactionChancePercent?: number;
}

interface EnemyAttackOptions {
  readonly shattersGuard?: boolean;
}

const resolveIntentPatternLabel = (intent: BattleEnemyIntentSnapshot): string => (
  intent.code === 'HEAVY_STRIKE' ? 'силовой удар' : 'приём против стойки'
);

const formatEnemyIntentPreparationLine = (battle: BattleView): string => {
  const intent = battle.enemy.intent;
  if (!intent) {
    return `⚠️ ${formatBattleActor(battle.enemy.name)} меняет стойку.`;
  }

  const reading = resolveEnemyIntentReading(battle);
  if (reading.precision === 'exact') {
    return `⚠️ ${formatBattleActor(battle.enemy.name)} раскрывает «${intent.title}». ${intent.description}`;
  }

  if (reading.precision === 'pattern') {
    return `⚠️ ${formatBattleActor(battle.enemy.name)} выдаёт ${resolveIntentPatternLabel(intent)}. Точный жест ещё скрыт.`;
  }

  return `⚠️ ${formatBattleActor(battle.enemy.name)} собирает опасный ход. Замысел не прочитан.`;
};

const formatSignatureReactionLine = (
  reactionSucceeded: boolean,
  chancePercent: number | undefined,
): string => {
  const chanceSuffix = chancePercent === undefined ? '' : ` (${chancePercent}%)`;

  return reactionSucceeded
    ? `⚡ Реакция${chanceSuffix}: вы успеваете удержать окно ответа.`
    : `⚡ Реакция${chanceSuffix}: враг срывает навык первым.`;
};

const resolveEnemyAttack = (
  battle: BattleView,
  attack: number,
  attackText: string,
  options: EnemyAttackOptions = {},
): void => {
  const shatteredGuard = options.shattersGuard ? getGuardPoints(battle.player) : 0;
  if (options.shattersGuard && shatteredGuard > 0) {
    battle.player.guardPoints = 0;
  }

  const rawDamage = calculatePhysicalDamage(attack, battle.player.defence);
  const { blockedDamage, dealtDamage } = consumeGuardAgainstDamage(battle.player, rawDamage);

  battle.log = appendBattleLog(
    battle.log,
    ...(shatteredGuard > 0 ? [`💥 ${formatBattleActor(battle.enemy.name)} разбивает защиту ${formatBattleActor(battle.player.name)} на ${shatteredGuard}.`] : []),
    ...(blockedDamage > 0 ? [`🛡️ ${formatBattleActor(battle.player.name)} смягчает удар на ${blockedDamage} урона.`] : []),
    dealtDamage > 0
      ? attackText.replace('{damage}', `${dealtDamage}`)
      : `🛡️ ${formatBattleActor(battle.player.name)} принимает весь удар защитой.`,
  );

  battle.player.currentHealth = Math.max(0, battle.player.currentHealth - dealtDamage);
};

const resolveHeavyStrike = (battle: BattleView): BattleView => {
  const intent = battle.enemy.intent;
  if (!intent) {
    return battle;
  }

  battle.enemy.intent = null;
  battle.enemy.hasUsedSignatureMove = true;
  preparePartyEnemyTarget(battle);
  if (battle.status === 'COMPLETED') {
    return battle;
  }

  resolveEnemyAttack(
    battle,
    battle.enemy.attack + intent.bonusAttack,
    `💥 ${formatBattleActor(battle.enemy.name)} проводит «${intent.title}» против ${formatBattleActor(battle.player.name)} и наносит {damage} урона.`,
  );

  return finishEnemyAction(battle);
};

const resolveGuardBreak = (battle: BattleView): BattleView => {
  const intent = battle.enemy.intent;
  if (!intent) {
    return battle;
  }

  battle.enemy.intent = null;
  battle.enemy.hasUsedSignatureMove = true;
  preparePartyEnemyTarget(battle);
  if (battle.status === 'COMPLETED') {
    return battle;
  }

  resolveEnemyAttack(
    battle,
    battle.enemy.attack + intent.bonusAttack,
    `🧪 ${formatBattleActor(battle.enemy.name)} проводит «${intent.title}» против ${formatBattleActor(battle.player.name)} и наносит {damage} урона.`,
    { shattersGuard: intent.shattersGuard },
  );

  return finishEnemyAction(battle);
};

const resolvePreparedEnemyIntent = (battle: BattleView): BattleView => {
  if (battle.enemy.intent?.code === 'HEAVY_STRIKE') {
    return resolveHeavyStrike(battle);
  }

  if (battle.enemy.intent?.code === 'GUARD_BREAK') {
    return resolveGuardBreak(battle);
  }

  return finishEnemyPreparation(battle);
};

const prepareEnemySignatureIntent = (
  battle: BattleView,
  intent: BattleEnemyIntentSnapshot,
  options: EnemyTurnOptions,
): BattleView => {
  battle.enemy.intent = intent;
  battle.log = appendBattleLog(
    battle.log,
    formatEnemyIntentPreparationLine(battle),
  );

  if (options.signatureReactionSucceeded === undefined) {
    return finishEnemyPreparation(battle);
  }

  battle.log = appendBattleLog(
    battle.log,
    formatSignatureReactionLine(options.signatureReactionSucceeded, options.signatureReactionChancePercent),
  );

  if (options.signatureReactionSucceeded) {
    return finishEnemyPreparation(battle);
  }

  return resolvePreparedEnemyIntent(battle);
};

export const resolveEnemyActionTurn = (
  battle: BattleView,
  options: EnemyTurnOptions = {},
): BattleView => {
  if (battle.turnOwner !== 'ENEMY' || isBattleEncounterOffered(battle)) {
    return battle;
  }

  if (battle.enemy.intent?.code === 'HEAVY_STRIKE') {
    return resolveHeavyStrike(battle);
  }

  if (battle.enemy.intent?.code === 'GUARD_BREAK') {
    return resolveGuardBreak(battle);
  }

  if (shouldEnemyPrepareGuardBreak(battle.enemy)) {
    return prepareEnemySignatureIntent(battle, createGuardBreakIntent(battle.enemy), options);
  }

  if (shouldEnemyPrepareHeavyStrike(battle.enemy)) {
    return prepareEnemySignatureIntent(battle, createHeavyStrikeIntent(battle.enemy), options);
  }

  preparePartyEnemyTarget(battle);
  if (battle.status === 'COMPLETED') {
    return battle;
  }

  resolveEnemyAttack(
    battle,
    battle.enemy.attack,
    `👾 ${formatEnemyAttackLine(battle.enemy.name, battle.enemy.attackText, battle.player.name, '{damage}')}`,
  );

  return finishEnemyAction(battle);
};
