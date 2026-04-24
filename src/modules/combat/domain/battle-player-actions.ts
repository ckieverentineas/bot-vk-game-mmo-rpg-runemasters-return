import { AppError } from '../../../shared/domain/AppError';
import type { AlchemyConsumableDefinition } from '../../consumables/domain/alchemy-consumables';
import type {
  BattleActionType,
  BattleRuneActionSnapshot,
  BattleView,
} from '../../../shared/types/game';
import {
  getBattleRuneLoadoutForAction,
  resolveBattleRuneSlotIndexFromAction,
} from './battle-rune-loadouts';
import {
  resolveDefendGuardGain,
  resolveGaleGuardGain,
  resolveGuardCap,
  resolveIntentDefendGuardBonus,
  resolveRuneIntentDamageBonus,
} from './battle-tactics';
import {
  resolveEchoIntentAttackBonus,
  resolveEchoMasteryAttackBonus,
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
  resolveStoneMasteryGuardGainBonus,
  resolveStoneSealGuardBonus,
  resolveStoneSynergyDamageBonus,
  resolveStoneSynergyGuardBonus,
} from './battle-rune-passives';
import { calculatePhysicalDamage, appendBattleLog } from './battle-utils';
import {
  addGuardPoints,
  applyDamageToEnemy,
  getGuardPoints,
} from './battle-damage';
import {
  formatBattleActor,
  formatDamageLine,
  formatSkillLine,
  messageWhen,
  sum,
} from './battle-log-lines';
import { finishPlayerAction, syncCurrentPartyMemberSnapshot } from './battle-turn-flow';
import { getExactlyReadEnemyIntent, getReadableEnemyIntent } from './enemy-intent-reading';

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

const resolveGuardCapWithBonuses = (battle: BattleView, bonuses: readonly number[] = []): number => (
  resolveGuardCap(battle.player) + sum(bonuses)
);

const applyPlayerRecovery = (
  battle: BattleView,
  consumable: AlchemyConsumableDefinition,
): { readonly healthGain: number; readonly manaGain: number; readonly guardGain: number } => {
  const previousHealth = battle.player.currentHealth;
  const previousMana = battle.player.currentMana;
  const previousGuard = getGuardPoints(battle.player);
  const guardGain = Math.max(0, consumable.effect.guard);

  battle.player.currentHealth = Math.min(
    battle.player.maxHealth,
    battle.player.currentHealth + Math.max(0, consumable.effect.health),
  );
  battle.player.currentMana = Math.min(
    battle.player.maxMana,
    battle.player.currentMana + Math.max(0, consumable.effect.mana),
  );

  if (guardGain > 0) {
    addGuardPoints(battle.player, guardGain, resolveGuardCap(battle.player));
  }

  return {
    healthGain: battle.player.currentHealth - previousHealth,
    manaGain: battle.player.currentMana - previousMana,
    guardGain: getGuardPoints(battle.player) - previousGuard,
  };
};

const spendRuneManaAndSetCooldown = (battle: BattleView, ability: BattleRuneActionSnapshot): void => {
  battle.player.currentMana = Math.max(0, battle.player.currentMana - ability.manaCost);
  ability.currentCooldown = ability.cooldownTurns;
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

export const performPlayerAttack = (battle: BattleView): BattleView => {
  const outcome = resolveBasicAttackOutcome(battle);

  if (outcome.galeGuardGain > 0) {
    addGuardPoints(
      battle.player,
      outcome.galeGuardGain,
      resolveGuardCapWithBonuses(battle, [resolveStoneGuardCapBonus(battle)]),
    );
  }

  applyDamageToEnemy(battle, outcome.totalDamage);
  battle.log = appendBattleLog(
    battle.log,
    `⚔️ ${formatDamageLine(battle.player.name, battle.enemy.name, outcome.totalDamage)}`,
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

  return finishPlayerAction(battle);
};

export const performPlayerDefend = (battle: BattleView): BattleView => {
  const outcome = resolveDefendOutcome(battle);
  addGuardPoints(battle.player, outcome.guardGain, outcome.guardCap);
  battle.log = appendBattleLog(
    battle.log,
    `🛡️ ${formatBattleActor(battle.player.name)} готовит защиту на ${outcome.guardGain} урона.`,
    ...messageWhen(outcome.intentGuardBonus > 0, '🛡️ Раскрытый тяжёлый удар даёт время встать плотнее обычного.'),
    ...messageWhen(outcome.stoneHoldIntentGuardBonus > 0, '🛡️ Твердь держит раскрытую угрозу: стойка становится ещё крепче.'),
    ...messageWhen(outcome.stoneSealGuardBonus > 0, '🛡️ Печать Тверди добавляет опору к защитной стойке.'),
    ...messageWhen(outcome.stoneMasteryGuardGainBonus > 0, '🛡️ Мастерство Тверди усиливает защитную стойку.'),
  );

  return finishPlayerAction(battle);
};

export const performRuneSkill = (
  battle: BattleView,
  action: BattleActionType = 'RUNE_SKILL_SLOT_1',
): BattleView => {
  const runeLoadout = getBattleRuneLoadoutForAction(battle, action);
  const activeAbility = runeLoadout?.activeAbility ?? null;
  if (!activeAbility) {
    const slotNumber = resolveBattleRuneSlotIndexFromAction(action) + 1;
    throw new AppError('rune_skill_not_available', `В слоте ${slotNumber} сейчас нет активного боевого действия.`);
  }

  if (activeAbility.currentCooldown > 0) {
    throw new AppError('ability_on_cooldown', `Навык «${activeAbility.name}» будет готов через ${activeAbility.currentCooldown} ход.`);
  }

  if (battle.player.currentMana < activeAbility.manaCost) {
    throw new AppError('not_enough_mana', `Для навыка «${activeAbility.name}» нужно ${activeAbility.manaCost} маны.`);
  }

  switch (activeAbility.code) {
    case 'ember_pulse':
      return performEmberPulse(battle, activeAbility);
    case 'stone_bastion':
      return performStoneBastion(battle, activeAbility);
    case 'gale_step':
      return performGaleStep(battle, activeAbility);
    default:
      throw new AppError('rune_skill_not_available', `Навык «${activeAbility.name}» ещё не поддерживается в бою.`);
  }
};

export const useBattleConsumable = (
  battle: BattleView,
  consumable: AlchemyConsumableDefinition,
): BattleView => {
  const recovery = applyPlayerRecovery(battle, consumable);
  if (recovery.healthGain === 0 && recovery.manaGain === 0 && recovery.guardGain === 0) {
    throw new AppError('consumable_not_needed', `Сейчас «${consumable.title}» ничего не восстановит.`);
  }

  syncCurrentPartyMemberSnapshot(battle);
  battle.log = appendBattleLog(
    battle.log,
    `🧪 ${formatBattleActor(battle.player.name)} применяет «${consumable.title}»: +${recovery.healthGain} HP, +${recovery.manaGain} маны${recovery.guardGain > 0 ? `, +${recovery.guardGain} щита` : ''}.`,
  );

  return battle;
};

const performEmberPulse = (battle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView => {
  const spellPower = battle.player.attack + battle.player.intelligence + 1;
  const intentDamageBonus = resolveRuneIntentDamageBonus(getReadableEnemyIntent(battle));
  const damage = calculatePhysicalDamage(spellPower, battle.enemy.magicDefence) + intentDamageBonus;
  applyDamageToEnemy(battle, damage);
  spendRuneManaAndSetCooldown(battle, activeAbility);

  battle.log = appendBattleLog(
    battle.log,
    `🌀 ${formatSkillLine(battle.player.name, activeAbility.name, battle.enemy.name, `${damage} урона`)}`,
    ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
    `💙 Мана: ${battle.player.currentMana}/${battle.player.maxMana}.`,
  );

  return finishPlayerAction(battle);
};

const performStoneBastion = (battle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView => {
  const synergyDamageBonus = resolveStoneSynergyDamageBonus(battle);
  const synergyGuardBonus = resolveStoneSynergyGuardBonus(battle);
  const sealGuardBonus = resolveStoneSealGuardBonus(battle);
  const intentDamageBonus = resolveRuneIntentDamageBonus(getReadableEnemyIntent(battle));
  const damage = calculatePhysicalDamage(
    Math.max(1, Math.floor(battle.player.attack * 0.6) + Math.floor(battle.player.defence / 2)),
    battle.enemy.defence,
  ) + synergyDamageBonus + intentDamageBonus;
  const intentBonus = battle.enemy.intent?.code === 'HEAVY_STRIKE' ? 2 : 0;
  const guardGain = sum([
    resolveDefendGuardGain(battle.player),
    resolveStoneGuardGainBonus(battle),
    1,
    intentBonus,
    synergyGuardBonus,
    sealGuardBonus,
  ]);
  const guardCap = resolveGuardCapWithBonuses(battle, [
    resolveStoneGuardCapBonus(battle),
  ]);

  applyDamageToEnemy(battle, damage);
  addGuardPoints(battle.player, guardGain, guardCap);
  spendRuneManaAndSetCooldown(battle, activeAbility);

  battle.log = appendBattleLog(
    battle.log,
    `🌀 ${formatSkillLine(battle.player.name, activeAbility.name, battle.enemy.name, `${damage} урона и ${guardGain} защиты`)}`,
    ...(intentBonus > 0 ? ['🛡️ Школа Тверди укрепляется ещё сильнее против заранее раскрытой угрозы.'] : []),
    ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
    ...(synergyDamageBonus > 0 ? ['🛡️ Ответ стойки превращает накопленную защиту в более жёсткий контрудар.'] : []),
    ...messageWhen(sealGuardBonus > 0, '🛡️ Печать Тверди добавляет отпору устойчивую опору.'),
    `💙 Мана: ${battle.player.currentMana}/${battle.player.maxMana}.`,
  );

  return finishPlayerAction(battle);
};

const performGaleStep = (battle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView => {
  const strikePower = Math.max(1, Math.floor(battle.player.attack * 0.75) + Math.floor(battle.player.dexterity / 2));
  const intentDamageBonus = resolveRuneIntentDamageBonus(getReadableEnemyIntent(battle));
  const damage = calculatePhysicalDamage(strikePower, battle.enemy.defence) + intentDamageBonus;
  const tempoGuardBonus = resolveGaleTempoIntentGuardBonus(battle);
  const sealTempoGuardBonus = resolveGaleSealTempoGuardBonus(battle);
  const guardGain = resolveGaleGuardGain(battle.player) + tempoGuardBonus + sealTempoGuardBonus;
  const guardCap = resolveGuardCap(battle.player);

  applyDamageToEnemy(battle, damage);
  addGuardPoints(battle.player, guardGain, guardCap);
  spendRuneManaAndSetCooldown(battle, activeAbility);

  battle.log = appendBattleLog(
    battle.log,
    `🌀 ${formatSkillLine(battle.player.name, activeAbility.name, battle.enemy.name, `${damage} урона и ${guardGain} защиты`)}`,
    ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
    ...messageWhen(tempoGuardBonus > 0, '🌪️ Буря забирает темп по раскрытому замыслу: следующий ответ прикрыт лучше.'),
    ...messageWhen(sealTempoGuardBonus > 0, '🌪️ Печать Бури удерживает темп после рывка.'),
    `💙 Мана: ${battle.player.currentMana}/${battle.player.maxMana}.`,
  );

  return finishPlayerAction(battle);
};
