import type { PlayerState, ResourceReward } from '../../../../shared/types/game';
import {
  listQuestDefinitions,
  type QuestCode,
} from '../../domain/quest-definitions';

export type QuestStatus = 'READY_TO_CLAIM' | 'IN_PROGRESS' | 'CLAIMED';

export interface QuestProgressView {
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

export interface QuestView {
  readonly code: QuestCode;
  readonly icon: string;
  readonly title: string;
  readonly story: string;
  readonly objective: string;
  readonly reward: ResourceReward;
  readonly progress: QuestProgressView;
  readonly status: QuestStatus;
}

export interface QuestBookView {
  readonly player: PlayerState;
  readonly quests: readonly QuestView[];
  readonly readyToClaimCount: number;
  readonly inProgressCount: number;
  readonly claimedCount: number;
}

const toQuestStatus = (completed: boolean, claimed: boolean): QuestStatus => {
  if (claimed) {
    return 'CLAIMED';
  }

  return completed ? 'READY_TO_CLAIM' : 'IN_PROGRESS';
};

const countByStatus = (quests: readonly QuestView[], status: QuestStatus): number => (
  quests.filter((quest) => quest.status === status).length
);

export const buildQuestBookView = (
  player: PlayerState,
  claimedQuestCodes: readonly string[],
): QuestBookView => {
  const claimedSet = new Set(claimedQuestCodes);
  const quests = listQuestDefinitions().map((definition): QuestView => {
    const progress = definition.progress(player);
    const completed = progress.current >= progress.required;
    const claimed = claimedSet.has(definition.code);

    return {
      code: definition.code,
      icon: definition.icon,
      title: definition.title,
      story: definition.story,
      objective: definition.objective,
      reward: definition.reward,
      progress: {
        ...progress,
        completed,
      },
      status: toQuestStatus(completed, claimed),
    };
  });

  return {
    player,
    quests,
    readyToClaimCount: countByStatus(quests, 'READY_TO_CLAIM'),
    inProgressCount: countByStatus(quests, 'IN_PROGRESS'),
    claimedCount: countByStatus(quests, 'CLAIMED'),
  };
};

export const findQuestBookEntry = (
  book: QuestBookView,
  code: string,
): QuestView | null => (
  book.quests.find((quest) => quest.code === code) ?? null
);
