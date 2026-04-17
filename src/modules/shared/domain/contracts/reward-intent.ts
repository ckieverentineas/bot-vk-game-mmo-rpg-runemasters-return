import type { BattleRewardView, BattleView, RuneDraft, RuneRarity } from '../../../../shared/types/game';

import { hasSchemaVersion, isJsonRecord } from './versioned-contract';

export const REWARD_INTENT_SCHEMA_VERSION = 1 as const;

export type RewardSourceType = 'BATTLE_VICTORY';

export interface RewardPayloadV1 {
  readonly experience: number;
  readonly gold: number;
  readonly shards: Partial<Record<RuneRarity, number>>;
  readonly droppedRune: RuneDraft | null;
}

export interface RewardIntentV1 {
  readonly schemaVersion: typeof REWARD_INTENT_SCHEMA_VERSION;
  readonly intentId: string;
  readonly sourceType: RewardSourceType;
  readonly sourceId: string;
  readonly playerId: number;
  readonly payload: RewardPayloadV1;
}

export type RewardIntent = RewardIntentV1;

const rewardRarities: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isNullableString = (value: unknown): value is string | null | undefined => value === undefined || value === null || isString(value);
const isOptionalStringArray = (value: unknown): value is string[] | undefined => value === undefined || (Array.isArray(value) && value.every(isString));
const isRuneRarity = (value: unknown): value is RuneRarity => isString(value) && rewardRarities.includes(value as RuneRarity);

const isRewardShardMap = (value: unknown): value is RewardPayloadV1['shards'] => {
  if (!isJsonRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([rarity, amount]) => isRuneRarity(rarity) && isNumber(amount));
};

const isRuneDraft = (value: unknown): value is RuneDraft => (
  isJsonRecord(value)
  && isString(value.name)
  && isRuneRarity(value.rarity)
  && typeof value.isEquipped === 'boolean'
  && isNumber(value.health)
  && isNumber(value.attack)
  && isNumber(value.defence)
  && isNumber(value.magicDefence)
  && isNumber(value.dexterity)
  && isNumber(value.intelligence)
  && isNullableString(value.runeCode)
  && isNullableString(value.archetypeCode)
  && isOptionalStringArray(value.activeAbilityCodes)
  && isOptionalStringArray(value.passiveAbilityCodes)
);

const isRewardPayload = (value: unknown): value is RewardPayloadV1 => (
  isJsonRecord(value)
  && isNumber(value.experience)
  && isNumber(value.gold)
  && isRewardShardMap(value.shards)
  && (value.droppedRune === null || isRuneDraft(value.droppedRune))
);

export const isRewardIntent = (value: unknown): value is RewardIntent => (
  hasSchemaVersion(value, REWARD_INTENT_SCHEMA_VERSION)
  && isString(value.intentId)
  && value.sourceType === 'BATTLE_VICTORY'
  && isString(value.sourceId)
  && isNumber(value.playerId)
  && isRewardPayload(value.payload)
);

export const buildBattleRewardViewFromIntent = (intent: RewardIntent): BattleRewardView => ({
  experience: intent.payload.experience,
  gold: intent.payload.gold,
  shards: { ...intent.payload.shards },
  droppedRune: intent.payload.droppedRune,
});

export const createBattleVictoryRewardIntent = (
  playerId: number,
  battle: Pick<BattleView, 'id' | 'result' | 'rewards'>,
): RewardIntent | null => {
  if (battle.result !== 'VICTORY' || !battle.rewards) {
    return null;
  }

  return {
    schemaVersion: REWARD_INTENT_SCHEMA_VERSION,
    intentId: `battle-victory:${battle.id}`,
    sourceType: 'BATTLE_VICTORY',
    sourceId: battle.id,
    playerId,
    payload: {
      experience: battle.rewards.experience,
      gold: battle.rewards.gold,
      shards: { ...battle.rewards.shards },
      droppedRune: battle.rewards.droppedRune,
    },
  };
};
