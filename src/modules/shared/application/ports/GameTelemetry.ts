import type { RuneRarity, TutorialState } from '../../../../shared/types/game';
import type { NextGoalType } from '../../../player/application/read-models/next-goal';

export type QuestTelemetryStatus = 'READY_TO_CLAIM' | 'IN_PROGRESS' | 'CLAIMED';
export type EconomyTransactionType = 'reward_claim';
export type EconomyTransactionSourceType = 'QUEST_REWARD' | 'DAILY_TRACE';

export interface QuestTelemetryPayload {
  readonly playerId: number;
  readonly questCode: string | null;
  readonly questStatus: QuestTelemetryStatus | null;
  readonly readyToClaimCount: number;
  readonly claimedCount: number;
}

export interface EconomyTransactionTelemetryPayload {
  readonly transactionType: EconomyTransactionType;
  readonly sourceType: EconomyTransactionSourceType;
  readonly sourceId: string;
  readonly resourceDustDelta: number;
  readonly resourceShardsDelta: number;
  readonly runeDelta: number;
  readonly playerLevel: number;
}

export interface DailyTraceTelemetryPayload {
  readonly playerId: number;
  readonly activityCode: string;
  readonly gameDay: string;
  readonly claimedNow: boolean;
  readonly rewardDustDelta: number;
  readonly rewardShardsDelta: number;
}

export interface GameTelemetry {
  onboardingStarted(
    userId: number,
    payload: {
      readonly entrySurface: 'start';
      readonly tutorialState: TutorialState;
    },
  ): Promise<void>;
  tutorialPathChosen(
    userId: number,
    payload: {
      readonly entrySurface: 'location' | 'skip_tutorial' | 'return_to_adventure';
      readonly choice: 'continue_tutorial' | 'skip_tutorial';
      readonly tutorialState: TutorialState;
    },
  ): Promise<void>;
  loadoutChanged(
    userId: number,
    payload: {
      readonly changeType: 'equip_rune' | 'unequip_rune';
      readonly slotNumber: number;
      readonly beforeSchoolCode: string | null;
      readonly afterSchoolCode: string | null;
      readonly beforeRarity: RuneRarity | null;
      readonly afterRarity: RuneRarity | null;
    },
  ): Promise<void>;
  schoolNoviceEliteEncounterStarted(
    userId: number,
    payload: {
      readonly battleId: string;
      readonly schoolCode: string;
      readonly enemyCode: string;
      readonly biomeCode: string;
      readonly locationLevel: number;
      readonly targetRewardRarity: RuneRarity;
      readonly nextGoalType: 'hunt_school_elite';
    },
  ): Promise<void>;
  firstSchoolPresented(
    userId: number,
    payload: {
      readonly schoolCode: string;
      readonly presentationSurface: 'battle_result';
      readonly presentationReason: 'first_rune_reward' | 'school_trial_completed';
    },
  ): Promise<void>;
  firstSchoolCommitted(
    userId: number,
    payload: {
      readonly schoolCode: string;
      readonly runeId: string;
      readonly runeRarity: RuneRarity;
      readonly commitSource: 'equip_current_rune';
    },
  ): Promise<void>;
  schoolNoviceFollowUpActionTaken(
    userId: number,
    payload: {
      readonly schoolCode: string;
      readonly currentGoalType: NextGoalType;
      readonly actionType: 'open_runes' | 'equip_school_sign' | 'start_next_battle';
      readonly signEquipped: boolean;
      readonly usedSchoolSign: boolean;
      readonly battleId: string | null;
      readonly enemyCode: string | null;
    },
  ): Promise<void>;
  returnRecapShown(
    userId: number,
    payload: {
      readonly entrySurface: 'start_existing' | 'skip_tutorial' | 'return_to_adventure';
      readonly hasEquippedRune: boolean;
      readonly currentSchoolCode: string | null;
      readonly nextStepType: NextGoalType;
    },
  ): Promise<void>;
  postSessionNextGoalShown(
    userId: number,
    payload: {
      readonly battleOutcome: 'VICTORY' | 'DEFEAT';
      readonly hadRuneDrop: boolean;
      readonly suggestedGoalType: NextGoalType;
      readonly enemyCode: string;
      readonly battleSchoolCode: string | null;
      readonly isSchoolNoviceElite: boolean;
    },
  ): Promise<void>;
  economyTransactionCommitted(
    userId: number,
    payload: EconomyTransactionTelemetryPayload,
  ): Promise<void>;
  questBookOpened(userId: number, payload: QuestTelemetryPayload): Promise<void>;
  questRewardClaimed(userId: number, payload: QuestTelemetryPayload): Promise<void>;
  questRewardReplayed(userId: number, payload: QuestTelemetryPayload): Promise<void>;
  questRewardNotReady(userId: number, payload: QuestTelemetryPayload): Promise<void>;
  dailyTraceClaimed?(userId: number, payload: DailyTraceTelemetryPayload): Promise<void>;
  dailyTraceAlreadyClaimed?(userId: number, payload: DailyTraceTelemetryPayload): Promise<void>;
}
