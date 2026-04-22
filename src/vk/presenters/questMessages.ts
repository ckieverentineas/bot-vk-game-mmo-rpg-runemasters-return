import type { ClaimQuestRewardView } from '../../modules/quests/application/use-cases/ClaimQuestReward';
import type {
  QuestBookView,
  QuestView,
} from '../../modules/quests/application/read-models/quest-book';
import { formatResourceReward } from './message-formatting';

type RussianPluralForms = readonly [one: string, few: string, many: string];

const questStatusLabels: Readonly<Record<QuestView['status'], string>> = {
  READY_TO_CLAIM: '🎁 Награда ждёт',
  IN_PROGRESS: '🌒 В пути',
  CLAIMED: '✅ Закрыто',
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

const renderQuest = (quest: QuestView): string => [
  `${quest.icon} ${quest.title} · ${questStatusLabels[quest.status]}`,
  quest.story,
  `След: ${quest.objective}`,
  renderQuestProgress(quest),
  `Награда: ${formatResourceReward(quest.reward)}.`,
].join('\n');

export const renderQuestBook = (book: QuestBookView): string => [
  '📜 Книга путей',
  'Руны помнят не обещания, а завершённые шаги.',
  `В книге: ${renderQuestBookSummary(book)}.`,
  ...book.quests.map(renderQuest),
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
