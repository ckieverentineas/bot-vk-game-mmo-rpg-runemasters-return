import { AppError } from '../../../shared/domain/AppError';
import type {
  BattleWorkshopItemSnapshot,
  BattleView,
  InventoryDelta,
  PlayerSkillCode,
  PlayerSkillPointGain,
  PlayerSkillView,
} from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import {
  createAppliedPendingRewardLedgerEntry,
  createPendingRewardLedgerEntry,
  type AppliedPendingRewardLedgerEntryV1,
  type PendingRewardLedgerEntryV1,
} from '../../shared/domain/contracts/reward-ledger';
import { createBattleVictoryRewardIntent } from '../../shared/domain/contracts/reward-intent';
import {
  createPendingRewardSnapshot,
  type PendingRewardAppliedResultSnapshot,
  type PendingRewardAppliedSnapshotV1,
  type PendingRewardTrophyActionAvailabilitySnapshot,
  type PendingRewardTrophyActionSnapshot,
} from '../domain/pending-reward-snapshot';
import { resolveTrophyToolItemCodes } from '../domain/trophy-tool-requirements';
import {
  resolveTrophyActionReward,
  resolveTrophyActions,
  type TrophyActionCode,
  type TrophyActionDefinition,
  type TrophyActionEnemyContext,
  type TrophyActionReward,
  type TrophyActionSkillExperienceMap,
} from '../domain/trophy-actions';

export interface PendingRewardBattlePipelineInput {
  readonly playerId: number;
  readonly battle: BattleView;
  readonly createdAt: string;
  readonly playerSkills?: readonly PlayerSkillView[];
}

export interface AppliedPendingRewardPipelineInput {
  readonly ledger: PendingRewardLedgerEntryV1;
  readonly action: PendingRewardTrophyActionSnapshot;
  readonly appliedResult: PendingRewardAppliedResultSnapshot;
  readonly appliedAt: string;
}

export const resolveBattlePlayerSchoolCode = (battle: BattleView): string | null => (
  battle.player.runeLoadout?.schoolCode
  ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
  ?? null
);

export const resolveBattlePlayerSchoolCodes = (battle: BattleView): readonly string[] => {
  const schoolCodes = [
    battle.player.runeLoadout?.schoolCode
      ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
      ?? null,
    battle.player.supportRuneLoadout?.schoolCode
      ?? getSchoolDefinitionForArchetype(battle.player.supportRuneLoadout?.archetypeCode)?.code
      ?? null,
  ];

  return [...new Set(schoolCodes.filter((schoolCode): schoolCode is string => schoolCode !== null))];
};

const createTrophyActionSkillExperienceMap = (
  skills: readonly PlayerSkillView[] | undefined,
): TrophyActionSkillExperienceMap => {
  const experienceByCode: Partial<Record<PlayerSkillCode, number>> = {};

  for (const skill of skills ?? []) {
    experienceByCode[skill.skillCode] = skill.experience;
  }

  return experienceByCode;
};

const createTrophyActionEnemyContext = (
  battle: BattleView,
  playerSkills?: readonly PlayerSkillView[],
): TrophyActionEnemyContext => ({
  kind: battle.enemy.kind,
  code: battle.enemy.code,
  equippedSchoolCode: resolveBattlePlayerSchoolCode(battle),
  equippedSchoolCodes: resolveBattlePlayerSchoolCodes(battle),
  skillExperiences: createTrophyActionSkillExperienceMap(playerSkills),
});

const resolvePendingRewardTrophyActionRewards = (
  battle: BattleView,
  actions: readonly TrophyActionDefinition[],
  playerSkills?: readonly PlayerSkillView[],
): readonly TrophyActionReward[] => {
  const { enemy } = battle;
  const lootTable = enemy.lootTable;

  if (!lootTable) {
    return [];
  }

  return actions.map((action) => resolveTrophyActionReward({
    ...createTrophyActionEnemyContext(battle, playerSkills),
    isElite: enemy.isElite,
    isBoss: enemy.isBoss,
    lootTable,
  }, action));
};

const hasEquippedActiveWorkshopItem = (
  loadout: readonly BattleWorkshopItemSnapshot[] | undefined,
  itemCodes: readonly string[],
): boolean => (
  (loadout ?? []).some((item) => (
    item.slot === 'tool'
    && item.durability > 0
    && itemCodes.includes(item.itemCode)
  ))
);

const createToolAvailabilitySnapshot = (
  battle: BattleView,
  itemCodes: readonly string[],
): PendingRewardTrophyActionAvailabilitySnapshot => {
  if (hasEquippedActiveWorkshopItem(battle.player.workshopLoadout, itemCodes)) {
    return {
      available: true,
      requiredWorkshopItemCodes: [...itemCodes],
    };
  }

  return {
    available: false,
    reasonCode: 'missing_workshop_tool',
    requiredWorkshopItemCodes: [...itemCodes],
  };
};

const attachTrophyActionAvailability = (
  battle: BattleView,
  actions: readonly PendingRewardTrophyActionSnapshot[],
): readonly PendingRewardTrophyActionSnapshot[] => (
  actions.map((action) => {
    const requiredItemCodes = resolveTrophyToolItemCodes(action.code);

    if (requiredItemCodes.length === 0) {
      return action;
    }

    return {
      ...action,
      availability: createToolAvailabilitySnapshot(battle, requiredItemCodes),
    };
  })
);

const ensurePendingRewardTrophyActionAvailable = (
  action: PendingRewardTrophyActionSnapshot,
): void => {
  if (action.availability?.available !== false) {
    return;
  }

  throw new AppError(
    'pending_reward_action_unavailable',
    'Для этого трофейного действия нужен активный инструмент мастерской. Соберите добычу безопасно или вернитесь с подходящим инструментом.',
  );
};

export const createPendingRewardLedgerForBattle = (
  input: PendingRewardBattlePipelineInput,
): PendingRewardLedgerEntryV1 | null => {
  const rewardIntent = createBattleVictoryRewardIntent(input.playerId, input.battle);

  if (!rewardIntent) {
    return null;
  }

  const trophyActions = resolveTrophyActions(createTrophyActionEnemyContext(input.battle, input.playerSkills));
  const pendingRewardSnapshot = createPendingRewardSnapshot(
    rewardIntent,
    trophyActions,
    input.createdAt,
    resolvePendingRewardTrophyActionRewards(input.battle, trophyActions, input.playerSkills),
  );

  return createPendingRewardLedgerEntry({
    ...pendingRewardSnapshot,
    trophyActions: attachTrophyActionAvailability(input.battle, pendingRewardSnapshot.trophyActions),
  });
};

export const findPendingRewardTrophyAction = (
  ledger: PendingRewardLedgerEntryV1,
  actionCode: TrophyActionCode,
): PendingRewardTrophyActionSnapshot => {
  const action = ledger.pendingRewardSnapshot.trophyActions.find((candidate) => candidate.code === actionCode);

  if (!action) {
    throw new AppError(
      'pending_reward_action_unavailable',
      'Этот трофейный жест уже недоступен. Вернитесь к текущей добыче.',
    );
  }

  ensurePendingRewardTrophyActionAvailable(action);

  return action;
};

export const buildPendingRewardSkillPointGains = (
  action: PendingRewardTrophyActionSnapshot,
): readonly PlayerSkillPointGain[] => {
  if (action.reward) {
    return action.reward.skillPoints.map((skillPoint) => ({
      skillCode: skillPoint.skillCode,
      points: skillPoint.points,
    }));
  }

  return action.skillCodes.map((skillCode) => ({
    skillCode,
    points: 1,
  }));
};

export const buildPendingRewardInventoryDelta = (
  action: PendingRewardTrophyActionSnapshot,
): InventoryDelta => (
  action.reward ? { ...action.reward.inventoryDelta } : {}
);

export const createAppliedPendingRewardLedger = (
  input: AppliedPendingRewardPipelineInput,
): AppliedPendingRewardLedgerEntryV1 => {
  const appliedSnapshot: PendingRewardAppliedSnapshotV1 = {
    ...input.ledger.pendingRewardSnapshot,
    status: 'APPLIED',
    selectedActionCode: input.action.code,
    appliedResult: input.appliedResult,
    updatedAt: input.appliedAt,
  };

  return createAppliedPendingRewardLedgerEntry(appliedSnapshot, input.appliedAt);
};
