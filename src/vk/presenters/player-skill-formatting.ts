import {
  getPlayerSkillDefinition,
  resolveNextPlayerSkillThreshold,
} from '../../modules/player/domain/player-skills';
import type { PlayerSkillCode, PlayerSkillView } from '../../shared/types/game';

const playerSkillRankLabels = ['Новичок', 'Практик'] as const;

const playerSkillRankSubjects: Readonly<Record<PlayerSkillCode, string>> = {
  'gathering.skinning': 'свежевания',
  'gathering.reagent_gathering': 'сбора реагентов',
  'gathering.essence_extraction': 'извлечения эссенции',
  'combat.striking': 'боевых ударов',
  'combat.guard': 'стойки',
  'defence.endurance': 'выносливости',
  'rune.active_use': 'активных рун',
  'rune.preparation': 'подготовки рун',
};

export interface PlayerSkillGainView {
  readonly skillCode: PlayerSkillCode;
  readonly experienceBefore: number;
  readonly experienceAfter: number;
  readonly rankBefore: number;
  readonly rankAfter: number;
}

const getPlayerSkillTitle = (skillCode: PlayerSkillCode): string => (
  getPlayerSkillDefinition(skillCode)?.title ?? skillCode
);

export const formatPlayerSkillTitles = (skillCodes: readonly PlayerSkillCode[]): string => {
  const titles = skillCodes.map(getPlayerSkillTitle);
  return titles.length > 0 ? titles.join(', ') : 'без роста навыка';
};

export const formatPlayerSkillRank = (skillCode: PlayerSkillCode, rank: number): string => {
  const rankLabel = playerSkillRankLabels[rank] ?? playerSkillRankLabels[playerSkillRankLabels.length - 1];
  const rankSubject = playerSkillRankSubjects[skillCode];

  return `${rankLabel} ${rankSubject}`;
};

export const formatPlayerSkillProgressHint = (experience: number, rank: number): string => {
  const nextThreshold = resolveNextPlayerSkillThreshold(rank);
  if (nextThreshold === null) {
    return 'ранг закреплён';
  }

  if (experience <= 0) {
    return 'практики пока нет';
  }

  const progressRatio = experience / nextThreshold;
  if (progressRatio >= 0.75) {
    return 'близко к следующему рангу';
  }

  if (progressRatio >= 0.35) {
    return 'уверенная практика';
  }

  return 'первые успехи';
};

export const formatPlayerSkillProgressLine = (skill: PlayerSkillView): string => [
  `${getPlayerSkillTitle(skill.skillCode)}: ${formatPlayerSkillRank(skill.skillCode, skill.rank)}`,
  formatPlayerSkillProgressHint(skill.experience, skill.rank),
].join(' · ');

const formatPracticeGain = (progressHint: string): string => {
  if (progressHint === 'практики пока нет') {
    return 'практика только начинается';
  }

  if (progressHint === 'первые успехи') {
    return 'первые успехи крепнут';
  }

  if (progressHint === 'уверенная практика') {
    return 'практика стала увереннее';
  }

  if (progressHint === 'близко к следующему рангу') {
    return 'следующий ранг уже близко';
  }

  return progressHint;
};

const formatProgressTransition = (progressHint: string): string => {
  if (progressHint === 'первые успехи') {
    return 'появились первые успехи';
  }

  if (progressHint === 'уверенная практика') {
    return 'практика стала уверенной';
  }

  if (progressHint === 'близко к следующему рангу') {
    return 'следующий ранг уже близко';
  }

  return progressHint;
};

export const formatPlayerSkillGainLine = (skillGain: PlayerSkillGainView): string => {
  const title = getPlayerSkillTitle(skillGain.skillCode);
  const afterRank = formatPlayerSkillRank(skillGain.skillCode, skillGain.rankAfter);
  const beforeHint = formatPlayerSkillProgressHint(skillGain.experienceBefore, skillGain.rankBefore);
  const afterHint = formatPlayerSkillProgressHint(skillGain.experienceAfter, skillGain.rankAfter);

  if (skillGain.rankAfter > skillGain.rankBefore) {
    return `${title}: ${afterRank} · новый ранг`;
  }

  if (afterHint !== beforeHint) {
    return `${title}: ${afterRank} · ${formatProgressTransition(afterHint)}`;
  }

  return `${title}: ${afterRank} · ${formatPracticeGain(afterHint)}`;
};
