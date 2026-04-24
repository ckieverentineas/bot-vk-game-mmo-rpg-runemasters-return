import { describe, expect, it } from 'vitest';

import { emptyInventory } from '../../../player/domain/player-stats';
import type { ActiveEnemyThreatView } from '../../../shared/application/ports/GameRepository';
import type { BiomeView, PlayerState } from '../../../../shared/types/game';
import { buildRunicTavernBoardView } from './runic-tavern-board';

const createPlayer = (): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 8,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 30,
    attack: 5,
    defence: 2,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  locationLevel: 6,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 2,
  activeBattleId: null,
  victories: 4,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 4,
  highestLocationLevel: 6,
  tutorialState: 'COMPLETED',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
});

const createBiome = (overrides: Partial<BiomeView>): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Старый лес.',
  minLevel: 1,
  maxLevel: 15,
  ...overrides,
});

const createThreat = (overrides: Partial<ActiveEnemyThreatView>): ActiveEnemyThreatView => ({
  enemyCode: 'blue-slime',
  enemyName: 'Синий слизень',
  originBiomeCode: 'dark-forest',
  originBiomeName: 'Тёмный лес',
  currentBiomeCode: 'dark-forest',
  survivalCount: 3,
  experience: 24,
  levelBonus: 3,
  lastSeenLocationLevel: 6,
  ...overrides,
});

describe('buildRunicTavernBoardView', () => {
  it('lists only named and calamity threats from the runic tavern board', () => {
    const board = buildRunicTavernBoardView({
      player: createPlayer(),
      biomes: [
        createBiome({ code: 'dark-forest', name: 'Тёмный лес' }),
        createBiome({ code: 'forgotten-caves', name: 'Забытые пещеры' }),
      ],
      threats: [
        createThreat({
          enemyCode: 'forest-wolf',
          enemyName: 'Лесной волк',
          survivalCount: 2,
          experience: 18,
          levelBonus: 2,
        }),
        createThreat({
          enemyCode: 'blue-slime',
          enemyName: 'Синий слизень',
          survivalCount: 3,
          experience: 24,
          levelBonus: 3,
        }),
        createThreat({
          enemyCode: 'cave-stalker',
          enemyName: 'Пещерный следопыт',
          originBiomeCode: 'forgotten-caves',
          originBiomeName: 'Забытые пещеры',
          currentBiomeCode: 'dark-forest',
          survivalCount: 6,
          experience: 60,
          levelBonus: 6,
        }),
      ],
    });

    expect(board.threats.map((threat) => threat.enemyCode)).toEqual(['cave-stalker', 'blue-slime']);
    expect(board.namedCount).toBe(1);
    expect(board.calamityCount).toBe(1);
    expect(board.threats[0]).toMatchObject({
      enemyCode: 'cave-stalker',
      displayName: 'Бедствие «Пещерный следопыт»',
      rank: 'CALAMITY',
      currentBiomeName: 'Тёмный лес',
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
    });
  });
});
