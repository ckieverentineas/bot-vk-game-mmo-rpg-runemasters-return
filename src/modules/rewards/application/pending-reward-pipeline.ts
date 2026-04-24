import { AppError } from '../../../shared/domain/AppError';
import type {
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
  type PendingRewardTrophyActionSnapshot,
} from '../domain/pending-reward-snapshot';
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

  return createPendingRewardLedgerEntry(pendingRewardSnapshot);
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
