import type { RuneRarity, TutorialState } from '../../../../shared/types/game';
import type { NextGoalType } from '../../../player/application/read-models/next-goal';

export interface GameTelemetry {
  onboardingStarted(
    userId: number,
    payload: {
      readonly entrySurface: 'start';
      readonly tutorialState: TutorialState;
    },
  ): Promise<void>;
  loadoutChanged(
    userId: number,
    payload: {
      readonly changeType: 'equip_primary' | 'equip_support' | 'unequip_primary' | 'unequip_support';
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
}
