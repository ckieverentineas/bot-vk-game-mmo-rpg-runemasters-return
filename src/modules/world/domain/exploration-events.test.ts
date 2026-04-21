import { describe, expect, it } from 'vitest';

import type { BiomeView } from '../../../shared/types/game';
import {
  getExplorationSceneEffectLine,
  getExplorationSceneInventoryDelta,
  resolveExplorationEventLine,
  resolveStandaloneExplorationEvent,
} from './exploration-events';

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

describe('resolveStandaloneExplorationEvent', () => {
  it('does not replace the intro tutorial battle with a standalone scene', () => {
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome({ code: 'initium', minLevel: 0, maxLevel: 0 }),
      currentSchoolCode: null,
      locationLevel: 0,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items[0]!,
    });

    expect(event).toBeNull();
  });

  it('can return a standalone non-combat scene outside the tutorial', () => {
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: null,
      locationLevel: 1,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items[0]!,
    });

    expect(event).toMatchObject({
      code: 'quiet-rest',
      kind: 'rest',
      kindLabel: 'передышка',
      title: expect.stringContaining('Тихая передышка'),
    });
    expect(event?.outcomeLine).toContain('Боя нет');
    expect(event?.effect.kind).toBe('none');
  });

  it('can return a resource-find scene with a small exact-once inventory effect', () => {
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: null,
      locationLevel: 1,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items.find((item) => item.code === 'abandoned-camp') ?? items[0]!,
    });

    expect(event).toMatchObject({
      code: 'abandoned-camp',
      kind: 'resource_find',
      kindLabel: 'находка',
    });
    expect(getExplorationSceneInventoryDelta(event!)).toEqual({ herb: 1 });
    expect(getExplorationSceneEffectLine(event!)).toBe('Найдено: трава +1.');
    expect(event?.outcomeLine).not.toContain('сегодня');
  });

  it('can return a danger-sign scene before a future encounter', () => {
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: null,
      locationLevel: 2,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items.find((item) => item.code === 'fresh-clawmarks') ?? items[0]!,
    });

    expect(event).toMatchObject({
      code: 'fresh-clawmarks',
      kind: 'danger_sign',
      kindLabel: 'опасный знак',
    });
    expect(event?.nextStepLine).toContain('прочитать первый ход');
  });

  it('can return a school-aware standalone scene without FOMO wording', () => {
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: 'echo',
      locationLevel: 1,
    }, {
      rollPercentage: () => true,
      pickOne: (items) => items[items.length - 1]!,
    });

    expect(event?.title).toContain('предзнаменование');
    expect(event?.kind).toBe('school_clue');
    expect(`${event?.description} ${event?.outcomeLine}`).not.toContain('сегодня');
  });

  it('stays silent when the standalone event roll fails', () => {
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: 'ember',
      locationLevel: 1,
    }, {
      rollPercentage: () => false,
      pickOne: (items) => items[0]!,
    });

    expect(event).toBeNull();
  });
});
