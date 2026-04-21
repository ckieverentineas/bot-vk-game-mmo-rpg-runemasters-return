import { describe, expect, it } from 'vitest';

import type { BiomeView } from '../../../shared/types/game';
import { resolveExplorationEventLine } from './exploration-events';

const createBiome = (overrides: Partial<BiomeView> = {}): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Стартовая чаща для новых мастеров рун.',
  minLevel: 1,
  maxLevel: 15,
  ...overrides,
});

describe('resolveExplorationEventLine', () => {
  it('does not interrupt the intro tutorial with extra exploration events', () => {
    const line = resolveExplorationEventLine({
      biome: createBiome({ code: 'initium', minLevel: 0, maxLevel: 0 }),
      currentSchoolCode: null,
      locationLevel: 0,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items[0]!,
    });

    expect(line).toBeNull();
  });

  it('can add a neutral path event before an adventure battle', () => {
    const line = resolveExplorationEventLine({
      biome: createBiome(),
      currentSchoolCode: null,
      locationLevel: 1,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items[0]!,
    });

    expect(line).toContain('Путевой эпизод');
  });

  it('can pick a school-aware event when the player has an equipped school', () => {
    const line = resolveExplorationEventLine({
      biome: createBiome(),
      currentSchoolCode: 'echo',
      locationLevel: 1,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items[items.length - 1]!,
    });

    expect(line).toContain('Прорицание');
    expect(line).not.toContain('сегодня');
  });

  it('stays silent when the event roll fails', () => {
    const line = resolveExplorationEventLine({
      biome: createBiome(),
      currentSchoolCode: 'ember',
      locationLevel: 1,
    }, {
      rollPercentage: () => false,
      pickOne: (items) => items[0]!,
    });

    expect(line).toBeNull();
  });
});
