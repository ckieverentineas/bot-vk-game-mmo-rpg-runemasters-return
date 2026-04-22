import type { ClaimQuestRewardView } from '../../modules/quests/application/use-cases/ClaimQuestReward';
import type {
  QuestBookView,
  QuestView,
} from '../../modules/quests/application/read-models/quest-book';
import { formatResourceReward } from './message-formatting';

const questStatusLabels: Readonly<Record<QuestView['status'], string>> = {
  READY_TO_CLAIM: '🎁 Награда ждёт',
  IN_PROGRESS: '🌒 В пути',
  CLAIMED: '✅ Закрыто',
};

const renderQuestProgress = (quest: QuestView): string => {
  if (quest.status === 'CLAIMED') {
    return 'Запись закрыта.';
  }

  if (quest.status === 'READY_TO_CLAIM') {
    return 'Шаг завершён. Награда ждёт в книге.';
  }

  return `Путь: ${quest.progress.current}/${quest.progress.required}.`;
};

const renderQuest = (quest: QuestView, index: number): string => [
  `${index + 1}. ${quest.icon} ${quest.title} · ${questStatusLabels[quest.status]}`,
  quest.story,
  `След: ${quest.objective}`,
  renderQuestProgress(quest),
  `Награда: ${formatResourceReward(quest.reward)}.`,
].join('\n');

export const renderQuestBook = (book: QuestBookView): string => [
  '📜 Книга путей',
  '',
  'Руны помнят не обещания, а завершённые шаги.',
  '',
  `🎁 Готово к награде: ${book.readyToClaimCount} · 🌒 В пути: ${book.inProgressCount} · ✅ Закрыто: ${book.claimedCount}`,
  '',
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
