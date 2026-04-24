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
    description: 'Чистая работа с добычей: кожа, кость и крепкие походные материалы.',
  },
  {
    code: 'gathering.reagent_gathering',
    category: 'gathering',
    title: 'Сбор реагентов',
    description: 'Сбор трав, слизи и редких остатков, которые не стоит мять грубой рукой.',
  },
  {
    code: 'gathering.essence_extraction',
    category: 'gathering',
    title: 'Извлечение эссенции',
    description: 'Извлечение тонкой силы из следов духов, фокусов и старых чар.',
  },
  {
    code: 'combat.striking',
    category: 'combat',
    title: 'Боевые удары',
    description: 'Точные удары, давление и добивание врага в нужный миг.',
  },
  {
    code: 'combat.guard',
    category: 'combat',
    title: 'Стойка',
    description: 'Стойка, щит и спокойный ответ под опасным ударом.',
  },
  {
    code: 'defence.endurance',
    category: 'defence',
    title: 'Выносливость',
    description: 'Выдержка после ран, тяжёлых ударов и опасных поворотов боя.',
  },
  {
    code: 'rune.active_use',
    category: 'rune',
    title: 'Активные руны',
    description: 'Боевые приёмы рун, применённые в нужный миг.',
  },
  {
    code: 'rune.preparation',
    category: 'rune',
    title: 'Подготовка рун',
    description: 'Подготовка рун, защитные знаки и ходы на следующий ответ.',
  },
  {
    code: 'crafting.alchemy',
    category: 'crafting',
    title: 'Алхимия',
    description: 'Создание пилюль и зелий из трав, слизи и трофейных материалов.',
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

export const resolveNextPlayerSkillThreshold = (rank: number): number | null => (
  playerSkillThresholds[rank + 1] ?? null
);

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
