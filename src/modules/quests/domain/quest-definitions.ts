import type {
  InventoryField,
  InventoryView,
  PlayerState,
  PlayerSkillCode,
  ResourceReward,
} from '../../../shared/types/game';
import { gameBalance } from '../../../config/game-balance';
import { getEquippedRunes } from '../../player/domain/player-stats';

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
  | 'craft_after_battle';

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
    },
    progress: (player) => clampProgress(highestGatheringSkillExperience(player), 1),
  },
];

export const listQuestDefinitions = (): readonly QuestDefinition[] => questDefinitions;

export const findQuestDefinition = (code: string): QuestDefinition | null => (
  questDefinitions.find((quest) => quest.code === code) ?? null
);
