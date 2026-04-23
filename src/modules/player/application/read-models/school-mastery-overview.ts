import type { PlayerState } from '../../../../shared/types/game';
import { getEquippedRune } from '../../domain/player-stats';
import {
  getPlayerSchoolMastery,
  listSchoolMasteryMilestoneStates,
  type SchoolMasteryMilestoneKind,
  type SchoolMasteryMilestoneStatus,
} from '../../domain/school-mastery';
import {
  getSchoolDefinitionForArchetype,
  listSchoolDefinitions,
} from '../../../runes/domain/rune-schools';

export type SchoolMasteryOverviewStatus = 'current' | 'opened' | 'closed';

export interface SchoolMasteryMilestoneOverview {
  readonly kind: SchoolMasteryMilestoneKind;
  readonly status: SchoolMasteryMilestoneStatus;
  readonly threshold: number;
  readonly title: string;
  readonly description: string;
  readonly progressText: string;
}

export interface SchoolMasterySchoolOverview {
  readonly schoolCode: string;
  readonly name: string;
  readonly nameGenitive: string;
  readonly status: SchoolMasteryOverviewStatus;
  readonly experience: number;
  readonly rank: number;
  readonly milestones: readonly SchoolMasteryMilestoneOverview[];
}

export interface SchoolMasteryOverviewView {
  readonly currentSchoolCode: string | null;
  readonly schools: readonly SchoolMasterySchoolOverview[];
}

const formatMilestoneProgress = (experience: number, threshold: number): string => (
  `${Math.min(experience, threshold)}/${threshold}`
);

const hasRuneOfSchool = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
): boolean => (
  player.runes.some((rune) => getSchoolDefinitionForArchetype(rune.archetypeCode)?.code === schoolCode)
);

const resolveSchoolStatus = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
  currentSchoolCode: string | null,
  experience: number,
): SchoolMasteryOverviewStatus => {
  if (schoolCode === currentSchoolCode) {
    return 'current';
  }

  return experience > 0 || hasRuneOfSchool(player, schoolCode)
    ? 'opened'
    : 'closed';
};

export const buildSchoolMasteryOverviewView = (player: PlayerState): SchoolMasteryOverviewView => {
  const equippedRune = getEquippedRune(player);
  const currentSchoolCode = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode)?.code ?? null;

  return {
    currentSchoolCode,
    schools: listSchoolDefinitions().map((school): SchoolMasterySchoolOverview => {
      const mastery = getPlayerSchoolMastery(player, school.code);
      const experience = mastery?.experience ?? 0;

      return {
        schoolCode: school.code,
        name: school.name,
        nameGenitive: school.nameGenitive,
        status: resolveSchoolStatus(player, school.code, currentSchoolCode, experience),
        experience,
        rank: mastery?.rank ?? 0,
        milestones: listSchoolMasteryMilestoneStates(mastery).map((milestone): SchoolMasteryMilestoneOverview => ({
          kind: milestone.kind,
          status: milestone.status,
          threshold: milestone.threshold,
          title: milestone.title,
          description: milestone.description,
          progressText: formatMilestoneProgress(experience, milestone.threshold),
        })),
      };
    }),
  };
};
