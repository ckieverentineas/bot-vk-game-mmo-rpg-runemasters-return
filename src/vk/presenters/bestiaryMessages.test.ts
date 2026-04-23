import { describe, expect, it } from 'vitest';

import type {
  BestiaryEnemyView,
  BestiaryLocationDetailView,
  BestiaryLocationSummaryView,
  BestiaryOverviewView,
} from '../../modules/world/application/read-models/bestiary';
import type { BiomeView, MobTemplateView } from '../../shared/types/game';
import {
  renderBestiaryLocationDetail,
  renderBestiaryOverview,
} from './bestiaryMessages';

const createBiome = (overrides: Partial<BiomeView> = {}): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Темный лес',
  description: 'Стартовая чаща.',
  minLevel: 1,
  maxLevel: 15,
  ...overrides,
});

const createLocation = (
  overrides: Partial<BestiaryLocationSummaryView> = {},
): BestiaryLocationSummaryView => ({
  biome: createBiome(),
  isUnlocked: true,
  unlockLocationLevel: 1,
  discoveryReward: {
    reward: { radiance: 2 },
    isClaimed: true,
    claimedNow: true,
  },
  discoveredEnemyCount: 2,
  revealedDropCount: 1,
  totalEnemyCount: 3,
  ...overrides,
});

const createMobTemplate = (overrides: Partial<MobTemplateView> = {}): MobTemplateView => ({
  code: 'forest-wolf',
  biomeCode: 'dark-forest',
  name: 'Лесной волк',
  kind: 'wolf',
  isElite: false,
  isBoss: false,
  baseStats: {
    health: 15,
    attack: 4,
    defence: 1,
    magicDefence: 0,
    dexterity: 4,
    intelligence: 2,
  },
  scales: {
    health: 1,
    attack: 1,
    defence: 1,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  baseExperience: 14,
  baseGold: 5,
  runeDropChance: 22,
  lootTable: { leather: 2, bone: 1 },
  attackText: 'впивается клыками',
  ...overrides,
});

const createEnemy = (overrides: Partial<BestiaryEnemyView> = {}): BestiaryEnemyView => ({
  isDiscovered: true,
  isDropRevealed: true,
  tacticalProfile: {
    code: 'HEAVY_STRIKE',
    habitLine: 'готовит тяжелый удар',
    answerLine: 'встречайте угрозу защитой',
  },
  template: createMobTemplate(),
  victoryCount: 5,
  killMilestones: [
    { threshold: 1, reward: { radiance: 1 }, isCompleted: true, isClaimed: true, claimedNow: false },
    { threshold: 5, reward: { radiance: 1 }, isCompleted: true, isClaimed: true, claimedNow: true },
    { threshold: 10, reward: { radiance: 2 }, isCompleted: false, isClaimed: false, claimedNow: false },
    { threshold: 25, reward: { radiance: 3 }, isCompleted: false, isClaimed: false, claimedNow: false },
  ],
  ...overrides,
});

describe('bestiary messages', () => {
  it('renders location overview without enemy detail noise', () => {
    const overview: BestiaryOverviewView = {
      pageNumber: 1,
      totalPages: 1,
      totalLocations: 1,
      locations: [createLocation()],
    };

    const message = renderBestiaryOverview(overview);

    expect(message).toContain('📖 Бестиарий');
    expect(message).toContain('Темный лес · ур. 1-15');
    expect(message).toContain('Следы: 2/3 · добыча: 1/3');
    expect(message).toContain('Первое открытие: +2 сияния · получено сейчас');
    expect(message).not.toContain('Лесной волк');
  });

  it('renders selected location enemies with drops and kill rewards', () => {
    const detail: BestiaryLocationDetailView = {
      location: createLocation({
        discoveryReward: {
          reward: { radiance: 2 },
          isClaimed: true,
          claimedNow: false,
        },
      }),
      enemies: [
        createEnemy(),
        createEnemy({
          isDiscovered: false,
          isDropRevealed: false,
          tacticalProfile: null,
          template: createMobTemplate({
            code: 'secret-enemy',
            name: 'Секретный след',
            kind: 'spirit',
            lootTable: { essence: 1 },
          }),
          victoryCount: 0,
          killMilestones: [
            { threshold: 1, reward: { radiance: 1 }, isCompleted: false, isClaimed: false, claimedNow: false },
            { threshold: 5, reward: { radiance: 1 }, isCompleted: false, isClaimed: false, claimedNow: false },
          ],
        }),
      ],
    };

    const message = renderBestiaryLocationDetail(detail);

    expect(message).toContain('📖 Бестиарий / Темный лес');
    expect(message).toContain('Лесной волк · обычный · зверь');
    expect(message).toContain('Побед: 5');
    expect(message).toContain('добыча: +2 кожи · +1 кость · шанс руны: 22%');
    expect(message).toContain('5 побед: +1 сияния · получено сейчас');
    expect(message).toContain('2. ??? - след не встречен');
    expect(message).not.toContain('Секретный след');
  });
});
