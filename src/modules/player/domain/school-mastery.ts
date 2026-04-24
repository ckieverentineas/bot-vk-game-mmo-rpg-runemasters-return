import type { BattleView, PlayerState, SchoolMasteryView } from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype, listSchoolDefinitions } from '../../runes/domain/rune-schools';

export interface SchoolMasteryUnlockDefinition {
  readonly rank: number;
  readonly title: string;
  readonly description: string;
}

export interface SchoolMasteryMinorMilestoneDefinition {
  readonly threshold: number;
  readonly title: string;
  readonly description: string;
}

export type SchoolMasteryMilestoneKind = 'milestone' | 'rank_unlock';
export type SchoolMasteryMilestoneStatus = 'unlocked' | 'next' | 'locked';

export interface SchoolMasteryMilestoneDefinition {
  readonly threshold: number;
  readonly title: string;
  readonly description: string;
  readonly kind: SchoolMasteryMilestoneKind;
}

export interface SchoolMasteryMilestoneState extends SchoolMasteryMilestoneDefinition {
  readonly status: SchoolMasteryMilestoneStatus;
}

export interface SchoolMasteryDefinition {
  readonly schoolCode: string;
  readonly title: string;
  readonly minorMilestones: readonly SchoolMasteryMinorMilestoneDefinition[];
  readonly unlocks: readonly SchoolMasteryUnlockDefinition[];
}

const maxSchoolMasteryRank = 2;
export const firstMasteryRuneSlotFloorRank = 1;
export const firstMasteryRuneSlotFloorCount = 2;
const schoolMasteryThresholds = [0, 3, 7] as const;

const schoolMasteryDefinitions: readonly SchoolMasteryDefinition[] = [
  {
    schoolCode: 'ember',
    title: 'Мастерство Пламени',
    minorMilestones: [
      {
        threshold: 1,
        title: 'Первый жар',
        description: 'Первая победа с руной Пламени закрепляет путь давления и дожима.',
      },
      {
        threshold: 5,
        title: 'Связка давления',
        description: 'Пламя уже держит темп: продолжайте атаковать раскрытые окна и врагов ниже половины здоровья.',
      },
    ],
    unlocks: [
      {
        rank: 1,
        title: 'Разогрев дожима',
        description: 'После «Импульса углей» базовая атака ещё сильнее добивает врага ниже половины здоровья.',
      },
      {
        rank: 2,
        title: 'Печать давления',
        description: 'Редкая печать Пламени закрепляет давление: базовая атака получает малый бонус печати в каждом бою.',
      },
    ],
  },
  {
    schoolCode: 'stone',
    title: 'Мастерство Тверди',
    minorMilestones: [
      {
        threshold: 1,
        title: 'Первый устой',
        description: 'Первая победа с руной Тверди закрепляет путь стойки и спокойного ответа.',
      },
      {
        threshold: 5,
        title: 'Верная опора',
        description: 'Твердь уже держит линию: читайте тяжёлые удары и отвечайте из защиты.',
      },
    ],
    unlocks: [
      {
        rank: 1,
        title: 'Ответ стойки',
        description: 'Если вы уже держите щит, «Каменный отпор» бьёт сильнее и крепче держит стойку.',
      },
      {
        rank: 2,
        title: 'Печать опоры',
        description: 'Редкая печать Тверди закрепляет стойку: защита получает малую силу печати к щиту.',
      },
    ],
  },
  {
    schoolCode: 'gale',
    title: 'Мастерство Бури',
    minorMilestones: [
      {
        threshold: 1,
        title: 'Первый порыв',
        description: 'Первая победа с руной Бури закрепляет путь темпа и быстрого ответа.',
      },
      {
        threshold: 5,
        title: 'Связка шквала',
        description: 'Буря уже держит первый порыв: чередуйте давление, руну и осторожный следующий ход.',
      },
    ],
    unlocks: [
      {
        rank: 1,
        title: 'Шаг на темпе',
        description: 'Атака начинает готовить ответный темп и чуть лучше переживает следующий ход.',
      },
      {
        rank: 2,
        title: 'Печать шквала',
        description: 'Редкая печать Бури закрепляет темп: «Шаг шквала» лучше прикрывает следующий ответ.',
      },
    ],
  },
  {
    schoolCode: 'echo',
    title: 'Мастерство Прорицания',
    minorMilestones: [
      {
        threshold: 1,
        title: 'Первый знак',
        description: 'Первая победа с руной Прорицания закрепляет путь чтения угрозы.',
      },
      {
        threshold: 5,
        title: 'Верная примета',
        description: 'Прорицание уже увереннее читает бой: раскрытая угроза становится главным окном ответа.',
      },
    ],
    unlocks: [
      {
        rank: 1,
        title: 'Чтение угрозы',
        description: 'Открытое намерение врага становится ещё выгоднее для наказания базовой атакой.',
      },
      {
        rank: 2,
        title: 'Печать предзнаменования',
        description: 'Редкая печать Прорицания закрепляет чтение боя: раскрытая угроза даёт малую силу печати к точному ответу.',
      },
    ],
  },
];

export const listSchoolMasteryDefinitions = (): readonly SchoolMasteryDefinition[] => schoolMasteryDefinitions;

export const getSchoolMasteryDefinition = (schoolCode: string | null | undefined): SchoolMasteryDefinition | null => (
  schoolMasteryDefinitions.find((entry) => entry.schoolCode === schoolCode) ?? null
);

const mapUnlockToMilestone = (unlock: SchoolMasteryUnlockDefinition): SchoolMasteryMilestoneDefinition | null => {
  const threshold = schoolMasteryThresholds[unlock.rank];
  if (typeof threshold !== 'number') {
    return null;
  }

  return {
    threshold,
    title: unlock.title,
    description: unlock.description,
    kind: 'rank_unlock',
  };
};

export const listSchoolMasteryMilestones = (
  schoolCode: string | null | undefined,
): readonly SchoolMasteryMilestoneDefinition[] => {
  const definition = getSchoolMasteryDefinition(schoolCode);
  if (!definition) {
    return [];
  }

  return [
    ...definition.minorMilestones.map((milestone): SchoolMasteryMilestoneDefinition => ({
      ...milestone,
      kind: 'milestone',
    })),
    ...definition.unlocks
      .map(mapUnlockToMilestone)
      .filter((milestone): milestone is SchoolMasteryMilestoneDefinition => milestone !== null),
  ].sort((left, right) => left.threshold - right.threshold);
};

export const resolveNextSchoolMasteryMilestone = (
  mastery: Pick<SchoolMasteryView, 'schoolCode' | 'experience'> | null | undefined,
): SchoolMasteryMilestoneDefinition | null => {
  if (!mastery) {
    return null;
  }

  return listSchoolMasteryMilestones(mastery.schoolCode)
    .find((milestone) => mastery.experience < milestone.threshold) ?? null;
};

export const resolveCurrentSchoolMasteryMilestone = (
  mastery: Pick<SchoolMasteryView, 'schoolCode' | 'experience'> | null | undefined,
): SchoolMasteryMilestoneDefinition | null => {
  if (!mastery) {
    return null;
  }

  return [...listSchoolMasteryMilestones(mastery.schoolCode)]
    .reverse()
    .find((milestone) => mastery.experience >= milestone.threshold) ?? null;
};

export const listSchoolMasteryMilestoneStates = (
  mastery: Pick<SchoolMasteryView, 'schoolCode' | 'experience'> | null | undefined,
): readonly SchoolMasteryMilestoneState[] => {
  if (!mastery) {
    return [];
  }

  const nextMilestone = resolveNextSchoolMasteryMilestone(mastery);

  return listSchoolMasteryMilestones(mastery.schoolCode).map((milestone): SchoolMasteryMilestoneState => {
    if (mastery.experience >= milestone.threshold) {
      return { ...milestone, status: 'unlocked' };
    }

    return {
      ...milestone,
      status: nextMilestone?.threshold === milestone.threshold ? 'next' : 'locked',
    };
  });
};

export const resolveSchoolMasteryRank = (experience: number): number => {
  let resolvedRank = 0;

  for (let rank = 1; rank <= maxSchoolMasteryRank; rank += 1) {
    const threshold = schoolMasteryThresholds[rank];
    if (typeof threshold !== 'number' || experience < threshold) {
      break;
    }

    resolvedRank = rank;
  }

  return resolvedRank;
};

export const resolveNextSchoolMasteryThreshold = (rank: number): number | null => {
  if (rank >= maxSchoolMasteryRank) {
    return null;
  }

  return schoolMasteryThresholds[rank + 1] ?? null;
};

export const createSchoolMasteryView = (schoolCode: string, experience = 0): SchoolMasteryView => ({
  schoolCode,
  experience,
  rank: resolveSchoolMasteryRank(experience),
});

export const listPlayerSchoolMasteries = (player: Pick<PlayerState, 'schoolMasteries'>): readonly SchoolMasteryView[] => (
  player.schoolMasteries ?? []
);

export const getPlayerSchoolMastery = (
  player: Pick<PlayerState, 'schoolMasteries'>,
  schoolCode: string | null | undefined,
): SchoolMasteryView | null => {
  if (!schoolCode) {
    return null;
  }

  return listPlayerSchoolMasteries(player).find((entry) => entry.schoolCode === schoolCode) ?? createSchoolMasteryView(schoolCode);
};

export const getPlayerSchoolMasteryForArchetype = (
  player: Pick<PlayerState, 'schoolMasteries'>,
  archetypeCode: string | null | undefined,
): SchoolMasteryView | null => {
  const school = getSchoolDefinitionForArchetype(archetypeCode);
  return getPlayerSchoolMastery(player, school?.code);
};

export const resolveSchoolMasteryRewardGain = (player: Pick<PlayerState, 'runes'>): { schoolCode: string; experienceGain: number } | null => {
  const equippedRune = player.runes.find((rune) => rune.equippedSlot === 0 || (rune.equippedSlot === undefined && rune.isEquipped)) ?? null;
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  if (!equippedRune || !school) {
    return null;
  }

  return {
    schoolCode: school.code,
    experienceGain: 1,
  };
};

export const resolveBattleSchoolMasteryRewardGain = (
  battle: Pick<BattleView, 'result' | 'player'>,
): { schoolCode: string; experienceGain: number } | null => {
  if (battle.result !== 'VICTORY') {
    return null;
  }

  const schoolCode = battle.player.runeLoadout?.schoolCode
    ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
    ?? null;
  if (!schoolCode) {
    return null;
  }

  return {
    schoolCode,
    experienceGain: 1,
  };
};

export const applySchoolMasteryExperience = (
  current: SchoolMasteryView | null,
  schoolCode: string,
  experienceGain: number,
): SchoolMasteryView => {
  const nextExperience = Math.max(0, (current?.experience ?? 0) + experienceGain);
  return createSchoolMasteryView(schoolCode, nextExperience);
};

export const listMissingStarterSchoolMasteries = (player: Pick<PlayerState, 'schoolMasteries'>): readonly SchoolMasteryView[] => {
  const existing = new Set(listPlayerSchoolMasteries(player).map((entry) => entry.schoolCode));
  return listSchoolDefinitions()
    .filter((school) => !existing.has(school.code))
    .map((school) => createSchoolMasteryView(school.code));
};

export const resolveUnlockedRuneSlotCountFromSchoolMasteries = (
  player: Pick<PlayerState, 'schoolMasteries'>,
  currentUnlockedSlotCount = 1,
): number => {
  const reachedFirstMasteryFloor = listPlayerSchoolMasteries(player).some((mastery) => mastery.rank >= firstMasteryRuneSlotFloorRank);
  return reachedFirstMasteryFloor
    ? Math.max(currentUnlockedSlotCount, firstMasteryRuneSlotFloorCount)
    : currentUnlockedSlotCount;
};
