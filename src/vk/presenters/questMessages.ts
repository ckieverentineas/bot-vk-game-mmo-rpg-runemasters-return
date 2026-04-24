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

export type QuestBookPageSection = 'READY_REWARD' | 'NEAREST_GOAL' | 'IN_PROGRESS' | 'ARCHIVE';

export interface QuestBookPageQuestEntry {
  readonly quest: QuestView;
  readonly bookIndex: number;
  readonly displayIndex: number;
  readonly chapter: QuestChapterCopy;
  readonly section: QuestBookPageSection;
}

export interface QuestBookPageView {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly totalQuests: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly quests: readonly QuestView[];
  readonly entries: readonly QuestBookPageQuestEntry[];
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
  `🎁 ${book.readyToClaimCount}`,
  `🌒 ${book.inProgressCount}`,
  `✅ ${book.claimedCount}`,
].join(' · ');

const resolveQuestChapter = (quest: QuestView): QuestChapterCopy => (
  questChapters[questChapterByCode[quest.code]]
);

const findNearestQuestGoal = (quests: readonly QuestView[]): QuestView | null => (
  quests.find((quest) => quest.status === 'IN_PROGRESS') ?? null
);

const resolveQuestBookPageSection = (
  quest: QuestView,
  nearestGoal: QuestView | null,
): QuestBookPageSection => {
  if (quest.status === 'READY_TO_CLAIM') {
    return 'READY_REWARD';
  }

  if (nearestGoal?.code === quest.code) {
    return 'NEAREST_GOAL';
  }

  if (quest.status === 'CLAIMED') {
    return 'ARCHIVE';
  }

  return 'IN_PROGRESS';
};

const questBookPageSectionPriority: Readonly<Record<QuestBookPageSection, number>> = {
  READY_REWARD: 0,
  NEAREST_GOAL: 1,
  IN_PROGRESS: 2,
  ARCHIVE: 3,
};

const createQuestBookNavigationEntries = (quests: readonly QuestView[]): readonly QuestBookPageQuestEntry[] => {
  const nearestGoal = findNearestQuestGoal(quests);

  return quests
    .map((quest, bookIndex) => ({
      quest,
      bookIndex,
      chapter: resolveQuestChapter(quest),
      section: resolveQuestBookPageSection(quest, nearestGoal),
    }))
    .sort((left, right) => (
      questBookPageSectionPriority[left.section] - questBookPageSectionPriority[right.section]
      || left.chapter.order - right.chapter.order
      || left.bookIndex - right.bookIndex
    ))
    .map((entry, displayIndex): QuestBookPageQuestEntry => ({
      ...entry,
      displayIndex,
    }));
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
  const entries = createQuestBookNavigationEntries(book.quests).slice(startIndex, startIndex + questBookPageSize);

  return {
    pageNumber: normalizedPageNumber,
    totalPages: getQuestBookTotalPages(book),
    totalQuests: book.quests.length,
    startIndex,
    endIndex: startIndex + entries.length,
    quests: entries.map((entry) => entry.quest),
    entries,
  };
};

const renderProgressLine = (quest: QuestView): string => (
  `${quest.progress.current}/${quest.progress.required} · ${quest.objective}`
);

const trimTrailingSentencePunctuation = (value: string): string => value.replace(/[.!?]+$/u, '');

const renderReadyQuestLine = (entry: QuestBookPageQuestEntry): string => (
  `${entry.displayIndex + 1}. ${entry.quest.icon} ${entry.quest.title} · ${entry.chapter.title}\n`
  + `   ${questStatusLabels.READY_TO_CLAIM}: ${formatResourceReward(entry.quest.reward)}`
);

const renderProgressQuestLine = (entry: QuestBookPageQuestEntry): string => (
  `${entry.displayIndex + 1}. ${entry.quest.icon} ${entry.quest.title} · ${entry.chapter.title}\n`
  + `   ${questStatusLabels.IN_PROGRESS}: ${renderProgressLine(entry.quest)}`
);

const renderArchiveQuestLine = (entry: QuestBookPageQuestEntry): string => (
  `${entry.displayIndex + 1}. ${entry.quest.icon} ${entry.quest.title}`
);

const renderSectionTitle = (
  section: QuestBookPageSection,
  entryCount: number,
): string => {
  switch (section) {
    case 'READY_REWARD':
      return `🎁 Готовые награды · ${entryCount}`;
    case 'NEAREST_GOAL':
      return '🧭 Ближайший след';
    case 'IN_PROGRESS':
      return `🌒 Следы дальше · ${entryCount}`;
    case 'ARCHIVE':
      return `✅ Архив · ${entryCount}`;
  }
};

const renderQuestPageSectionLine = (
  section: QuestBookPageSection,
  entry: QuestBookPageQuestEntry,
): string => {
  switch (section) {
    case 'READY_REWARD':
      return renderReadyQuestLine(entry);
    case 'NEAREST_GOAL':
    case 'IN_PROGRESS':
      return renderProgressQuestLine(entry);
    case 'ARCHIVE':
      return renderArchiveQuestLine(entry);
  }
};

const renderQuestPageSection = (
  section: QuestBookPageSection,
  entries: readonly QuestBookPageQuestEntry[],
): string => [
  renderSectionTitle(section, entries.length),
  ...entries.map((entry) => renderQuestPageSectionLine(section, entry)),
].join('\n');

const groupQuestPageEntriesBySection = (
  entries: readonly QuestBookPageQuestEntry[],
): readonly [QuestBookPageSection, readonly QuestBookPageQuestEntry[]][] => {
  const groups = entries.reduce<Map<QuestBookPageSection, QuestBookPageQuestEntry[]>>((sections, entry) => {
    const group = sections.get(entry.section) ?? [];
    group.push(entry);
    sections.set(entry.section, group);
    return sections;
  }, new Map());

  return [...groups.entries()].sort(([left], [right]) => (
    questBookPageSectionPriority[left] - questBookPageSectionPriority[right]
  ));
};

const renderQuestBookPageSections = (page: QuestBookPageView): readonly string[] => (
  groupQuestPageEntriesBySection(page.entries).map(([section, entries]) => renderQuestPageSection(section, entries))
);

const renderNearestGoalSummary = (book: QuestBookView): string => {
  const nearestGoal = findNearestQuestGoal(book.quests);
  if (!nearestGoal) {
    return '🧭 След: всё закрыто.';
  }

  return `🧭 ${nearestGoal.icon} ${nearestGoal.title}: ${trimTrailingSentencePunctuation(renderProgressLine(nearestGoal))}.`;
};

const renderReadyRewardSummary = (book: QuestBookView): string => (
  book.readyToClaimCount > 0
    ? `🎁 Готово: ${formatCountPhrase(book.readyToClaimCount, [
      'запись ждёт',
      'записи ждут',
      'записей ждут',
    ])}.`
    : '🎁 Готово: 0.'
);

export const renderQuestBook = (book: QuestBookView, pageNumber = 1): string => {
  const page = getQuestBookPageView(book, pageNumber);
  const pageRange = page.totalQuests > 0
    ? `записи ${page.startIndex + 1}-${page.endIndex} из ${page.totalQuests}`
    : 'записей пока нет';

  return [
    '📜 Книга путей',
    `📌 ${renderQuestBookSummary(book)}`,
    renderNearestGoalSummary(book),
    renderReadyRewardSummary(book),
    `📄 ${page.pageNumber}/${page.totalPages} · ${pageRange}.`,
    ...renderQuestBookPageSections(page),
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
    `✅ ${result.quest.title}`,
    `🎁 ${rewardLine}`,
    '',
    renderQuestBook(result.book),
  ].join('\n');
};
