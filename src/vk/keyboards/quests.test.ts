import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../shared/types/game';
import type { QuestBookView, QuestView } from '../../modules/quests/application/read-models/quest-book';
import {
  createQuestBookPageCommand,
  gameCommands,
} from '../commands/catalog';
import { createQuestBookKeyboard } from './quests';

const questCodes: readonly QuestView['code'][] = [
  'awakening_empty_master',
  'first_sign',
  'voice_of_school',
  'two_sockets',
  'trophy_hand',
  'name_on_threshold',
  'trail_beyond_circle',
];

interface SerializedButton {
  readonly action: {
    readonly payload: string;
  };
}

interface SerializedVkKeyboard {
  readonly buttons: ReadonlyArray<readonly SerializedButton[]>;
}

const createReadyQuest = (index: number): QuestView => ({
  code: questCodes[index] ?? 'awakening_empty_master',
  icon: '*',
  title: `Quest ${index + 1}`,
  story: 'Story.',
  objective: 'Objective.',
  reward: { gold: 1 },
  progress: {
    current: 1,
    required: 1,
    completed: true,
  },
  status: 'READY_TO_CLAIM',
});

const createQuestBook = (readyQuestCount: number): QuestBookView => ({
  player: {} as PlayerState,
  readyToClaimCount: readyQuestCount,
  inProgressCount: 0,
  claimedCount: 0,
  quests: Array.from({ length: readyQuestCount }, (_, index) => createReadyQuest(index)),
});

const serializeForVk = (book: QuestBookView, pageNumber = 1): SerializedVkKeyboard => (
  JSON.parse(createQuestBookKeyboard(book, pageNumber).toString()) as SerializedVkKeyboard
);

const collectCommands = (keyboard: SerializedVkKeyboard): string[] => (
  keyboard.buttons
    .flat()
    .map((button) => JSON.parse(button.action.payload) as { command: string })
    .map((payload) => payload.command)
);

describe('createQuestBookKeyboard', () => {
  it('keeps ready reward buttons within the VK row limit', () => {
    const keyboard = serializeForVk(createQuestBook(7));
    const commands = collectCommands(keyboard);

    expect(keyboard.buttons).toHaveLength(6);
    expect(commands.filter((command) => command === gameCommands.claimQuestReward)).toHaveLength(5);
    expect(commands).toContain(gameCommands.backToMenu);
    expect(commands).toContain(createQuestBookPageCommand(2));
  });

  it('only shows reward buttons for the current quest page', () => {
    const keyboard = serializeForVk(createQuestBook(7), 2);
    const commands = collectCommands(keyboard);

    expect(keyboard.buttons).toHaveLength(3);
    expect(commands.filter((command) => command === gameCommands.claimQuestReward)).toHaveLength(2);
    expect(commands).toContain(createQuestBookPageCommand(1));
  });
});
