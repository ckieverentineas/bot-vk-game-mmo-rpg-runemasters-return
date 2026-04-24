import { describe, expect, it } from 'vitest';

import type { RunicTavernBoardView } from '../../modules/quests/application/read-models/runic-tavern-board';
import type { PlayerState } from '../../shared/types/game';
import { gameCommands } from '../commands/catalog';
import { createRunicTavernKeyboard } from './runicTavern';

const collectPayloads = (keyboard: ReturnType<typeof createRunicTavernKeyboard>): unknown[] => {
  const serialized = JSON.parse(keyboard.toString()) as { buttons: Array<Array<{ action: { payload?: string } }>> };

  return serialized.buttons.flatMap((row) => row.map((button) => (
    button.action.payload ? JSON.parse(button.action.payload) : null
  )));
};

const createBoard = (recommendedParty: boolean): RunicTavernBoardView => ({
  player: {} as PlayerState,
  namedCount: recommendedParty ? 0 : 1,
  calamityCount: recommendedParty ? 1 : 0,
  threats: [{
    enemyCode: 'blue-slime',
    displayName: 'Упрямый Синий слизень',
    baseEnemyName: 'Синий слизень',
    rank: recommendedParty ? 'CALAMITY' : 'NAMED',
    rankLabel: recommendedParty ? 'бедствие' : 'именная угроза',
    currentBiomeCode: 'dark-forest',
    currentBiomeName: 'Тёмный лес',
    originBiomeName: 'Тёмный лес',
    survivalCount: 3,
    experience: 24,
    levelBonus: 3,
    lastSeenLocationLevel: 6,
    dangerScore: 80,
    recommendedParty,
    bountyReward: {
      experience: 12,
      gold: 33,
      shards: { USUAL: 1, UNUSUAL: 1 },
    },
  }],
});

describe('createRunicTavernKeyboard', () => {
  it('offers exploration and party routes from the tavern board', () => {
    const payloads = collectPayloads(createRunicTavernKeyboard(createBoard(true)));

    expect(payloads).toContainEqual({ command: gameCommands.explore });
    expect(payloads).toContainEqual({ command: gameCommands.party });
    expect(payloads).toContainEqual({ command: gameCommands.backToMenu });
  });

  it('keeps the board compact when no party advice is needed', () => {
    const payloads = collectPayloads(createRunicTavernKeyboard(createBoard(false)));

    expect(payloads).toContainEqual({ command: gameCommands.explore });
    expect(payloads).not.toContainEqual({ command: gameCommands.party });
  });
});
