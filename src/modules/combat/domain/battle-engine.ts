import { AppError } from '../../../shared/domain/AppError';
import type {
  BattleActionType,
  BattlePartyMemberSnapshot,
  BattlePlayerSnapshot,
  BattleResult,
  BattleRuneActionSnapshot,
  BattleView,
} from '../../../shared/types/game';
import { cloneJsonValue } from '../../../shared/utils/json';
import { isBattleEncounterOffered } from './battle-encounter';
import { appendBattleLog, calculatePhysicalDamage, cloneBattle } from './battle-utils';
import {
  getBattleRuneLoadoutForAction,
  listBattleRuneLoadouts,
  resolveBattleRuneSlotIndexFromAction,
} from './battle-rune-loadouts';
import {
  createGuardBreakIntent,
  createHeavyStrikeIntent,
  resolveDefendGuardGain,
  resolveGaleGuardGain,
  resolveGuardCap,
  resolveIntentDefendGuardBonus,
  resolveManaRegeneration,
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

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

const messageWhen = (condition: boolean, message: string): readonly string[] => (
  condition ? [message] : []
);

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

const isPartyBattle = (battle: BattleView): battle is BattleView & { party: NonNullable<BattleView['party']> } => (
  battle.battleType === 'PARTY_PVE' && battle.party !== undefined && battle.party !== null
);

const clonePlayerSnapshot = (snapshot: BattlePlayerSnapshot): BattlePlayerSnapshot => cloneJsonValue(snapshot);

const findPartyMember = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
  playerId: number,
): BattlePartyMemberSnapshot | null => (
  battle.party.members.find((member) => member.playerId === playerId) ?? null
);

const listLivingPartyMembers = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
): BattlePartyMemberSnapshot[] => (
  battle.party.members.filter((member) => member.snapshot.currentHealth > 0)
);

const syncCurrentPartyMemberSnapshot = (battle: BattleView): void => {
  if (!isPartyBattle(battle)) {
    return;
  }

  const member = findPartyMember(battle, battle.player.playerId);
  if (!member) {
    return;
  }

  member.snapshot = clonePlayerSnapshot(battle.player);
};

const setCurrentPartyMember = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
  member: BattlePartyMemberSnapshot,
): void => {
  battle.party.currentTurnPlayerId = member.playerId;
  battle.player = clonePlayerSnapshot(member.snapshot);
};

const addActedPartyMember = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
  playerId: number,
): void => {
  battle.party.actedPlayerIds = [...new Set([...battle.party.actedPlayerIds, playerId])];
};

const finishPartyPlayerAction = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
): BattleView => {
  syncCurrentPartyMemberSnapshot(battle);

  if (battle.enemy.currentHealth === 0) {
    return finalizeBattle(battle, 'VICTORY');
  }

  addActedPartyMember(battle, battle.player.playerId);

  const nextMember = listLivingPartyMembers(battle)
    .find((member) => !battle.party.actedPlayerIds.includes(member.playerId));

  if (nextMember) {
    setCurrentPartyMember(battle, nextMember);
    battle.turnOwner = 'PLAYER';
    return battle;
  }

  battle.party.currentTurnPlayerId = null;
  battle.turnOwner = 'ENEMY';
  return battle;
};

const selectEnemyPartyTarget = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
): BattlePartyMemberSnapshot | null => {
  const livingMembers = listLivingPartyMembers(battle);
  if (livingMembers.length === 0) {
    return null;
  }

  return livingMembers.find((member) => member.playerId === battle.party.enemyTargetPlayerId)
    ?? livingMembers[0];
};

const preparePartyEnemyTarget = (battle: BattleView): BattleView => {
  if (!isPartyBattle(battle)) {
    return battle;
  }

  const target = selectEnemyPartyTarget(battle);
  if (!target) {
    return finalizeBattle(battle, 'DEFEAT');
  }

  battle.party.enemyTargetPlayerId = target.playerId;
  battle.player = clonePlayerSnapshot(target.snapshot);
  return battle;
};

const getGuardPoints = (player: BattlePlayerSnapshot): number => player.guardPoints ?? 0;

const resolveGuardCapWithBonuses = (battle: BattleView, bonuses: readonly number[] = []): number => (
  resolveGuardCap(battle.player) + sum(bonuses)
);

const addGuardPoints = (player: BattlePlayerSnapshot, guardGain: number, guardCap: number): void => {
  player.guardPoints = Math.min(guardCap, getGuardPoints(player) + guardGain);
};

const tickRuneCooldown = (battle: BattleView): void => {
  for (const { loadout } of listBattleRuneLoadouts(battle.player)) {
    const activeAbility = loadout.activeAbility;
    if (activeAbility && activeAbility.currentCooldown > 0) {
      activeAbility.currentCooldown -= 1;
    }
  }
};

const spendRuneManaAndSetCooldown = (battle: BattleView, ability: BattleRuneActionSnapshot): void => {
  battle.player.currentMana = Math.max(0, battle.player.currentMana - ability.manaCost);
  ability.currentCooldown = ability.cooldownTurns;
};

const regeneratePlayerMana = (battle: BattleView): number => {
  const manaGain = resolveManaRegeneration(battle.player);
  if (manaGain <= 0 || battle.player.currentMana >= battle.player.maxMana) {
    return 0;
  }

  const previousMana = battle.player.currentMana;
  battle.player.currentMana = Math.min(battle.player.maxMana, previousMana + manaGain);

  return battle.player.currentMana - previousMana;
};

const refreshPlayerTurnResources = (battle: BattleView): void => {
  tickRuneCooldown(battle);

  const restoredMana = regeneratePlayerMana(battle);
  if (restoredMana <= 0) {
    return;
  }

  battle.log = appendBattleLog(
    battle.log,
    `💙 Рунный фокус: +${restoredMana} маны.`,
  );
};

const beginPartyPlayerRound = (
  battle: BattleView & { party: NonNullable<BattleView['party']> },
): BattleView => {
  const nextMember = listLivingPartyMembers(battle)[0];
  if (!nextMember) {
    return finalizeBattle(battle, 'DEFEAT');
  }

  battle.party.actedPlayerIds = [];
  setCurrentPartyMember(battle, nextMember);
  refreshPlayerTurnResources(battle);
  syncCurrentPartyMemberSnapshot(battle);
  battle.turnOwner = 'PLAYER';

  return battle;
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
    ...(shatteredGuard > 0 ? [`💥 Враг разбивает вашу защиту на ${shatteredGuard}.`] : []),
    ...(blockedDamage > 0 ? [`🛡️ Защита смягчает удар на ${blockedDamage} урона.`] : []),
    dealtDamage > 0
      ? attackText.replace('{damage}', `${dealtDamage}`)
      : '🛡️ Враг бьёт, но защита принимает весь удар на себя.',
  );

  battle.player.currentHealth = Math.max(0, battle.player.currentHealth - dealtDamage);
};

const applyDamageToEnemy = (battle: BattleView, damage: number): void => {
  battle.enemy.currentHealth = Math.max(0, battle.enemy.currentHealth - damage);
};

const finishPlayerAction = (battle: BattleView): BattleView => {
  if (isPartyBattle(battle)) {
    return finishPartyPlayerAction(battle);
  }

  if (battle.enemy.currentHealth === 0) {
    return finalizeBattle(battle, 'VICTORY');
  }

  battle.turnOwner = 'ENEMY';
  return battle;
};

const finishEnemyAction = (battle: BattleView): BattleView => {
  if (isPartyBattle(battle)) {
    syncCurrentPartyMemberSnapshot(battle);

    if (listLivingPartyMembers(battle).length === 0) {
      return finalizeBattle(battle, 'DEFEAT');
    }

    return beginPartyPlayerRound(battle);
  }

  if (battle.player.currentHealth === 0) {
    return finalizeBattle(battle, 'DEFEAT');
  }

  refreshPlayerTurnResources(battle);
  battle.turnOwner = 'PLAYER';
  return battle;
};

const finishEnemyPreparation = (battle: BattleView): BattleView => {
  if (isPartyBattle(battle)) {
    return beginPartyPlayerRound(battle);
  }

  refreshPlayerTurnResources(battle);
  battle.turnOwner = 'PLAYER';
  return battle;
};

const resolveDefendOutcome = (battle: BattleView): DefendOutcome => {
  const stoneMasteryGuardGainBonus = resolveStoneMasteryGuardGainBonus(battle);
  const stoneHoldIntentGuardBonus = resolveStoneHoldIntentGuardBonus(battle);
  const stoneSealGuardBonus = resolveStoneSealGuardBonus(battle);
  const intentGuardBonus = resolveIntentDefendGuardBonus(battle.enemy.intent);

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
    revealedIntentTitle: battle.enemy.intent?.title ?? null,
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
      `🛡️ Вы занимаете защитную стойку и готовите защиту на ${outcome.guardGain} урона.`,
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

  public static resolveEnemyTurn(battle: BattleView): BattleView {
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
      nextBattle.enemy.intent = createGuardBreakIntent(nextBattle.enemy);
      nextBattle.log = appendBattleLog(
        nextBattle.log,
        `⚠️ ${nextBattle.enemy.name} готовит «${nextBattle.enemy.intent.title}». Защита на следующий ход сработает хуже обычного.`,
      );
      return finishEnemyPreparation(nextBattle);
    }

    if (shouldEnemyPrepareHeavyStrike(nextBattle.enemy)) {
      nextBattle.enemy.intent = createHeavyStrikeIntent(nextBattle.enemy);
      nextBattle.log = appendBattleLog(
        nextBattle.log,
        `⚠️ ${nextBattle.enemy.name} готовит «${nextBattle.enemy.intent.title}». Следующий удар будет сильнее обычного.`,
      );
      return finishEnemyPreparation(nextBattle);
    }

    preparePartyEnemyTarget(nextBattle);
    if (nextBattle.status === 'COMPLETED') {
      return nextBattle;
    }

    resolveEnemyAttack(nextBattle, nextBattle.enemy.attack, `👾 ${nextBattle.enemy.name} ${nextBattle.enemy.attackText} и наносит {damage} урона.`);
    return finishEnemyAction(nextBattle);
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
      `⚔️ Вы наносите ${outcome.totalDamage} урона врагу ${nextBattle.enemy.name}.`,
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
    nextBattle.encounter = {
      ...nextBattle.encounter!,
      status: 'ENGAGED',
    };
    nextBattle.turnOwner = initialTurnOwner;
    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `⚔️ Вы принимаете встречу с ${nextBattle.enemy.name}: бой начинается.`,
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
        `💨 Вы отступаете от ${nextBattle.enemy.name}: бой не начинается.`,
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
      `💨 Вы пытаетесь отступить, но ${nextBattle.enemy.name} перехватывает путь.`,
    );

    return nextBattle;
  }

  private static performEmberPulse(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const spellPower = nextBattle.player.attack + nextBattle.player.intelligence + 1;
    const intentDamageBonus = resolveRuneIntentDamageBonus(nextBattle.enemy.intent);
    const damage = calculatePhysicalDamage(spellPower, nextBattle.enemy.magicDefence) + intentDamageBonus;
    applyDamageToEnemy(nextBattle, damage);
    spendRuneManaAndSetCooldown(nextBattle, activeAbility);

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🌀 ${activeAbility.name} прожигает ${nextBattle.enemy.name} на ${damage} урона.`,
      ...messageWhen(intentDamageBonus > 0, '🔮 Руна бьёт точнее по раскрытому замыслу врага.'),
      `💙 Мана: ${nextBattle.player.currentMana}/${nextBattle.player.maxMana}.`,
    );

    return finishPlayerAction(nextBattle);
  }

  private static performStoneBastion(nextBattle: BattleView, activeAbility: BattleRuneActionSnapshot): BattleView {
    const synergyDamageBonus = resolveStoneSynergyDamageBonus(nextBattle);
    const synergyGuardBonus = resolveStoneSynergyGuardBonus(nextBattle);
    const sealGuardBonus = resolveStoneSealGuardBonus(nextBattle);
    const intentDamageBonus = resolveRuneIntentDamageBonus(nextBattle.enemy.intent);
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
      `🌀 ${activeAbility.name} наносит ${damage} урона и поднимает каменную защиту на ${guardGain}.`,
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
    const intentDamageBonus = resolveRuneIntentDamageBonus(nextBattle.enemy.intent);
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
      `🌀 ${activeAbility.name} наносит ${damage} урона и готовит защиту на ${guardGain} урона.`,
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
      `💥 ${nextBattle.enemy.name} проводит «${intent.title}» и наносит {damage} урона.`,
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
      `🧪 ${nextBattle.enemy.name} проводит «${intent.title}» и наносит {damage} урона.`,
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
