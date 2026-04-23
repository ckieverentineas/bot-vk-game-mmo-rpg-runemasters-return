import { getEquippedRune } from '../../modules/player/domain/player-stats';
import {
  getPlayerSchoolMasteryForArchetype,
  listSchoolMasteryMilestoneStates,
  resolveCurrentSchoolMasteryMilestone,
  resolveNextSchoolMasteryMilestone,
} from '../../modules/player/domain/school-mastery';
import { getRuneSchoolPresentation } from '../../modules/runes/domain/rune-schools';
import type { PlayerState } from '../../shared/types/game';

export const renderSchoolMasteryLine = (player: PlayerState): string => {
  if (player.runes.length === 0) {
    return 'Мастерство школы: откроется после первой боевой руны.';
  }

  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const mastery = getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode);
  if (!equippedRune || !equippedSchool || !mastery) {
    return 'Мастерство школы: наденьте руну, чтобы начать путь конкретной школы.';
  }

  const nextMilestone = resolveNextSchoolMasteryMilestone(mastery);
  const currentMilestone = resolveCurrentSchoolMasteryMilestone(mastery);

  if (!nextMilestone) {
    const currentMilestonePart = currentMilestone
      ? ` · открыто: ${currentMilestone.title}.`
      : '.';

    return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank}${currentMilestonePart}`;
  }

  return [
    `Мастерство школы: ${equippedSchool.name}`,
    `ранг ${mastery.rank}`,
    `${mastery.experience}/${nextMilestone.threshold} до «${nextMilestone.title}».`,
  ].join(' · ');
};

const formatMilestoneProgress = (experience: number, threshold: number): string => (
  `${Math.min(experience, threshold)}/${threshold}`
);

const formatMilestoneStatus = (status: 'unlocked' | 'next' | 'locked'): string => {
  switch (status) {
    case 'unlocked':
      return '✓';
    case 'next':
      return '→';
    case 'locked':
      return '·';
  }
};

export const renderSchoolMasteryMilestonesBlock = (player: PlayerState): readonly string[] => {
  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const mastery = getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode);

  if (!equippedRune || !equippedSchool || !mastery) {
    return [];
  }

  const milestones = listSchoolMasteryMilestoneStates(mastery);
  if (milestones.length === 0) {
    return [];
  }

  const nextMilestone = milestones.find((milestone) => milestone.status === 'next') ?? null;

  return [
    `Вехи мастерства: ${equippedSchool.name}`,
    ...milestones.map((milestone) => [
      formatMilestoneStatus(milestone.status),
      formatMilestoneProgress(mastery.experience, milestone.threshold),
      `· ${milestone.title}`,
    ].join(' ')),
    ...(nextMilestone ? [`Следующая веха: ${nextMilestone.description}`] : []),
  ];
};
