import { describe, expect, it } from 'vitest';

import type { RunicTavernBoardView } from '../../modules/quests/application/read-models/runic-tavern-board';
import type { PlayerState } from '../../shared/types/game';
import { renderRunicTavern } from './runicTavernMessages';

const createBoard = (overrides: Partial<RunicTavernBoardView> = {}): RunicTavernBoardView => ({
  player: {} as PlayerState,
  namedCount: 1,
  calamityCount: 1,
  threats: [
    {
      enemyCode: 'cave-stalker',
      displayName: 'Бедствие «Пещерный следопыт»',
      baseEnemyName: 'Пещерный следопыт',
      rank: 'CALAMITY',
      rankLabel: 'бедствие',
      currentBiomeCode: 'dark-forest',
      currentBiomeName: 'Тёмный лес',
      originBiomeName: 'Забытые пещеры',
      survivalCount: 6,
      experience: 60,
      levelBonus: 6,
      lastSeenLocationLevel: 8,
      dangerScore: 158,
      recommendedParty: true,
      bountyReward: {
        experience: 29,
        gold: 77,
        shards: {
          USUAL: 3,
          UNUSUAL: 2,
          RARE: 1,
        },
      },
    },
  ],
  ...overrides,
});

describe('renderRunicTavern', () => {
  it('renders the tavern board with dynamic bounty and party advice', () => {
    const message = renderRunicTavern(createBoard());

    expect(message).toContain('🏠 Трактир Рунного дозора');
    expect(message).toContain('Доска угроз: 1 именная · 1 бедствие');
    expect(message).toContain('Бедствие «Пещерный следопыт»');
    expect(message).toContain('Ранг: бедствие · Тёмный лес · рост +6');
    expect(message).toContain('Премия Дозора: +29 опыта · +77 пыли · +3 обычных осколка · +2 необычных осколка · +1 редкий осколок');
    expect(message).toContain('Лучше идти отрядом.');
  });

  it('renders a quiet tavern when no named threats exist yet', () => {
    const message = renderRunicTavern(createBoard({
      namedCount: 0,
      calamityCount: 0,
      threats: [],
    }));

    expect(message).toContain('Доска угроз пуста.');
    expect(message).toContain('Слухи ещё не стали именами.');
  });
});
