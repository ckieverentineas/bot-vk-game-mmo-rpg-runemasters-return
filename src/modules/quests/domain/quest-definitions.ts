import type {
  InventoryField,
  InventoryView,
  PlayerState,
  ResourceReward,
} from '../../../shared/types/game';
import { getEquippedRunes } from '../../player/domain/player-stats';

export type QuestCode =
  | 'awakening_empty_master'
  | 'first_sign'
  | 'voice_of_school'
  | 'two_sockets'
  | 'trophy_hand';

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
];

export const listQuestDefinitions = (): readonly QuestDefinition[] => questDefinitions;

export const findQuestDefinition = (code: string): QuestDefinition | null => (
  questDefinitions.find((quest) => quest.code === code) ?? null
);
