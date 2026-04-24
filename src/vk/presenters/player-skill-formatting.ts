import {
  getPlayerSkillDefinition,
  resolveNextPlayerSkillThreshold,
} from '../../modules/player/domain/player-skills';
import type { PlayerSkillCode, PlayerSkillView } from '../../shared/types/game';

const playerSkillRankLabels = ['Ученик', 'Знаток'] as const;

const playerSkillRankSubjects: Readonly<Record<PlayerSkillCode, string>> = {
  'gathering.skinning': 'свежевания',
  'gathering.reagent_gathering': 'сбора реагентов',
  'gathering.essence_extraction': 'извлечения эссенции',
  'combat.striking': 'боевых ударов',
  'combat.guard': 'стойки',
  'defence.endurance': 'выносливости',
  'rune.active_use': 'активных рун',
  'rune.preparation': 'подготовки рун',
  'crafting.alchemy': 'алхимии',
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
    return 'ранг удержан';
  }

  if (experience <= 0) {
    return 'след ещё чист';
  }

  const progressRatio = experience / nextThreshold;
  if (progressRatio >= 0.75) {
    return 'новый ранг близко';
  }

  if (progressRatio >= 0.35) {
    return 'приём держится';
  }

  return 'рука привыкает';
};

export const formatPlayerSkillProgressLine = (skill: PlayerSkillView): string => [
  `${getPlayerSkillTitle(skill.skillCode)}: ${formatPlayerSkillRank(skill.skillCode, skill.rank)}`,
  formatPlayerSkillProgressHint(skill.experience, skill.rank),
].join(' · ');

const formatPracticeGain = (progressHint: string): string => {
  if (progressHint === 'след ещё чист') {
    return 'след отмечен';
  }

  if (progressHint === 'рука привыкает') {
    return 'движение стало вернее';
  }

  if (progressHint === 'приём держится') {
    return 'приём стал крепче';
  }

  if (progressHint === 'новый ранг близко') {
    return 'новый ранг уже близко';
  }

  return progressHint;
};

const formatProgressTransition = (progressHint: string): string => {
  if (progressHint === 'рука привыкает') {
    return 'рука стала вернее';
  }

  if (progressHint === 'приём держится') {
    return 'приём стал крепче';
  }

  if (progressHint === 'новый ранг близко') {
    return 'новый ранг уже близко';
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
