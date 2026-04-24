import { AppError } from '../../../shared/domain/AppError';
import type { AlchemyConsumableDefinition } from '../../consumables/domain/alchemy-consumables';
import type {
  BattleActionType,
  BattleEnemyIntentSnapshot,
  BattlePlayerSnapshot,
  BattleRuneActionSnapshot,
  BattleView,
} from '../../../shared/types/game';
import { isBattleEncounterOffered } from './battle-encounter';
import { appendBattleLog, calculatePhysicalDamage, cloneBattle } from './battle-utils';
import {
  getBattleRuneLoadoutForAction,
  resolveBattleRuneSlotIndexFromAction,
} from './battle-rune-loadouts';
import {
  createGuardBreakIntent,
  createHeavyStrikeIntent,
  resolveDefendGuardGain,
  resolveGaleGuardGain,
  resolveGuardCap,
  resolveIntentDefendGuardBonus,
  resolveRuneIntentDamageBonus,
  shouldEnemyPrepareGuardBreak,
  shouldEnemyPrepareHeavyStrike,
} from './battle-tactics';
import {
  resolveEchoMasteryAttackBonus,
  resolveEchoIntentAttackBonus,
  resolveEchoSealIntentBonus,
  resolveEmberAttackBonus,
  resolveEmberComboBonus,
  resolveEmberExecutionBonus,
  resolveEmberPressureIntentBonus,
  resolveEmberSealPressureBonus,
  resolveGaleMasteryAttackGuardGain,
  resolveGaleSealTempoGuardBonus,
  resolveGaleTempoIntentGuardBonus,
  resolveStoneGuardCapBonus,
  resolveStoneGuardGainBonus,
  resolveStoneHoldIntentGuardBonus,
  resolveStoneSealGuardBonus,
  resolveStoneSynergyDamageBonus,
  resolveStoneSynergyGuardBonus,
  resolveStoneMasteryGuardGainBonus,
} from './battle-rune-passives';
import {
  getExactlyReadEnemyIntent,
  getReadableEnemyIntent,
  resolveEnemyIntentReading,
} from './enemy-intent-reading';
import {
  finishEnemyAction,
  finishEnemyPreparation,
  finishPlayerAction,
  preparePartyEnemyTarget,
  syncCurrentPartyMemberSnapshot,
} from './battle-turn-flow';

interface GuardDamageResult {
  readonly blockedDamage: number;
  readonly dealtDamage: number;
}

interface DefendOutcome {
  readonly guardGain: number;
  readonly guardCap: number;
  readonly intentGuardBonus: number;
  readonly stoneHoldIntentGuardBonus: number;
  readonly stoneSealGuardBonus: number;
  readonly stoneMasteryGuardGainBonus: number;
}

interface BasicAttackOutcome {
  readonly totalDamage: number;
  readonly emberBonus: number;
  readonly emberPressureIntentBonus: number;
  readonly emberSealPressureBonus: number;
  readonly emberExecutionBonus: number;
  readonly emberComboBonus: number;
  readonly echoBonus: number;
  readonly echoMasteryBonus: number;
  readonly echoSealBonus: number;
  readonly galeGuardGain: number;
  readonly revealedIntentTitle: string | null;
}

interface PlayerActionOptions {
  readonly fleeSucceeded?: boolean;
}

interface EnemyTurnOptions {
  readonly signatureReactionSucceeded?: boolean;
  readonly signatureReactionChancePercent?: number;
}

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

const messageWhen = (condition: boolean, message: string): readonly string[] => (
  condition ? [message] : []
);

const formatBattleActor = (name: string): string => `[${name}]`;

const formatDamageLine = (
  actorName: string,
  targetName: string,
  damage: number | string,
): string => `${formatBattleActor(actorName)} наносит ${damage} урона ${formatBattleActor(targetName)}.`;

const formatEnemyAttackLine = (
  enemyName: string,
  attackText: string,
  targetName: string,
  damage: number | string,
): string => `${formatBattleActor(enemyName)} ${attackText} ${formatBattleActor(targetName)} и наносит ${damage} урона.`;

const formatSkillLine = (
  actorName: string,
  skillName: string,
  targetName: string,
  outcome: string,
): string => `${formatBattleActor(actorName)} применяет «${skillName}» против ${formatBattleActor(targetName)}: ${outcome}.`;

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

const getGuardPoints = (player: BattlePlayerSnapshot): number => player.guardPoints ?? 0;

const resolveGuardCapWithBonuses = (battle: BattleView, bonuses: readonly number[] = []): number => (
  resolveGuardCap(battle.player) + sum(bonuses)
);

const addGuardPoints = (player: BattlePlayerSnapshot, guardGain: number, guardCap: number): void => {
  player.guardPoints = Math.min(guardCap, getGuardPoints(player) + guardGain);
};

const applyPlayerRecovery = (
  player: BattlePlayerSnapshot,
  consumable: AlchemyConsumableDefinition,
): { readonly healthGain: number; readonly manaGain: number; readonly guardGain: number } => {
  const previousHealth = player.currentHealth;
  const previousMana = player.currentMana;
  const previousGuard = getGuardPoints(player);
  const guardGain = Math.max(0, consumable.effect.guard);

  player.currentHealth = Math.min(player.maxHealth, player.currentHealth + Math.max(0, consumable.effect.health));
  player.currentMana = Math.min(player.maxMana, player.currentMana + Math.max(0, consumable.effect.mana));

  if (guardGain > 0) {
    addGuardPoints(player, guardGain, resolveGuardCap(player));
  }

  return {
    healthGain: player.currentHealth - previousHealth,
    manaGain: player.currentMana - previousMana,
    guardGain: getGuardPoints(player) - previousGuard,
  };
};

const spendRuneManaAndSetCooldown = (battle: BattleView, ability: BattleRuneActionSnapshot): void => {
  battle.player.currentMana = Math.max(0, battle.player.currentMana - ability.manaCost);
  ability.currentCooldown = ability.cooldownTurns;
};

const consumeGuardAgainstDamage = (
  player: BattlePlayerSnapshot,
  rawDamage: number,
): GuardDamageResult => {
  const guardPoints = getGuardPoints(player);
  const blockedDamage = Math.min(guardPoints, rawDamage);
  const dealtDamage = rawDamage - blockedDamage;

  player.guardPoints = Math.max(0, guardPoints - blockedDamage);

  return {
    blockedDamage,
    dealtDamage,
  };
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

const applyDamageToEnemy = (battle: BattleView, damage: number): void => {
  battle.enemy.currentHealth = Math.max(0, battle.enemy.currentHealth - damage);
};

const resolveDefendOutcome = (battle: BattleView): DefendOutcome => {
  const stoneMasteryGuardGainBonus = resolveStoneMasteryGuardGainBonus(battle);
  const stoneHoldIntentGuardBonus = resolveStoneHoldIntentGuardBonus(battle);
  const stoneSealGuardBonus = resolveStoneSealGuardBonus(battle);
  const intentGuardBonus = resolveIntentDefendGuardBonus(getReadableEnemyIntent(battle));

  return {
    guardGain: sum([
      resolveDefendGuardGain(battle.player),
      intentGuardBonus,
      resolveStoneGuardGainBonus(battle),
      stoneHoldIntentGuardBonus,
      stoneSealGuardBonus,
      stoneMasteryGuardGainBonus,
    ]),
    guardCap: resolveGuardCapWithBonuses(battle, [
      resolveStoneGuardCapBonus(battle),
    ]),
    intentGuardBonus,
    stoneHoldIntentGuardBonus,
    stoneSealGuardBonus,
    stoneMasteryGuardGainBonus,
  };
};

const resolveBasicAttackOutcome = (battle: BattleView): BasicAttackOutcome => {
  const baseDamage = calculatePhysicalDamage(battle.player.attack, battle.enemy.defence);
  const emberBonus = resolveEmberAttackBonus(battle);
  const emberPressureIntentBonus = resolveEmberPressureIntentBonus(battle);
  const emberSealPressureBonus = resolveEmberSealPressureBonus(battle);
  const emberExecutionBonus = resolveEmberExecutionBonus(battle);
  const emberComboBonus = resolveEmberComboBonus(battle);
  const echoBonus = resolveEchoIntentAttackBonus(battle);
  const echoMasteryBonus = resolveEchoMasteryAttackBonus(battle);
  const echoSealBonus = resolveEchoSealIntentBonus(battle);
  const galeGuardGain = resolveGaleMasteryAttackGuardGain(battle);

  return {
    totalDamage: sum([
      baseDamage,
      emberBonus,
      emberPressureIntentBonus,
      emberSealPressureBonus,
      emberExecutionBonus,
      emberComboBonus,
      echoBonus,
      echoMasteryBonus,
      echoSealBonus,
    ]),
    emberBonus,
    emberPressureIntentBonus,
    emberSealPressureBonus,
    emberExecutionBonus,
    emberComboBonus,
    echoBonus,
    echoMasteryBonus,
    echoSealBonus,
    galeGuardGain,
    revealedIntentTitle: getExactlyReadEnemyIntent(battle)?.title ?? null,
  };
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
    return this.performAttack(nextBattle);
  }

  public static defend(battle: BattleView): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    const outcome = resolveDefendOutcome(nextBattle);
    addGuardPoints(nextBattle.player, outcome.guardGain, outcome.guardCap);
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🛡️ ${formatBattleActor(nextBattle.player.name)} готовит защиту на ${outcome.guardGain} урона.`,
      ...messageWhen(outcome.intentGuardBonus > 0, '🛡️ Раскрытый тяжёлый удар даёт время встать плотнее обычного.'),
      ...messageWhen(outcome.stoneHoldIntentGuardBonus > 0, '🪨 Твердь держит раскрытую угрозу: стойка становится ещё крепче.'),
      ...messageWhen(outcome.stoneSealGuardBonus > 0, '🪨 Печать Тверди добавляет опору к защитной стойке.'),
      ...messageWhen(outcome.stoneMasteryGuardGainBonus > 0, '🪨 Мастерство Тверди усиливает защитную стойку.'),
    );
    return finishPlayerAction(nextBattle);
  }

  public static useRuneSkill(battle: BattleView, action: BattleActionType = 'RUNE_SKILL_SLOT_1'): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    const runeLoadout = getBattleRuneLoadoutForAction(nextBattle, action);
    const activeAbility = runeLoadout?.activeAbility ?? null;
    if (!activeAbility) {
      const slotNumber = resolveBattleRuneSlotIndexFromAction(action) + 1;
      throw new AppError('rune_skill_not_available', `В слоте ${slotNumber} сейчас нет активного боевого действия.`);
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
      case 'stone_bastion':
        return this.performStoneBastion(nextBattle, activeAbility);
      case 'gale_step':
        return this.performGaleStep(nextBattle, activeAbility);
      default:
        throw new AppError('rune_skill_not_available', `Навык «${activeAbility.name}» ещё не поддерживается в бою.`);
    }
  }

  public static useConsumable(battle: BattleView, consumable: AlchemyConsumableDefinition): BattleView {
    const nextBattle = cloneBattle(battle);
    this.assertPlayerTurn(nextBattle);

    const recovery = applyPlayerRecovery(nextBattle.player, consumable);
    if (recovery.healthGain === 0 && recovery.manaGain === 0 && recovery.guardGain === 0) {
      throw new AppError('consumable_not_needed', `Сейчас «${consumable.title}» ничего не восстановит.`);
    }

    syncCurrentPartyMemberSnapshot(nextBattle);
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🧪 ${formatBattleActor(nextBattle.player.name)} применяет «${consumable.title}»: +${recovery.healthGain} HP, +${recovery.manaGain} маны${recovery.guardGain > 0 ? `, +${recovery.guardGain} щита` : ''}.`,
    );

    return nextBattle;
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

  private static performAttack(nextBattle: BattleView): BattleView {
    const outcome = resolveBasicAttackOutcome(nextBattle);

    if (outcome.galeGuardGain > 0) {
      addGuardPoints(
        nextBattle.player,
        outcome.galeGuardGain,
        resolveGuardCapWithBonuses(nextBattle, [resolveStoneGuardCapBonus(nextBattle)]),
      );
    }

    applyDamageToEnemy(nextBattle, outcome.totalDamage);
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `⚔️ ${formatDamageLine(nextBattle.player.name, nextBattle.enemy.name, outcome.totalDamage)}`,
      ...messageWhen(outcome.emberBonus > 0, `🔥 Школа Пламени усиливает атаку ещё на ${outcome.emberBonus}.`),
      ...messageWhen(outcome.emberPressureIntentBonus > 0, '🔥 Пламя давит пробивающий замах до того, как враг успевает сломать стойку.'),
      ...messageWhen(outcome.emberSealPressureBonus > 0, '🔥 Печать Пламени держит давление даже без нового разгона.'),
      ...messageWhen(outcome.emberExecutionBonus > 0, `🔥 Мастерство Пламени помогает дожать врага ещё на ${outcome.emberExecutionBonus}.`),
      ...messageWhen(outcome.emberComboBonus > 0, '🔥 Разогрев Пламени превращает откат рунной техники в окно для ещё более сильного добивания.'),
      ...messageWhen(
        outcome.echoBonus > 0,
        `🧠 Школа Прорицания читает «${outcome.revealedIntentTitle ?? 'замысел'}» и добавляет ${outcome.echoBonus} магического урона.`,
      ),
      ...messageWhen(outcome.echoMasteryBonus > 0, `🧠 Мастерство Прорицания добавляет ещё ${outcome.echoMasteryBonus} урона по раскрытой угрозе.`),
      ...messageWhen(outcome.echoSealBonus > 0, '🧠 Печать Прорицания закрепляет чтение боя и усиливает точный ответ.'),
      ...messageWhen(outcome.galeGuardGain > 0, `🌪️ Мастерство Бури готовит защиту ещё на ${outcome.galeGuardGain} урона.`),
    );

    return finishPlayerAction(nextBattle);
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

  private static performEmberPulse(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const spellPower = nextBattle.player.attack + nextBattle.player.intelligence + 1;
    const intentDamageBonus = resolveRuneIntentDamageBonus(getReadableEnemyIntent(nextBattle));
    const damage = calculatePhysicalDamage(spellPower, nextBattle.enemy.magicDefence) + intentDamageBonus;
    applyDamageToEnemy(nextBattle, damage);
    spendRuneManaAndSetCooldown(nextBattle, activeAbility);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🌀 ${formatSkillLine(nextBattle.player.name, activeAbility.name, nextBattle.enemy.name, `${damage} урона`)}`,
      ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
      `💙 Мана: ${nextBattle.player.currentMana}/${nextBattle.player.maxMana}.`,
    );

    return finishPlayerAction(nextBattle);
  }

  private static performStoneBastion(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const synergyDamageBonus = resolveStoneSynergyDamageBonus(nextBattle);
    const synergyGuardBonus = resolveStoneSynergyGuardBonus(nextBattle);
    const sealGuardBonus = resolveStoneSealGuardBonus(nextBattle);
    const intentDamageBonus = resolveRuneIntentDamageBonus(getReadableEnemyIntent(nextBattle));
    const damage = calculatePhysicalDamage(
      Math.max(1, Math.floor(nextBattle.player.attack * 0.6) + Math.floor(nextBattle.player.defence / 2)),
      nextBattle.enemy.defence,
    ) + synergyDamageBonus + intentDamageBonus;
    const intentBonus = nextBattle.enemy.intent?.code === 'HEAVY_STRIKE' ? 2 : 0;
    const guardGain = sum([
      resolveDefendGuardGain(nextBattle.player),
      resolveStoneGuardGainBonus(nextBattle),
      1,
      intentBonus,
      synergyGuardBonus,
      sealGuardBonus,
    ]);
    const guardCap = resolveGuardCapWithBonuses(nextBattle, [
      resolveStoneGuardCapBonus(nextBattle),
    ]);

    applyDamageToEnemy(nextBattle, damage);
    addGuardPoints(nextBattle.player, guardGain, guardCap);
    spendRuneManaAndSetCooldown(nextBattle, activeAbility);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🌀 ${formatSkillLine(nextBattle.player.name, activeAbility.name, nextBattle.enemy.name, `${damage} урона и ${guardGain} защиты`)}`,
      ...(intentBonus > 0 ? ['🪨 Школа Тверди укрепляется ещё сильнее против заранее раскрытой угрозы.'] : []),
      ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
      ...(synergyDamageBonus > 0 ? ['🪨 Ответ стойки превращает накопленную защиту в более жёсткий контрудар.'] : []),
      ...messageWhen(sealGuardBonus > 0, '🪨 Печать Тверди добавляет отпору устойчивую опору.'),
      `💙 Мана: ${nextBattle.player.currentMana}/${nextBattle.player.maxMana}.`,
    );

    return finishPlayerAction(nextBattle);
  }

  private static performGaleStep(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const strikePower = Math.max(1, Math.floor(nextBattle.player.attack * 0.75) + Math.floor(nextBattle.player.dexterity / 2));
    const intentDamageBonus = resolveRuneIntentDamageBonus(getReadableEnemyIntent(nextBattle));
    const damage = calculatePhysicalDamage(strikePower, nextBattle.enemy.defence) + intentDamageBonus;
    const tempoGuardBonus = resolveGaleTempoIntentGuardBonus(nextBattle);
    const sealTempoGuardBonus = resolveGaleSealTempoGuardBonus(nextBattle);
    const guardGain = resolveGaleGuardGain(nextBattle.player) + tempoGuardBonus + sealTempoGuardBonus;
    const guardCap = resolveGuardCap(nextBattle.player);

    applyDamageToEnemy(nextBattle, damage);
    addGuardPoints(nextBattle.player, guardGain, guardCap);
    spendRuneManaAndSetCooldown(nextBattle, activeAbility);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🌀 ${formatSkillLine(nextBattle.player.name, activeAbility.name, nextBattle.enemy.name, `${damage} урона и ${guardGain} защиты`)}`,
      ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
      ...messageWhen(tempoGuardBonus > 0, '🌪️ Буря забирает темп по раскрытому замыслу: следующий ответ прикрыт лучше.'),
      ...messageWhen(sealTempoGuardBonus > 0, '🌪️ Печать Бури удерживает темп после рывка.'),
      `💙 Мана: ${nextBattle.player.currentMana}/${nextBattle.player.maxMana}.`,
    );

    return finishPlayerAction(nextBattle);
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
