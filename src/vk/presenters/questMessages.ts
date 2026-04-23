import type { ClaimQuestRewardView } from '../../modules/quests/application/use-cases/ClaimQuestReward';
import type {
  QuestBookView,
  QuestView,
} from '../../modules/quests/application/read-models/quest-book';
import { formatResourceReward } from './message-formatting';

type RussianPluralForms = readonly [one: string, few: string, many: string];
type QuestChapterCode =
  | 'first_circle'
  | 'first_name'
  | 'dark_forest'
  | 'ember_school'
  | 'stone_school'
  | 'gale_school'
  | 'echo_school';

interface QuestChapterCopy {
  readonly title: string;
  readonly order: number;
}

interface QuestChapterGroup {
  readonly chapter: QuestChapterCopy;
  readonly quests: readonly QuestView[];
}

const questStatusLabels: Readonly<Record<QuestView['status'], string>> = {
  READY_TO_CLAIM: '🎁 Награда ждёт',
  IN_PROGRESS: '🌒 В пути',
  CLAIMED: '✅ Закрыто',
};

const claimedPreviewLimitPerChapter = 3;

const questChapters: Readonly<Record<QuestChapterCode, QuestChapterCopy>> = {
  first_circle: { title: 'Первый круг', order: 0 },
  first_name: { title: 'Первое имя', order: 1 },
  dark_forest: { title: 'Тёмный лес', order: 2 },
  ember_school: { title: 'Школа Пламени', order: 3 },
  stone_school: { title: 'Школа Тверди', order: 4 },
  gale_school: { title: 'Школа Бури', order: 5 },
  echo_school: { title: 'Школа Прорицания', order: 6 },
};

const questChapterByCode: Readonly<Record<QuestView['code'], QuestChapterCode>> = {
  awakening_empty_master: 'first_circle',
  first_sign: 'first_circle',
  voice_of_school: 'first_circle',
  two_sockets: 'first_circle',
  trophy_hand: 'first_circle',
  name_on_threshold: 'first_name',
  trail_beyond_circle: 'first_name',
  second_rune_silence: 'first_name',
  first_pattern: 'first_name',
  craft_after_battle: 'first_name',
  forest_second_shadow: 'dark_forest',
  five_battle_marks: 'dark_forest',
  deep_forest_campfire: 'dark_forest',
  forgotten_cave_mouth: 'dark_forest',
  ember_finishing_spark: 'ember_school',
  ember_light_fear: 'ember_school',
  ember_ash_seal: 'ember_school',
  stone_standing_ground: 'stone_school',
  stone_answer: 'stone_school',
  stone_wall_seal: 'stone_school',
  gale_before_thunder: 'gale_school',
  gale_wind_intercept: 'gale_school',
  gale_dash_seal: 'gale_school',
  echo_future_crack: 'echo_school',
  echo_unmade_strike: 'echo_school',
  echo_warning_seal: 'echo_school',
};

const selectRussianPluralForm = (count: number, forms: RussianPluralForms): string => {
  const absoluteCount = Math.abs(count);
  const remainder100 = absoluteCount % 100;

  if (remainder100 >= 11 && remainder100 <= 14) {
    return forms[2];
  }

  const remainder10 = absoluteCount % 10;

  if (remainder10 === 1) {
    return forms[0];
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return forms[1];
  }

  return forms[2];
};

const formatCountPhrase = (count: number, forms: RussianPluralForms): string => (
  `${count} ${selectRussianPluralForm(count, forms)}`
);

const renderQuestBookSummary = (book: QuestBookView): string => [
  formatCountPhrase(book.readyToClaimCount, [
    'запись ждёт награду',
    'записи ждут награду',
    'записей ждут награду',
  ]),
  formatCountPhrase(book.inProgressCount, [
    'след ещё тянется',
    'следа ещё тянутся',
    'следов ещё тянутся',
  ]),
  formatCountPhrase(book.claimedCount, [
    'запись уже закрыта',
    'записи уже закрыты',
    'записей уже закрыто',
  ]),
].join(' · ');

const renderQuestProgress = (quest: QuestView): string => {
  if (quest.status === 'CLAIMED') {
    return 'Запись закрыта.';
  }

  if (quest.status === 'READY_TO_CLAIM') {
    return 'Шаг завершён. Награда ждёт в книге.';
  }

  return `Отметка пути: ${quest.progress.current}/${quest.progress.required}.`;
};

const getQuestChapter = (quest: QuestView): QuestChapterCopy => (
  questChapters[questChapterByCode[quest.code]]
);

const createQuestOrderLookup = (quests: readonly QuestView[]): ReadonlyMap<QuestView['code'], number> => (
  new Map(quests.map((quest, index) => [quest.code, index]))
);

const compareQuestsByBookOrder = (
  orderLookup: ReadonlyMap<QuestView['code'], number>,
  left: QuestView,
  right: QuestView,
): number => (
  (orderLookup.get(left.code) ?? 0) - (orderLookup.get(right.code) ?? 0)
);

const groupQuestsByChapter = (
  quests: readonly QuestView[],
  orderLookup: ReadonlyMap<QuestView['code'], number>,
): readonly QuestChapterGroup[] => {
  const questsByChapter = quests.reduce<Map<QuestChapterCode, QuestView[]>>((groups, quest) => {
    const chapterCode = questChapterByCode[quest.code];
    const group = groups.get(chapterCode) ?? [];
    group.push(quest);
    groups.set(chapterCode, group);
    return groups;
  }, new Map());

  return [...questsByChapter.entries()]
    .map(([chapterCode, chapterQuests]) => ({
      chapter: questChapters[chapterCode],
      quests: [...chapterQuests].sort((left, right) => compareQuestsByBookOrder(orderLookup, left, right)),
    }))
    .sort((left, right) => left.chapter.order - right.chapter.order);
};

const renderReadyQuest = (quest: QuestView): string => (
  `• ${quest.icon} ${quest.title} · ${questStatusLabels.READY_TO_CLAIM} · ${formatResourceReward(quest.reward)}`
);

const renderReadyGroup = (group: QuestChapterGroup): string => [
  `Глава: ${group.chapter.title}`,
  ...group.quests.map(renderReadyQuest),
].join('\n');

const getQuestProgressRatio = (quest: QuestView): number => {
  if (quest.progress.required <= 0) {
    return 1;
  }

  return quest.progress.current / quest.progress.required;
};

const findNearestInProgressQuest = (
  quests: readonly QuestView[],
  orderLookup: ReadonlyMap<QuestView['code'], number>,
): QuestView | null => {
  const inProgressQuests = quests.filter((quest) => quest.status === 'IN_PROGRESS');
  if (inProgressQuests.length === 0) {
    return null;
  }

  return [...inProgressQuests].sort((left, right) => {
    const progressDifference = getQuestProgressRatio(right) - getQuestProgressRatio(left);
    if (Math.abs(progressDifference) > Number.EPSILON) {
      return progressDifference;
    }

    return compareQuestsByBookOrder(orderLookup, left, right);
  })[0] ?? null;
};

const renderNearestQuest = (quest: QuestView): string => [
  `Глава: ${getQuestChapter(quest).title}`,
  `${quest.icon} ${quest.title} · ${questStatusLabels.IN_PROGRESS}`,
  `След: ${quest.objective}`,
  renderQuestProgress(quest),
  `Награда: ${formatResourceReward(quest.reward)}.`,
].join('\n');

const renderClaimedGroup = (group: QuestChapterGroup): string => {
  const visibleQuests = group.quests.slice(0, claimedPreviewLimitPerChapter);
  const hiddenCount = group.quests.length - visibleQuests.length;
  const visibleTitles = visibleQuests.map((quest) => `${quest.icon} ${quest.title}`).join(', ');
  const hiddenLine = hiddenCount > 0
    ? `, ещё ${formatCountPhrase(hiddenCount, ['запись', 'записи', 'записей'])}`
    : '';

  return `${group.chapter.title}: ${visibleTitles}${hiddenLine}.`;
};

const renderReadySection = (
  book: QuestBookView,
  orderLookup: ReadonlyMap<QuestView['code'], number>,
): readonly string[] => {
  const readyQuests = book.quests.filter((quest) => quest.status === 'READY_TO_CLAIM');
  if (readyQuests.length === 0) {
    return [];
  }

  return [
    '🎁 Готово',
    ...groupQuestsByChapter(readyQuests, orderLookup).map(renderReadyGroup),
  ];
};

const renderNearestSection = (
  book: QuestBookView,
  orderLookup: ReadonlyMap<QuestView['code'], number>,
): readonly string[] => {
  const nearestQuest = findNearestInProgressQuest(book.quests, orderLookup);
  if (!nearestQuest) {
    return [];
  }

  return [
    '🌒 Ближайший след',
    renderNearestQuest(nearestQuest),
  ];
};

const renderClaimedSection = (
  book: QuestBookView,
  orderLookup: ReadonlyMap<QuestView['code'], number>,
): readonly string[] => {
  const claimedQuests = book.quests.filter((quest) => quest.status === 'CLAIMED');
  if (claimedQuests.length === 0) {
    return [];
  }

  return [
    '✅ Закрыто',
    ...groupQuestsByChapter(claimedQuests, orderLookup).map(renderClaimedGroup),
  ];
};

const renderQuestBookSections = (book: QuestBookView): readonly string[] => {
  const orderLookup = createQuestOrderLookup(book.quests);

  return [
    ...renderReadySection(book, orderLookup),
    ...renderNearestSection(book, orderLookup),
    ...renderClaimedSection(book, orderLookup),
  ];
};

export const renderQuestBook = (book: QuestBookView): string => [
  '📜 Книга путей',
  'Руны помнят не обещания, а завершённые шаги.',
  `В книге: ${renderQuestBookSummary(book)}.`,
  ...renderQuestBookSections(book),
].join('\n\n');

export const renderQuestClaimResult = (result: ClaimQuestRewardView): string => {
  const header = result.claimedNow ? '📜 Запись закрыта' : '📜 Запись уже закрыта';
  const rewardLine = result.claimedNow
    ? `В сумке: ${formatResourceReward(result.quest.reward)}.`
    : 'Новая добыча не добавлялась: эта награда уже была забрана.';

  return [
    header,
    '',
    `${result.quest.title} больше не просто событие. Теперь это часть твоей летописи.`,
    rewardLine,
    '',
    renderQuestBook(result.book),
  ].join('\n');
};
