import type {
  InventoryField,
  InventoryView,
  PlayerState,
  PlayerSkillCode,
  ResourceReward,
} from '../../../shared/types/game';
import { gameBalance } from '../../../config/game-balance';
import { getEquippedRunes } from '../../player/domain/player-stats';
import { hasRuneOfSchoolAtLeastRarity } from '../../player/domain/school-novice-path';

export type QuestCode =
  | 'awakening_empty_master'
  | 'first_sign'
  | 'voice_of_school'
  | 'two_sockets'
  | 'trophy_hand'
  | 'name_on_threshold'
  | 'trail_beyond_circle'
  | 'second_rune_silence'
  | 'first_pattern'
  | 'craft_after_battle'
  | 'forest_second_shadow'
  | 'five_battle_marks'
  | 'deep_forest_campfire'
  | 'forgotten_cave_mouth'
  | 'ember_finishing_spark'
  | 'ember_light_fear'
  | 'ember_ash_seal'
  | 'stone_standing_ground'
  | 'stone_answer'
  | 'stone_wall_seal'
  | 'gale_before_thunder'
  | 'gale_wind_intercept'
  | 'gale_dash_seal'
  | 'echo_future_crack'
  | 'echo_unmade_strike'
  | 'echo_warning_seal';

export interface QuestProgress {
  readonly current: number;
  readonly required: number;
}

export interface QuestDefinition {
  readonly code: QuestCode;
  readonly icon: string;
  readonly title: string;
  readonly story: string;
  readonly objective: string;
  readonly reward: ResourceReward;
  readonly progress: (player: PlayerState) => QuestProgress;
}

type StarterSchoolCode = 'ember' | 'stone' | 'gale' | 'echo';
type SchoolQuestProgressKind = 'first_school_victory' | 'school_mastery_rank' | 'school_seal';

interface SchoolQuestTemplate {
  readonly code: QuestCode;
  readonly icon: string;
  readonly title: string;
  readonly story: string;
  readonly objective: string;
  readonly reward: ResourceReward;
  readonly progressKind: SchoolQuestProgressKind;
}

interface SchoolQuestChapter {
  readonly schoolCode: StarterSchoolCode;
  readonly quests: readonly SchoolQuestTemplate[];
}

const materialFields = [
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
] satisfies readonly InventoryField[];

const gatheringSkillCodes = [
  'gathering.skinning',
  'gathering.reagent_gathering',
  'gathering.essence_extraction',
] satisfies readonly PlayerSkillCode[];

const worldTrailMilestones = {
  forestSecondShadow: 3,
  fiveBattleMarks: 5,
  deepForestCampfire: 10,
  forgottenCaveMouth: 16,
} as const;

const isGatheringSkillCode = (skillCode: PlayerSkillCode): boolean => (
  (gatheringSkillCodes as readonly PlayerSkillCode[]).includes(skillCode)
);

const clampProgress = (current: number, required: number): QuestProgress => ({
  current: Math.min(Math.max(0, current), required),
  required,
});

const countMaterials = (inventory: InventoryView): number => (
  materialFields.reduce((sum, field) => sum + inventory[field], 0)
);

const highestSchoolMasteryExperience = (player: PlayerState): number => (
  Math.max(0, ...(player.schoolMasteries ?? []).map((mastery) => mastery.experience))
);

const getSchoolMasteryExperience = (
  player: PlayerState,
  schoolCode: StarterSchoolCode,
): number => (
  player.schoolMasteries?.find((mastery) => mastery.schoolCode === schoolCode)?.experience ?? 0
);

const hasOpenedAdventure = (player: PlayerState): boolean => (
  player.tutorialState !== 'ACTIVE'
  && player.locationLevel >= gameBalance.world.minAdventureLocationLevel
);

const hasVictoryBeyondTutorialCircle = (player: PlayerState): boolean => (
  player.highestLocationLevel >= gameBalance.world.minAdventureLocationLevel
);

const highestGatheringSkillExperience = (player: PlayerState): number => (
  Math.max(
    0,
    ...(player.skills ?? [])
      .filter((skill) => isGatheringSkillCode(skill.skillCode))
      .map((skill) => skill.experience),
  )
);

const highestLocationProgress = (player: PlayerState, required: number): QuestProgress => (
  clampProgress(player.highestLocationLevel, required)
);

const mobsKilledProgress = (player: PlayerState, required: number): QuestProgress => (
  clampProgress(player.mobsKilled, required)
);

const resolveSchoolQuestProgress = (
  player: PlayerState,
  schoolCode: StarterSchoolCode,
  kind: SchoolQuestProgressKind,
): QuestProgress => {
  const masteryExperience = getSchoolMasteryExperience(player, schoolCode);

  if (kind === 'first_school_victory') {
    return clampProgress(masteryExperience, 1);
  }

  if (kind === 'school_mastery_rank') {
    return clampProgress(masteryExperience, 3);
  }

  return clampProgress(hasRuneOfSchoolAtLeastRarity(player, schoolCode, 'UNUSUAL') ? 1 : 0, 1);
};

const createSchoolQuestDefinitions = (
  chapters: readonly SchoolQuestChapter[],
): readonly QuestDefinition[] => chapters.flatMap((chapter) => (
  chapter.quests.map((quest): QuestDefinition => ({
    code: quest.code,
    icon: quest.icon,
    title: quest.title,
    story: quest.story,
    objective: quest.objective,
    reward: quest.reward,
    progress: (player) => resolveSchoolQuestProgress(player, chapter.schoolCode, quest.progressKind),
  }))
));

const schoolQuestChapters: readonly SchoolQuestChapter[] = [
  {
    schoolCode: 'ember',
    quests: [
      {
        code: 'ember_finishing_spark',
        icon: '🔥',
        title: 'Искра дожима',
        story: 'Пламя узнаёт мастера по тому, как он доводит бой до последнего вздоха жара.',
        objective: 'Победить с руной Пламени.',
        reward: {
          gold: 12,
          inventoryDelta: { essence: 1 },
        },
        progressKind: 'first_school_victory',
      },
      {
        code: 'ember_light_fear',
        icon: '🌞',
        title: 'То, что боится света',
        story: 'Чем ярче школа отвечает, тем меньше теней остаётся у врага.',
        objective: 'Набрать 3 опыта мастерства Пламени.',
        reward: {
          gold: 16,
          inventoryDelta: { usualShards: 3 },
        },
        progressKind: 'school_mastery_rank',
      },
      {
        code: 'ember_ash_seal',
        icon: '🜂',
        title: 'Пепельная печать',
        story: 'В пепле остаётся знак: Пламя признало первый настоящий узор.',
        objective: 'Получить необычную или более редкую руну Пламени.',
        reward: {
          gold: 18,
          inventoryDelta: { unusualShards: 1, essence: 1 },
        },
        progressKind: 'school_seal',
      },
    ],
  },
  {
    schoolCode: 'stone',
    quests: [
      {
        code: 'stone_standing_ground',
        icon: '🛡️',
        title: 'Пока я стою',
        story: 'Твердь отвечает тому, кто не отступает, даже когда земля дрожит под ногами.',
        objective: 'Победить с руной Тверди.',
        reward: {
          gold: 12,
          inventoryDelta: { metal: 1 },
        },
        progressKind: 'first_school_victory',
      },
      {
        code: 'stone_answer',
        icon: '🪨',
        title: 'Ответ камня',
        story: 'Камень не торопится. Он помнит каждый удар и возвращает его формой.',
        objective: 'Набрать 3 опыта мастерства Тверди.',
        reward: {
          gold: 16,
          inventoryDelta: { usualShards: 3 },
        },
        progressKind: 'school_mastery_rank',
      },
      {
        code: 'stone_wall_seal',
        icon: '🧱',
        title: 'Печать стены',
        story: 'Первая стена встаёт не вокруг мастера, а вместе с ним.',
        objective: 'Получить необычную или более редкую руну Тверди.',
        reward: {
          gold: 18,
          inventoryDelta: { unusualShards: 1, metal: 1 },
        },
        progressKind: 'school_seal',
      },
    ],
  },
  {
    schoolCode: 'gale',
    quests: [
      {
        code: 'gale_before_thunder',
        icon: '🌪️',
        title: 'До грома',
        story: 'Буря ценит шаг, сделанный раньше звука удара.',
        objective: 'Победить с руной Бури.',
        reward: {
          gold: 12,
          inventoryDelta: { crystal: 1 },
        },
        progressKind: 'first_school_victory',
      },
      {
        code: 'gale_wind_intercept',
        icon: '💨',
        title: 'Перехват ветра',
        story: 'Ветер уже не просто несёт мастера: он начинает слушать направление руки.',
        objective: 'Набрать 3 опыта мастерства Бури.',
        reward: {
          gold: 16,
          inventoryDelta: { usualShards: 3 },
        },
        progressKind: 'school_mastery_rank',
      },
      {
        code: 'gale_dash_seal',
        icon: '⚡',
        title: 'Печать рывка',
        story: 'Первый рывок оставляет в воздухе знак, который не успевает рассыпаться.',
        objective: 'Получить необычную или более редкую руну Бури.',
        reward: {
          gold: 18,
          inventoryDelta: { unusualShards: 1, crystal: 1 },
        },
        progressKind: 'school_seal',
      },
    ],
  },
  {
    schoolCode: 'echo',
    quests: [
      {
        code: 'echo_future_crack',
        icon: '🔮',
        title: 'Трещина в будущем',
        story: 'Прорицание начинается с тонкой трещины там, где удар ещё не случился.',
        objective: 'Победить с руной Прорицания.',
        reward: {
          gold: 12,
          inventoryDelta: { herb: 1 },
        },
        progressKind: 'first_school_victory',
      },
      {
        code: 'echo_unmade_strike',
        icon: '👁️',
        title: 'Удар, которого ещё нет',
        story: 'Мастер видит не только врага, но и место, где его решение станет ошибкой.',
        objective: 'Набрать 3 опыта мастерства Прорицания.',
        reward: {
          gold: 16,
          inventoryDelta: { usualShards: 3 },
        },
        progressKind: 'school_mastery_rank',
      },
      {
        code: 'echo_warning_seal',
        icon: '🜁',
        title: 'Печать предупреждения',
        story: 'Предзнаменование становится печатью, когда мастер впервые отвечает ему выбором.',
        objective: 'Получить необычную или более редкую руну Прорицания.',
        reward: {
          gold: 18,
          inventoryDelta: { unusualShards: 1, herb: 1 },
        },
        progressKind: 'school_seal',
      },
    ],
  },
];

const schoolQuestDefinitions = createSchoolQuestDefinitions(schoolQuestChapters);

const questDefinitions: readonly QuestDefinition[] = [
  {
    code: 'awakening_empty_master',
    icon: '🌑',
    title: 'Пробуждение Пустого мастера',
    story: 'Мир ещё не знает твоего имени, но первый бой заставляет землю запомнить шаг.',
    objective: 'Выстоять в первой схватке.',
    reward: {
      gold: 5,
      inventoryDelta: { usualShards: 1 },
    },
    progress: (player) => clampProgress(player.victories, 1),
  },
  {
    code: 'first_sign',
    icon: '🔮',
    title: 'Первый знак',
    story: 'Руна не вещь в сумке. Она должна лечь в гнездо и ответить мастеру.',
    objective: 'Надеть любую руну.',
    reward: {
      gold: 8,
      inventoryDelta: { herb: 1 },
    },
    progress: (player) => clampProgress(getEquippedRunes(player).length, 1),
  },
  {
    code: 'voice_of_school',
    icon: '🜁',
    title: 'Голос школы',
    story: 'Пламя, Твердь, Буря или Прорицание становятся не названием, а стилем боя.',
    objective: 'Победить с боевой руной и получить первый опыт школы.',
    reward: {
      gold: 10,
      inventoryDelta: { usualShards: 1, essence: 1 },
    },
    progress: (player) => clampProgress(highestSchoolMasteryExperience(player), 1),
  },
  {
    code: 'two_sockets',
    icon: '🧩',
    title: 'Два гнезда',
    story: 'Один знак говорит. Два знака уже спорят, складывая первый круг сборки.',
    objective: 'Надеть две руны.',
    reward: {
      gold: 12,
      inventoryDelta: { unusualShards: 1 },
    },
    progress: (player) => clampProgress(getEquippedRunes(player).length, 2),
  },
  {
    code: 'trophy_hand',
    icon: '🎒',
    title: 'Трофейная рука',
    story: 'После боя остаётся не мусор, а след врага. Хороший мастер умеет забрать пользу.',
    objective: 'Получить первый материал из трофея или находки.',
    reward: {
      gold: 6,
      inventoryDelta: { leather: 1, bone: 1 },
    },
    progress: (player) => clampProgress(countMaterials(player.inventory), 1),
  },
  {
    code: 'name_on_threshold',
    icon: '🚪',
    title: 'Имя на границе',
    story: 'Учебный круг остаётся позади. Мир впервые слышит не выжившего, а идущего.',
    objective: 'Выйти из Учебного круга на первую дорогу.',
    reward: {
      gold: 7,
      inventoryDelta: { herb: 1 },
    },
    progress: (player) => clampProgress(hasOpenedAdventure(player) ? 1 : 0, 1),
  },
  {
    code: 'trail_beyond_circle',
    icon: '👣',
    title: 'След за пределом круга',
    story: 'За чертой учебного света земля тяжелее, но каждый след здесь уже настоящий.',
    objective: 'Победить врага за пределом Учебного круга.',
    reward: {
      gold: 10,
      inventoryDelta: { usualShards: 2 },
    },
    progress: (player) => clampProgress(hasVictoryBeyondTutorialCircle(player) ? 1 : 0, 1),
  },
  {
    code: 'second_rune_silence',
    icon: '🌒',
    title: 'Молчание второй руны',
    story: 'Вторая руна не спорит с первой. Она ждёт, пока мастер сам услышит разницу.',
    objective: 'Получить вторую руну.',
    reward: {
      gold: 12,
      inventoryDelta: { essence: 1 },
    },
    progress: (player) => clampProgress(player.runes.length, 2),
  },
  {
    code: 'first_pattern',
    icon: '🧵',
    title: 'Первый узор',
    story: 'Два знака уже складываются не в шум, а в первый круг сборки.',
    objective: 'Надеть две руны.',
    reward: {
      gold: 14,
      inventoryDelta: { unusualShards: 1 },
    },
    progress: (player) => clampProgress(getEquippedRunes(player).length, 2),
  },
  {
    code: 'craft_after_battle',
    icon: '🛠️',
    title: 'Ремесло после боя',
    story: 'После схватки остаётся больше, чем пыль. Умелая рука видит форму в добыче.',
    objective: 'Обработать трофей после боя.',
    reward: {
      gold: 9,
      inventoryDelta: { leather: 1, bone: 1 },
      blueprintDelta: { skinning_kit: 1 },
    },
    progress: (player) => clampProgress(highestGatheringSkillExperience(player), 1),
  },
  {
    code: 'forest_second_shadow',
    icon: '🌲',
    title: 'Вторая тень леса',
    story: 'Тёмный лес перестаёт быть стеной: между стволами появляется направление.',
    objective: 'Дойти до 3-го следа Тёмного леса.',
    reward: {
      gold: 10,
      inventoryDelta: { herb: 1 },
    },
    progress: (player) => highestLocationProgress(player, worldTrailMilestones.forestSecondShadow),
  },
  {
    code: 'five_battle_marks',
    icon: '⚔️',
    title: 'Пять отметин дороги',
    story: 'Пять схваток уже не шум. Это карта, написанная пылью на сапогах.',
    objective: 'Победить 5 врагов на дороге.',
    reward: {
      gold: 12,
      inventoryDelta: { usualShards: 2 },
    },
    progress: (player) => mobsKilledProgress(player, worldTrailMilestones.fiveBattleMarks),
  },
  {
    code: 'deep_forest_campfire',
    icon: '🔥',
    title: 'Костёр среди чащи',
    story: 'Когда след уходит глубже, огонь перестаёт быть привалом и становится знаком возврата.',
    objective: 'Дойти до 10-го следа Тёмного леса.',
    reward: {
      gold: 16,
      inventoryDelta: { leather: 1, bone: 1 },
    },
    progress: (player) => highestLocationProgress(player, worldTrailMilestones.deepForestCampfire),
  },
  {
    code: 'forgotten_cave_mouth',
    icon: '🕳️',
    title: 'Устье забытых пещер',
    story: 'Лес отпускает мастера к камню. Внизу уже слышно, как мир меняет голос.',
    objective: 'Дойти до 16-го следа и открыть Забытые пещеры.',
    reward: {
      gold: 20,
      inventoryDelta: { unusualShards: 1, crystal: 1 },
    },
    progress: (player) => highestLocationProgress(player, worldTrailMilestones.forgottenCaveMouth),
  },
  ...schoolQuestDefinitions,
];

export const listQuestDefinitions = (): readonly QuestDefinition[] => questDefinitions;

export const findQuestDefinition = (code: string): QuestDefinition | null => (
  questDefinitions.find((quest) => quest.code === code) ?? null
);
