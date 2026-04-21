import type { PlayerSkillCategory, PlayerSkillCode, PlayerSkillView } from '../../../shared/types/game';

export interface PlayerSkillDefinition {
  readonly code: PlayerSkillCode;
  readonly category: PlayerSkillCategory;
  readonly title: string;
  readonly description: string;
}

const playerSkillDefinitions: readonly PlayerSkillDefinition[] = [
  {
    code: 'gathering.skinning',
    category: 'gathering',
    title: 'Свежевание',
    description: 'Обработка звериных трофеев: кожа, кость и похожие материалы.',
  },
  {
    code: 'gathering.reagent_gathering',
    category: 'gathering',
    title: 'Сбор реагентов',
    description: 'Аккуратное извлечение трав, слизи и алхимических остатков.',
  },
  {
    code: 'gathering.essence_extraction',
    category: 'gathering',
    title: 'Извлечение эссенции',
    description: 'Работа с мистическими остатками, духами и фокусами.',
  },
  {
    code: 'combat.striking',
    category: 'combat',
    title: 'Боевые удары',
    description: 'Практика прямых атак и добивания врагов.',
  },
  {
    code: 'combat.guard',
    category: 'combat',
    title: 'Стойка',
    description: 'Защитные действия, парирование и удержание темпа.',
  },
  {
    code: 'defence.endurance',
    category: 'defence',
    title: 'Выносливость',
    description: 'Рост от пережитого урона и опасных боевых ситуаций.',
  },
  {
    code: 'rune.active_use',
    category: 'rune',
    title: 'Активные руны',
    description: 'Практика боевого применения активных рунных навыков.',
  },
  {
    code: 'rune.preparation',
    category: 'rune',
    title: 'Подготовка рун',
    description: 'Канальные и подготовительные рунные действия.',
  },
];

const maxPlayerSkillRank = 1;
const playerSkillThresholds = [0, 100] as const;

export const listPlayerSkillDefinitions = (): readonly PlayerSkillDefinition[] => playerSkillDefinitions;

export const listPlayerSkillCodes = (): readonly PlayerSkillCode[] => (
  playerSkillDefinitions.map((definition) => definition.code)
);

export const getPlayerSkillDefinition = (skillCode: string | null | undefined): PlayerSkillDefinition | null => (
  playerSkillDefinitions.find((definition) => definition.code === skillCode) ?? null
);

export const isPlayerSkillCode = (skillCode: string | null | undefined): skillCode is PlayerSkillCode => (
  getPlayerSkillDefinition(skillCode) !== null
);

export const resolvePlayerSkillRank = (experience: number): number => {
  if (experience < playerSkillThresholds[1]) {
    return 0;
  }

  return maxPlayerSkillRank;
};

export const createPlayerSkillView = (skillCode: PlayerSkillCode, experience = 0): PlayerSkillView => {
  const normalizedExperience = Math.max(0, Math.floor(Number.isFinite(experience) ? experience : 0));

  return {
    skillCode,
    experience: normalizedExperience,
    rank: resolvePlayerSkillRank(normalizedExperience),
  };
};

export const applyPlayerSkillExperience = (
  current: PlayerSkillView | null,
  skillCode: PlayerSkillCode,
  experienceGain: number,
): PlayerSkillView => {
  const normalizedGain = Math.max(0, Math.floor(Number.isFinite(experienceGain) ? experienceGain : 0));
  return createPlayerSkillView(skillCode, (current?.experience ?? 0) + normalizedGain);
};
