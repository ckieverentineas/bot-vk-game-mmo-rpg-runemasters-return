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

export interface QuestBookPageView {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly totalQuests: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly quests: readonly QuestView[];
}

const questStatusLabels: Readonly<Record<QuestView['status'], string>> = {
  READY_TO_CLAIM: '🎁 Награда не собрана',
  IN_PROGRESS: '🌒 В пути',
  CLAIMED: '✅ Закрыто',
};

export const questBookPageSize = 5;

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

export const getQuestBookTotalPages = (book: QuestBookView): number => (
  Math.max(1, Math.ceil(book.quests.length / questBookPageSize))
);

export const normalizeQuestBookPageNumber = (
  book: QuestBookView,
  pageNumber: number,
): number => {
  const totalPages = getQuestBookTotalPages(book);
  if (!Number.isFinite(pageNumber)) {
    return 1;
  }

  return Math.min(totalPages, Math.max(1, Math.floor(pageNumber)));
};

export const getQuestBookPageView = (
  book: QuestBookView,
  pageNumber = 1,
): QuestBookPageView => {
  const normalizedPageNumber = normalizeQuestBookPageNumber(book, pageNumber);
  const startIndex = (normalizedPageNumber - 1) * questBookPageSize;
  const quests = book.quests.slice(startIndex, startIndex + questBookPageSize);

  return {
    pageNumber: normalizedPageNumber,
    totalPages: getQuestBookTotalPages(book),
    totalQuests: book.quests.length,
    startIndex,
    endIndex: startIndex + quests.length,
    quests,
  };
};

const renderQuestStatusLine = (quest: QuestView): string => {
  if (quest.status === 'READY_TO_CLAIM') {
    return `${questStatusLabels.READY_TO_CLAIM} · ${formatResourceReward(quest.reward)}`;
  }

  if (quest.status === 'CLAIMED') {
    return questStatusLabels.CLAIMED;
  }

  return `${questStatusLabels.IN_PROGRESS} · ${quest.progress.current}/${quest.progress.required} · ${quest.objective}`;
};

const renderQuestLine = (quest: QuestView, absoluteIndex: number): string => (
  `${absoluteIndex + 1}. ${quest.icon} ${quest.title}\n   ${renderQuestStatusLine(quest)}`
);

const renderQuestPageGroup = (group: QuestChapterGroup, page: QuestBookPageView): string => [
  `Глава: ${group.chapter.title}`,
  ...group.quests.map((quest) => renderQuestLine(quest, page.startIndex + page.quests.indexOf(quest))),
].join('\n');

const renderQuestBookPageSections = (book: QuestBookView, page: QuestBookPageView): readonly string[] => {
  const orderLookup = createQuestOrderLookup(book.quests);

  return groupQuestsByChapter(page.quests, orderLookup).map((group) => renderQuestPageGroup(group, page));
};

export const renderQuestBook = (book: QuestBookView, pageNumber = 1): string => {
  const page = getQuestBookPageView(book, pageNumber);
  const pageRange = page.totalQuests > 0
    ? `записи ${page.startIndex + 1}-${page.endIndex} из ${page.totalQuests}`
    : 'записей пока нет';

  return [
    '📜 Книга путей',
    'Руны помнят не обещания, а завершённые шаги.',
    `В книге: ${renderQuestBookSummary(book)}.`,
    `Страница ${page.pageNumber} из ${page.totalPages} · ${pageRange}.`,
    '🎁 — награда не собрана.',
    ...renderQuestBookPageSections(book, page),
  ].join('\n\n');
};

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
