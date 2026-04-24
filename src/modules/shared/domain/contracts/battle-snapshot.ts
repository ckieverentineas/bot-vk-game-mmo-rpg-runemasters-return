import type {
  BattleEnemyIntentCode,
  BattleEnemyThreatRank,
  BattleEnemyRoamingDirection,
  BattleEncounterKind,
  BattleEnemySnapshot,
  BattleEncounterView,
  BattlePartySnapshot,
  BattlePlayerSnapshot,
  BattleResult,
  BattleRewardView,
  BattleRuneLoadoutSnapshot,
  BattleView,
  InventoryLoot,
  MaterialField,
  RuneDraft,
  RuneRarity,
} from '../../../../shared/types/game';

import { hasSchemaVersion, isJsonRecord } from './versioned-contract';

export const BATTLE_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface BattleSnapshotV1 {
  readonly schemaVersion: typeof BATTLE_SNAPSHOT_SCHEMA_VERSION;
  readonly actionRevision: number;
  readonly player: BattlePlayerSnapshot;
  readonly enemy: BattleEnemySnapshot;
  readonly party?: BattlePartySnapshot | null;
  readonly encounter?: BattleEncounterView | null;
  readonly log: string[];
  readonly result: BattleResult | null;
  readonly rewards: BattleRewardView | null;
}

export type BattleSnapshot = BattleSnapshotV1;

const battleEnemyIntentCodes: readonly BattleEnemyIntentCode[] = ['HEAVY_STRIKE', 'GUARD_BREAK'];
const battleEnemyThreatRanks: readonly BattleEnemyThreatRank[] = ['SURVIVOR', 'NAMED', 'CALAMITY'];
const battleEnemyRoamingDirections: readonly BattleEnemyRoamingDirection[] = ['LOWER_BIOME', 'HIGHER_BIOME'];
const battleEncounterKinds: readonly BattleEncounterKind[] = ['TRAIL', 'AMBUSH', 'WEARY_ENEMY', 'ELITE_TRAIL'];
const rewardRarities: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];
const materialFields: readonly MaterialField[] = ['leather', 'bone', 'herb', 'essence', 'metal', 'crystal'];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isRuneRarity = (value: unknown): value is RuneRarity => isString(value) && rewardRarities.includes(value as RuneRarity);
const isMaterialField = (value: unknown): value is MaterialField => isString(value) && materialFields.includes(value as MaterialField);

const isInventoryLoot = (value: unknown): value is InventoryLoot => (
  isJsonRecord(value)
  && Object.entries(value).every(([field, amount]) => isMaterialField(field) && isNumber(amount))
);

const isRuneDraft = (value: unknown): value is RuneDraft => (
  isJsonRecord(value)
  && isNullableString(value.runeCode ?? null)
  && isNullableString(value.archetypeCode ?? null)
  && isString(value.name)
  && isRuneRarity(value.rarity)
  && typeof value.isEquipped === 'boolean'
  && isNumber(value.health)
  && isNumber(value.attack)
  && isNumber(value.defence)
  && isNumber(value.magicDefence)
  && isNumber(value.dexterity)
  && isNumber(value.intelligence)
  && (value.passiveAbilityCodes === undefined || isStringArray(value.passiveAbilityCodes))
  && (value.activeAbilityCodes === undefined || isStringArray(value.activeAbilityCodes))
);

const isBattleRuneActionSnapshot = (value: unknown): value is NonNullable<BattleRuneLoadoutSnapshot['activeAbility']> => (
  isJsonRecord(value)
  && isString(value.code)
  && isString(value.name)
  && isNumber(value.manaCost)
  && isNumber(value.cooldownTurns)
  && isNumber(value.currentCooldown)
);

const isBattleRuneLoadoutSnapshot = (value: unknown): value is BattleRuneLoadoutSnapshot => (
  isJsonRecord(value)
  && isString(value.runeId)
  && isString(value.runeName)
  && isNullableString(value.archetypeCode)
  && isNullableString(value.archetypeName)
  && (value.schoolCode === undefined || isNullableString(value.schoolCode))
  && (value.schoolMasteryRank === undefined || isNumber(value.schoolMasteryRank))
  && isStringArray(value.passiveAbilityCodes)
  && (value.activeAbility === null || isBattleRuneActionSnapshot(value.activeAbility))
);

const isBattlePlayerSnapshot = (value: unknown): value is BattlePlayerSnapshot => (
  isJsonRecord(value)
  && isNumber(value.playerId)
  && isString(value.name)
  && isNumber(value.attack)
  && isNumber(value.defence)
  && isNumber(value.magicDefence)
  && isNumber(value.dexterity)
  && isNumber(value.intelligence)
  && isNumber(value.maxHealth)
  && isNumber(value.currentHealth)
  && isNumber(value.maxMana)
  && isNumber(value.currentMana)
  && (value.runeLoadout === undefined || value.runeLoadout === null || isBattleRuneLoadoutSnapshot(value.runeLoadout))
  && (value.supportRuneLoadout === undefined || value.supportRuneLoadout === null || isBattleRuneLoadoutSnapshot(value.supportRuneLoadout))
  && (value.guardPoints === undefined || isNumber(value.guardPoints))
);

const isBattlePartyMemberSnapshot = (value: unknown): value is BattlePartySnapshot['members'][number] => (
  isJsonRecord(value)
  && isNumber(value.playerId)
  && isNumber(value.vkId)
  && isString(value.name)
  && isBattlePlayerSnapshot(value.snapshot)
);

const isBattlePartySnapshot = (value: unknown): value is BattlePartySnapshot => (
  isJsonRecord(value)
  && isString(value.id)
  && isString(value.inviteCode)
  && isNumber(value.leaderPlayerId)
  && (value.currentTurnPlayerId === null || isNumber(value.currentTurnPlayerId))
  && (value.enemyTargetPlayerId === null || isNumber(value.enemyTargetPlayerId))
  && Array.isArray(value.actedPlayerIds)
  && value.actedPlayerIds.every(isNumber)
  && Array.isArray(value.members)
  && value.members.every(isBattlePartyMemberSnapshot)
);

const isBattleEnemyIntentSnapshot = (value: unknown): value is NonNullable<BattleEnemySnapshot['intent']> => (
  isJsonRecord(value)
  && isString(value.code)
  && battleEnemyIntentCodes.includes(value.code as BattleEnemyIntentCode)
  && isString(value.title)
  && isString(value.description)
  && isNumber(value.bonusAttack)
  && (value.shattersGuard === undefined || typeof value.shattersGuard === 'boolean')
);

const isBattleEnemyKnowledgeSnapshot = (value: unknown): value is NonNullable<BattleEnemySnapshot['knowledge']> => (
  isJsonRecord(value)
  && typeof value.isDiscovered === 'boolean'
  && typeof value.hasTrophyStudy === 'boolean'
  && isNumber(value.victoryCount)
);

const isBattleEnemyThreatSnapshot = (value: unknown): value is NonNullable<BattleEnemySnapshot['threat']> => (
  isJsonRecord(value)
  && isString(value.rank)
  && battleEnemyThreatRanks.includes(value.rank as BattleEnemyThreatRank)
  && isString(value.baseEnemyName)
  && isNumber(value.survivalCount)
  && isNumber(value.experience)
  && isNumber(value.levelBonus)
);

const isBattleEnemyRoamingSnapshot = (value: unknown): value is NonNullable<BattleEnemySnapshot['roaming']> => (
  isJsonRecord(value)
  && isString(value.direction)
  && battleEnemyRoamingDirections.includes(value.direction as BattleEnemyRoamingDirection)
  && isString(value.originBiomeCode)
  && isString(value.originBiomeName)
  && isNumber(value.levelBonus)
  && isNumber(value.experienceBonus)
);

const isBattleEnemySnapshot = (value: unknown): value is BattleEnemySnapshot => (
  isJsonRecord(value)
  && isString(value.code)
  && isString(value.name)
  && isString(value.kind)
  && typeof value.isElite === 'boolean'
  && typeof value.isBoss === 'boolean'
  && isNumber(value.attack)
  && isNumber(value.defence)
  && isNumber(value.magicDefence)
  && isNumber(value.dexterity)
  && isNumber(value.intelligence)
  && isNumber(value.maxHealth)
  && isNumber(value.currentHealth)
  && isNumber(value.maxMana)
  && isNumber(value.currentMana)
  && isNumber(value.experienceReward)
  && isNumber(value.goldReward)
  && isNumber(value.runeDropChance)
  && (value.lootTable === undefined || isInventoryLoot(value.lootTable))
  && isString(value.attackText)
  && (value.intent === undefined || value.intent === null || isBattleEnemyIntentSnapshot(value.intent))
  && (value.knowledge === undefined || isBattleEnemyKnowledgeSnapshot(value.knowledge))
  && (value.threat === undefined || isBattleEnemyThreatSnapshot(value.threat))
  && (value.roaming === undefined || isBattleEnemyRoamingSnapshot(value.roaming))
  && (value.hasUsedSignatureMove === undefined || typeof value.hasUsedSignatureMove === 'boolean')
);

const isBattleEncounterView = (value: unknown): value is BattleEncounterView => (
  isJsonRecord(value)
  && (value.status === 'OFFERED' || value.status === 'ENGAGED' || value.status === 'FLED')
  && (value.initialTurnOwner === 'PLAYER' || value.initialTurnOwner === 'ENEMY')
  && typeof value.canFlee === 'boolean'
  && isNumber(value.fleeChancePercent)
  && (value.kind === undefined || (isString(value.kind) && battleEncounterKinds.includes(value.kind as BattleEncounterKind)))
  && (value.title === undefined || isString(value.title))
  && (value.description === undefined || isString(value.description))
  && (value.effectLine === undefined || isString(value.effectLine))
);

const isRewardShardMap = (value: unknown): value is BattleRewardView['shards'] => (
  isJsonRecord(value)
  && Object.entries(value).every(([key, amount]) => isRuneRarity(key) && isNumber(amount))
);

const isBattleRewardView = (value: unknown): value is BattleRewardView => (
  isJsonRecord(value)
  && isNumber(value.experience)
  && isNumber(value.gold)
  && isRewardShardMap(value.shards)
  && (value.droppedRune === null || isRuneDraft(value.droppedRune))
);

export const isBattleSnapshot = (value: unknown): value is BattleSnapshot => (
  hasSchemaVersion(value, BATTLE_SNAPSHOT_SCHEMA_VERSION)
  && isNumber(value.actionRevision)
  && isBattlePlayerSnapshot(value.player)
  && isBattleEnemySnapshot(value.enemy)
  && (value.party === undefined || value.party === null || isBattlePartySnapshot(value.party))
  && (value.encounter === undefined || value.encounter === null || isBattleEncounterView(value.encounter))
  && isStringArray(value.log)
  && (value.result === null || value.result === 'VICTORY' || value.result === 'DEFEAT' || value.result === 'FLED')
  && (value.rewards === null || isBattleRewardView(value.rewards))
);

export const buildBattleSnapshot = (
  battle: Pick<BattleView, 'actionRevision' | 'player' | 'enemy' | 'party' | 'encounter' | 'log' | 'result' | 'rewards'>,
): BattleSnapshot => ({
  schemaVersion: BATTLE_SNAPSHOT_SCHEMA_VERSION,
  actionRevision: battle.actionRevision,
  player: battle.player,
  enemy: battle.enemy,
  party: battle.party ?? null,
  encounter: battle.encounter ?? null,
  log: [...battle.log],
  result: battle.result,
  rewards: battle.rewards,
});
