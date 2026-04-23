import type { BattleView, PlayerState, SchoolMasteryView } from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype, listSchoolDefinitions } from '../../runes/domain/rune-schools';

export interface SchoolMasteryUnlockDefinition {
  readonly rank: number;
  readonly title: string;
  readonly description: string;
}

export interface SchoolMasteryDefinition {
  readonly schoolCode: string;
  readonly title: string;
  readonly unlocks: readonly SchoolMasteryUnlockDefinition[];
}

const maxSchoolMasteryRank = 2;
export const firstMasteryRuneSlotFloorRank = 1;
export const firstMasteryRuneSlotFloorCount = 2;

const schoolMasteryDefinitions: readonly SchoolMasteryDefinition[] = [
  {
    schoolCode: 'ember',
    title: 'Мастерство Пламени',
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
    unlocks: [
      {
        rank: 1,
        title: 'Ответ стойки',
        description: 'Если вы уже держите guard, «Каменный отпор» бьёт сильнее и крепче держит стойку.',
      },
      {
        rank: 2,
        title: 'Печать опоры',
        description: 'Редкая печать Тверди закрепляет стойку: защита получает малый бонус печати к guard.',
      },
    ],
  },
  {
    schoolCode: 'gale',
    title: 'Мастерство Бури',
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
    unlocks: [
      {
        rank: 1,
        title: 'Чтение угрозы',
        description: 'Открытое намерение врага становится ещё выгоднее для наказания базовой атакой.',
      },
      {
        rank: 2,
        title: 'Печать предзнаменования',
        description: 'Редкая печать Прорицания закрепляет чтение боя: раскрытый intent даёт малый бонус печати к точному ответу.',
      },
    ],
  },
];

const schoolMasteryThresholds = [0, 3, 7] as const;

export const listSchoolMasteryDefinitions = (): readonly SchoolMasteryDefinition[] => schoolMasteryDefinitions;

export const getSchoolMasteryDefinition = (schoolCode: string | null | undefined): SchoolMasteryDefinition | null => (
  schoolMasteryDefinitions.find((entry) => entry.schoolCode === schoolCode) ?? null
);

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
