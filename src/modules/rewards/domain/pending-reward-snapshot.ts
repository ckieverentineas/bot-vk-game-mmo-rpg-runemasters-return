import type {
  InventoryDelta,
  InventoryField,
  PlayerSkillCode,
  PlayerSkillPointGain,
  StatKey,
} from '../../../shared/types/game';

import { isPlayerSkillCode } from '../../player/domain/player-skills';
import type { RewardIntent, RewardPayloadV1, RewardSourceType } from '../../shared/domain/contracts/reward-intent';
import { isRewardPayload } from '../../shared/domain/contracts/reward-intent';
import { hasSchemaVersion, isJsonRecord } from '../../shared/domain/contracts/versioned-contract';
import type { TrophyActionCode, TrophyActionDefinition, TrophyActionReward } from './trophy-actions';

export const PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type PendingRewardSnapshotStatus = 'PENDING' | 'APPLIED' | 'EXPIRED';
export type PendingRewardTrophyActionUnavailableReason = 'missing_workshop_tool';

export interface PendingRewardTrophyActionAvailabilitySnapshot {
  readonly available: boolean;
  readonly reasonCode?: PendingRewardTrophyActionUnavailableReason;
  readonly requiredWorkshopItemCodes?: readonly string[];
}

export interface PendingRewardTrophyActionSnapshot {
  readonly code: TrophyActionCode;
  readonly label: string;
  readonly skillCodes: readonly PlayerSkillCode[];
  readonly visibleRewardFields: readonly InventoryField[];
  readonly availability?: PendingRewardTrophyActionAvailabilitySnapshot;
  readonly reward?: PendingRewardTrophyActionRewardSnapshot;
}

export interface PendingRewardTrophyActionRewardSnapshot {
  readonly inventoryDelta: InventoryDelta;
  readonly skillPoints: readonly PlayerSkillPointGain[];
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

export interface PendingRewardWorkshopItemDurabilityChangeSnapshot {
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemClass: string;
  readonly slot: string;
  readonly statusBefore: string;
  readonly statusAfter: string;
  readonly equippedBefore: boolean;
  readonly equippedAfter: boolean;
  readonly durabilityBefore: number;
  readonly durabilityAfter: number;
  readonly maxDurability: number;
}

export interface PendingRewardAppliedResultSnapshot {
  readonly baseRewardApplied: boolean;
  readonly inventoryDelta: InventoryDelta;
  readonly skillUps: readonly PendingRewardSkillUpSnapshot[];
  readonly statUps: readonly PendingRewardStatUpSnapshot[];
  readonly schoolUps: readonly PendingRewardSchoolUpSnapshot[];
  readonly workshopItemDurabilityChanges?: readonly PendingRewardWorkshopItemDurabilityChangeSnapshot[];
}

export interface PendingRewardSnapshotBaseV1 {
  readonly schemaVersion: typeof PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION;
  readonly intentId: string;
  readonly sourceType: RewardSourceType;
  readonly sourceId: string;
  readonly playerId: number;
  readonly baseReward: RewardPayloadV1;
  readonly trophyActions: readonly PendingRewardTrophyActionSnapshot[];
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface PendingRewardOpenSnapshotV1 extends PendingRewardSnapshotBaseV1 {
  readonly status: 'PENDING';
  readonly selectedActionCode: null;
  readonly appliedResult: null;
}

export interface PendingRewardAppliedSnapshotV1 extends PendingRewardSnapshotBaseV1 {
  readonly status: 'APPLIED';
  readonly selectedActionCode: TrophyActionCode;
  readonly appliedResult: PendingRewardAppliedResultSnapshot;
}

export interface PendingRewardExpiredSnapshotV1 extends PendingRewardSnapshotBaseV1 {
  readonly status: 'EXPIRED';
  readonly selectedActionCode: null;
  readonly appliedResult: null;
}

export type PendingRewardSnapshot =
  | PendingRewardOpenSnapshotV1
  | PendingRewardAppliedSnapshotV1
  | PendingRewardExpiredSnapshotV1;

const trophyActionCodes: readonly TrophyActionCode[] = [
  'claim_all',
  'skin_beast',
  'gather_slime',
  'extract_essence',
  'draw_ember_sign',
  'break_stone_seal',
  'catch_gale_trace',
  'read_omen_mark',
  'careful_skinning',
  'refine_slime_core',
  'stabilize_essence',
  'salvage_armor',
  'strip_goblin_gear',
  'crack_troll_growths',
  'unmake_phylactery',
  'bind_abyss_ichor',
  'harvest_dragon_scale',
];

const pendingRewardStatuses: readonly PendingRewardSnapshotStatus[] = ['PENDING', 'APPLIED', 'EXPIRED'];
const pendingRewardTrophyActionUnavailableReasons: readonly PendingRewardTrophyActionUnavailableReason[] = [
  'missing_workshop_tool',
];

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
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isRewardSourceType = (value: unknown): value is RewardSourceType => value === 'BATTLE_VICTORY';

const isPendingRewardSnapshotStatus = (value: unknown): value is PendingRewardSnapshotStatus => (
  isString(value) && pendingRewardStatuses.includes(value as PendingRewardSnapshotStatus)
);

const isTrophyActionCode = (value: unknown): value is TrophyActionCode => (
  isString(value) && trophyActionCodes.includes(value as TrophyActionCode)
);

const isPendingRewardTrophyActionUnavailableReason = (
  value: unknown,
): value is PendingRewardTrophyActionUnavailableReason => (
  isString(value)
  && pendingRewardTrophyActionUnavailableReasons.includes(value as PendingRewardTrophyActionUnavailableReason)
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

const isPlayerSkillPointGain = (value: unknown): value is PlayerSkillPointGain => (
  isJsonRecord(value)
  && isKnownPlayerSkillCode(value.skillCode)
  && isNumber(value.points)
);

const isPendingRewardTrophyActionRewardSnapshot = (
  value: unknown,
): value is PendingRewardTrophyActionRewardSnapshot => (
  isJsonRecord(value)
  && isInventoryDelta(value.inventoryDelta)
  && Array.isArray(value.skillPoints)
  && value.skillPoints.every(isPlayerSkillPointGain)
);

const isPlayerSkillCodeArray = (value: unknown): value is readonly PlayerSkillCode[] => (
  Array.isArray(value) && value.every(isKnownPlayerSkillCode)
);

const isInventoryFieldArray = (value: unknown): value is readonly InventoryField[] => (
  Array.isArray(value) && value.every(isInventoryField)
);

const isStringArray = (value: unknown): value is readonly string[] => (
  Array.isArray(value) && value.every(isString)
);

const isPendingRewardTrophyActionAvailabilitySnapshot = (
  value: unknown,
): value is PendingRewardTrophyActionAvailabilitySnapshot => (
  isJsonRecord(value)
  && isBoolean(value.available)
  && (
    value.reasonCode === undefined
    || isPendingRewardTrophyActionUnavailableReason(value.reasonCode)
  )
  && (
    value.requiredWorkshopItemCodes === undefined
    || isStringArray(value.requiredWorkshopItemCodes)
  )
  && (
    value.available
    || isPendingRewardTrophyActionUnavailableReason(value.reasonCode)
  )
);

const isPendingRewardTrophyActionSnapshot = (value: unknown): value is PendingRewardTrophyActionSnapshot => (
  isJsonRecord(value)
  && isTrophyActionCode(value.code)
  && isString(value.label)
  && isPlayerSkillCodeArray(value.skillCodes)
  && isInventoryFieldArray(value.visibleRewardFields)
  && (
    value.availability === undefined
    || isPendingRewardTrophyActionAvailabilitySnapshot(value.availability)
  )
  && (value.reward === undefined || isPendingRewardTrophyActionRewardSnapshot(value.reward))
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

const isPendingRewardWorkshopItemDurabilityChangeSnapshot = (
  value: unknown,
): value is PendingRewardWorkshopItemDurabilityChangeSnapshot => (
  isJsonRecord(value)
  && isString(value.itemId)
  && isString(value.itemCode)
  && isString(value.itemClass)
  && isString(value.slot)
  && isString(value.statusBefore)
  && isString(value.statusAfter)
  && isBoolean(value.equippedBefore)
  && isBoolean(value.equippedAfter)
  && isNumber(value.durabilityBefore)
  && isNumber(value.durabilityAfter)
  && isNumber(value.maxDurability)
);

const isPendingRewardWorkshopItemDurabilityChanges = (
  value: unknown,
): value is readonly PendingRewardWorkshopItemDurabilityChangeSnapshot[] => (
  Array.isArray(value) && value.every(isPendingRewardWorkshopItemDurabilityChangeSnapshot)
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
  && (
    value.workshopItemDurabilityChanges === undefined
    || isPendingRewardWorkshopItemDurabilityChanges(value.workshopItemDurabilityChanges)
  )
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

const cloneInventoryDelta = (delta: InventoryDelta): InventoryDelta => ({ ...delta });

const createPendingRewardTrophyActionRewardSnapshot = (
  action: TrophyActionDefinition,
  actionRewards: readonly TrophyActionReward[],
): Pick<PendingRewardTrophyActionSnapshot, 'reward'> => {
  const reward = actionRewards.find((candidate) => candidate.actionCode === action.code);

  if (!reward) {
    return {};
  }

  return {
    reward: {
      inventoryDelta: cloneInventoryDelta(reward.inventoryDelta),
      skillPoints: reward.skillPoints.map((skillPoint) => ({
        skillCode: skillPoint.skillCode,
        points: skillPoint.points,
      })),
    },
  };
};

const createPendingRewardTrophyActionSnapshot = (
  action: TrophyActionDefinition,
  actionRewards: readonly TrophyActionReward[],
): PendingRewardTrophyActionSnapshot => ({
  code: action.code,
  label: action.label,
  skillCodes: [...action.skillCodes],
  visibleRewardFields: [...action.visibleRewardFields],
  ...createPendingRewardTrophyActionRewardSnapshot(action, actionRewards),
});

export const createPendingRewardSnapshot = (
  intent: RewardIntent,
  trophyActions: readonly TrophyActionDefinition[],
  createdAt: string,
  trophyActionRewards: readonly TrophyActionReward[] = [],
): PendingRewardOpenSnapshotV1 => ({
  schemaVersion: PENDING_REWARD_SNAPSHOT_SCHEMA_VERSION,
  intentId: intent.intentId,
  sourceType: intent.sourceType,
  sourceId: intent.sourceId,
  playerId: intent.playerId,
  status: 'PENDING',
  baseReward: cloneRewardPayload(intent.payload),
  trophyActions: trophyActions.map((action) => createPendingRewardTrophyActionSnapshot(action, trophyActionRewards)),
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
