import { AppError } from '../../../shared/domain/AppError';
import type { AlchemyConsumableDefinition } from '../../consumables/domain/alchemy-consumables';
import type {
  BattleActionType,
  BattleEnemyIntentSnapshot,
  BattleView,
} from '../../../shared/types/game';
import { isBattleEncounterOffered } from './battle-encounter';
import { appendBattleLog, calculatePhysicalDamage, cloneBattle } from './battle-utils';
import {
  createGuardBreakIntent,
  createHeavyStrikeIntent,
  shouldEnemyPrepareGuardBreak,
  shouldEnemyPrepareHeavyStrike,
} from './battle-tactics';
import { resolveEnemyIntentReading } from './enemy-intent-reading';
import {
  finishEnemyAction,
  finishEnemyPreparation,
  preparePartyEnemyTarget,
} from './battle-turn-flow';
import { consumeGuardAgainstDamage, getGuardPoints } from './battle-damage';
import {
  formatBattleActor,
  formatEnemyAttackLine,
  messageWhen,
} from './battle-log-lines';
import {
  performPlayerAttack,
  performPlayerDefend,
  performRuneSkill,
  useBattleConsumable,
} from './battle-player-actions';

interface PlayerActionOptions {
  readonly fleeSucceeded?: boolean;
}

interface EnemyTurnOptions {
  readonly signatureReactionSucceeded?: boolean;
  readonly signatureReactionChancePercent?: number;
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
  options: { shattersGuard?: boolean } = {},
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

    if (nextBattle.turnOwner !== 'ENEMY' || isBattleEncounterOffered(nextBattle)) {
      return nextBattle;
    }

    if (nextBattle.enemy.intent?.code === 'HEAVY_STRIKE') {
      return this.resolveHeavyStrike(nextBattle);
    }

    if (nextBattle.enemy.intent?.code === 'GUARD_BREAK') {
      return this.resolveGuardBreak(nextBattle);
    }

    if (shouldEnemyPrepareGuardBreak(nextBattle.enemy)) {
      return this.prepareEnemySignatureIntent(nextBattle, createGuardBreakIntent(nextBattle.enemy), options);
    }

    if (shouldEnemyPrepareHeavyStrike(nextBattle.enemy)) {
      return this.prepareEnemySignatureIntent(nextBattle, createHeavyStrikeIntent(nextBattle.enemy), options);
    }

    preparePartyEnemyTarget(nextBattle);
    if (nextBattle.status === 'COMPLETED') {
      return nextBattle;
    }

    resolveEnemyAttack(
      nextBattle,
      nextBattle.enemy.attack,
      `👾 ${formatEnemyAttackLine(nextBattle.enemy.name, nextBattle.enemy.attackText, nextBattle.player.name, '{damage}')}`,
    );
    return finishEnemyAction(nextBattle);
  }

  private static prepareEnemySignatureIntent(
    nextBattle: BattleView,
    intent: BattleEnemyIntentSnapshot,
    options: EnemyTurnOptions,
  ): BattleView {
    nextBattle.enemy.intent = intent;
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      formatEnemyIntentPreparationLine(nextBattle),
    );

    if (options.signatureReactionSucceeded === undefined) {
      return finishEnemyPreparation(nextBattle);
    }

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      formatSignatureReactionLine(options.signatureReactionSucceeded, options.signatureReactionChancePercent),
    );

    if (options.signatureReactionSucceeded) {
      return finishEnemyPreparation(nextBattle);
    }

    return this.resolvePreparedEnemyIntent(nextBattle);
  }

  private static resolvePreparedEnemyIntent(nextBattle: BattleView): BattleView {
    if (nextBattle.enemy.intent?.code === 'HEAVY_STRIKE') {
      return this.resolveHeavyStrike(nextBattle);
    }

    if (nextBattle.enemy.intent?.code === 'GUARD_BREAK') {
      return this.resolveGuardBreak(nextBattle);
    }

    return finishEnemyPreparation(nextBattle);
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

  private static resolveHeavyStrike(nextBattle: BattleView): BattleView {
    const intent = nextBattle.enemy.intent;
    if (!intent) {
      return nextBattle;
    }

    nextBattle.enemy.intent = null;
    nextBattle.enemy.hasUsedSignatureMove = true;
    preparePartyEnemyTarget(nextBattle);
    if (nextBattle.status === 'COMPLETED') {
      return nextBattle;
    }

    resolveEnemyAttack(
      nextBattle,
      nextBattle.enemy.attack + intent.bonusAttack,
      `💥 ${formatBattleActor(nextBattle.enemy.name)} проводит «${intent.title}» против ${formatBattleActor(nextBattle.player.name)} и наносит {damage} урона.`,
    );

    return finishEnemyAction(nextBattle);
  }

  private static resolveGuardBreak(nextBattle: BattleView): BattleView {
    const intent = nextBattle.enemy.intent;
    if (!intent) {
      return nextBattle;
    }

    nextBattle.enemy.intent = null;
    nextBattle.enemy.hasUsedSignatureMove = true;
    preparePartyEnemyTarget(nextBattle);
    if (nextBattle.status === 'COMPLETED') {
      return nextBattle;
    }

    resolveEnemyAttack(
      nextBattle,
      nextBattle.enemy.attack + intent.bonusAttack,
      `🧪 ${formatBattleActor(nextBattle.enemy.name)} проводит «${intent.title}» против ${formatBattleActor(nextBattle.player.name)} и наносит {damage} урона.`,
      { shattersGuard: intent.shattersGuard },
    );

    return finishEnemyAction(nextBattle);
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
