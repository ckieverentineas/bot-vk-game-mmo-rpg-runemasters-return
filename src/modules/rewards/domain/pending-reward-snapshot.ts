import type {
  InventoryDelta,
  InventoryField,
  PlayerSkillCode,
  StatKey,
} from '../../../shared/types/game';

import { isPlayerSkillCode } from '../../player/domain/player-skills';
import type { RewardIntent, RewardPayloadV1, RewardSourceType } from '../../shared/domain/contracts/reward-intent';
import { isRewardPayload } from '../../shared/domain/contracts/reward-intent';
import { hasSchemaVersion, isJsonRecord } from '../../shared/domain/contracts/versioned-contract';
import type { TrophyActionCode, TrophyActionDefinition } from './trophy-actions';

export const PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type PendingRewardSnapshotStatus = 'PENDING' | 'APPLIED' | 'EXPIRED';

export interface PendingRewardTrophyActionSnapshot {
  readonly code: TrophyActionCode;
  readonly label: string;
  readonly skillCodes: readonly PlayerSkillCode[];
  readonly visibleRewardFields: readonly InventoryField[];
}

export interface PendingRewardSkillUpSnapshot {
  readonly skillCode: PlayerSkillCode;
  readonly experienceBefore: number;
  readonly experienceAfter: number;
  readonly rankBefore: number;
  readonly rankAfter: number;
}

export interface PendingRewardStatUpSnapshot {
  readonly statKey: StatKey;
  readonly before: number;
  readonly after: number;
}

export interface PendingRewardSchoolUpSnapshot {
  readonly schoolCode: string;
  readonly experienceBefore: number;
  readonly experienceAfter: number;
  readonly rankBefore: number;
  readonly rankAfter: number;
}

export interface PendingRewardAppliedResultSnapshot {
  readonly baseRewardApplied: boolean;
  readonly inventoryDelta: InventoryDelta;
  readonly skillUps: readonly PendingRewardSkillUpSnapshot[];
  readonly statUps: readonly PendingRewardStatUpSnapshot[];
  readonly schoolUps: readonly PendingRewardSchoolUpSnapshot[];
}

export interface PendingRewardSnapshotV1 {
  readonly schemaVersion: typeof PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION;
  readonly intentId: string;
  readonly sourceType: RewardSourceType;
  readonly sourceId: string;
  readonly playerId: number;
  readonly status: PendingRewardSnapshotStatus;
  readonly baseReward: RewardPayloadV1;
  readonly trophyActions: readonly PendingRewardTrophyActionSnapshot[];
  readonly selectedActionCode: TrophyActionCode | null;
  readonly appliedResult: PendingRewardAppliedResultSnapshot | null;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export type PendingRewardSnapshot = PendingRewardSnapshotV1;

const trophyActionCodes: readonly TrophyActionCode[] = [
  'claim_all',
  'skin_beast',
  'gather_slime',
  'extract_essence',
];

const pendingRewardStatuses: readonly PendingRewardSnapshotStatus[] = ['PENDING', 'APPLIED', 'EXPIRED'];

const inventoryFields: readonly InventoryField[] = [
  'usualShards',
  'unusualShards',
  'rareShards',
  'epicShards',
  'legendaryShards',
  'mythicalShards',
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

const statKeys: readonly StatKey[] = [
  'health',
  'attack',
  'defence',
  'magicDefence',
  'dexterity',
  'intelligence',
];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isRewardSourceType = (value: unknown): value is RewardSourceType => value === 'BATTLE_VICTORY';

const isPendingRewardSnapshotStatus = (value: unknown): value is PendingRewardSnapshotStatus => (
  isString(value) && pendingRewardStatuses.includes(value as PendingRewardSnapshotStatus)
);

const isTrophyActionCode = (value: unknown): value is TrophyActionCode => (
  isString(value) && trophyActionCodes.includes(value as TrophyActionCode)
);

const isInventoryField = (value: unknown): value is InventoryField => (
  isString(value) && inventoryFields.includes(value as InventoryField)
);

const isStatKey = (value: unknown): value is StatKey => (
  isString(value) && statKeys.includes(value as StatKey)
);

const isKnownPlayerSkillCode = (value: unknown): value is PlayerSkillCode => (
  isString(value) && isPlayerSkillCode(value)
);

const isInventoryDelta = (value: unknown): value is InventoryDelta => (
  isJsonRecord(value)
  && Object.entries(value).every(([field, amount]) => isInventoryField(field) && isNumber(amount))
);

const isPlayerSkillCodeArray = (value: unknown): value is readonly PlayerSkillCode[] => (
  Array.isArray(value) && value.every(isKnownPlayerSkillCode)
);

const isInventoryFieldArray = (value: unknown): value is readonly InventoryField[] => (
  Array.isArray(value) && value.every(isInventoryField)
);

const isPendingRewardTrophyActionSnapshot = (value: unknown): value is PendingRewardTrophyActionSnapshot => (
  isJsonRecord(value)
  && isTrophyActionCode(value.code)
  && isString(value.label)
  && isPlayerSkillCodeArray(value.skillCodes)
  && isInventoryFieldArray(value.visibleRewardFields)
);

const isPendingRewardSkillUpSnapshot = (value: unknown): value is PendingRewardSkillUpSnapshot => (
  isJsonRecord(value)
  && isKnownPlayerSkillCode(value.skillCode)
  && isNumber(value.experienceBefore)
  && isNumber(value.experienceAfter)
  && isNumber(value.rankBefore)
  && isNumber(value.rankAfter)
);

const isPendingRewardStatUpSnapshot = (value: unknown): value is PendingRewardStatUpSnapshot => (
  isJsonRecord(value)
  && isStatKey(value.statKey)
  && isNumber(value.before)
  && isNumber(value.after)
);

const isPendingRewardSchoolUpSnapshot = (value: unknown): value is PendingRewardSchoolUpSnapshot => (
  isJsonRecord(value)
  && isString(value.schoolCode)
  && isNumber(value.experienceBefore)
  && isNumber(value.experienceAfter)
  && isNumber(value.rankBefore)
  && isNumber(value.rankAfter)
);

const isPendingRewardAppliedResultSnapshot = (value: unknown): value is PendingRewardAppliedResultSnapshot => (
  isJsonRecord(value)
  && typeof value.baseRewardApplied === 'boolean'
  && isInventoryDelta(value.inventoryDelta)
  && Array.isArray(value.skillUps)
  && value.skillUps.every(isPendingRewardSkillUpSnapshot)
  && Array.isArray(value.statUps)
  && value.statUps.every(isPendingRewardStatUpSnapshot)
  && Array.isArray(value.schoolUps)
  && value.schoolUps.every(isPendingRewardSchoolUpSnapshot)
);

const hasConsistentResolutionState = (value: unknown): boolean => {
  if (!isJsonRecord(value) || !isPendingRewardSnapshotStatus(value.status)) {
    return false;
  }

  if (value.status === 'APPLIED') {
    return isTrophyActionCode(value.selectedActionCode)
      && isPendingRewardAppliedResultSnapshot(value.appliedResult);
  }

  return value.selectedActionCode === null && value.appliedResult === null;
};

const cloneRewardPayload = (payload: RewardPayloadV1): RewardPayloadV1 => ({
  experience: payload.experience,
  gold: payload.gold,
  shards: { ...payload.shards },
  droppedRune: payload.droppedRune
    ? {
        ...payload.droppedRune,
        activeAbilityCodes: payload.droppedRune.activeAbilityCodes
          ? [...payload.droppedRune.activeAbilityCodes]
          : undefined,
        passiveAbilityCodes: payload.droppedRune.passiveAbilityCodes
          ? [...payload.droppedRune.passiveAbilityCodes]
          : undefined,
      }
    : null,
});

const createPendingRewardTrophyActionSnapshot = (
  action: TrophyActionDefinition,
): PendingRewardTrophyActionSnapshot => ({
  code: action.code,
  label: action.label,
  skillCodes: [...action.skillCodes],
  visibleRewardFields: [...action.visibleRewardFields],
});

export const createPendingRewardSnapshot = (
  intent: RewardIntent,
  trophyActions: readonly TrophyActionDefinition[],
  createdAt: string,
): PendingRewardSnapshot => ({
  schemaVersion: PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION,
  intentId: intent.intentId,
  sourceType: intent.sourceType,
  sourceId: intent.sourceId,
  playerId: intent.playerId,
  status: 'PENDING',
  baseReward: cloneRewardPayload(intent.payload),
  trophyActions: trophyActions.map(createPendingRewardTrophyActionSnapshot),
  selectedActionCode: null,
  appliedResult: null,
  createdAt,
});

export const isPendingRewardSnapshot = (value: unknown): value is PendingRewardSnapshot => (
  hasSchemaVersion(value, PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION)
  && isString(value.intentId)
  && isRewardSourceType(value.sourceType)
  && isString(value.sourceId)
  && isNumber(value.playerId)
  && isPendingRewardSnapshotStatus(value.status)
  && isRewardPayload(value.baseReward)
  && Array.isArray(value.trophyActions)
  && value.trophyActions.every(isPendingRewardTrophyActionSnapshot)
  && hasConsistentResolutionState(value)
  && isString(value.createdAt)
  && (value.updatedAt === undefined || isString(value.updatedAt))
);
