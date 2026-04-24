import { describe, expect, it, vi } from 'vitest';

import type { BiomeView } from '../../../shared/types/game';
import {
  getExplorationSceneEffectLine,
  getExplorationSceneInventoryDelta,
  getExplorationSceneVitalRecovery,
  resolveExplorationEventLine,
  resolveRecoveryRestExplorationEvent,
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

const pickStandaloneSceneByCode = (sceneCode: string) => resolveStandaloneExplorationEvent({
  biome: createBiome(),
  currentSchoolCode: null,
  locationLevel: 10,
}, {
  rollPercentage: () => true,
  pickOne: (items) => items.find((item) => item.code === sceneCode) ?? items[0]!,
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

  it('uses a visible standalone scene chance outside the tutorial', () => {
    const rollPercentage = vi.fn().mockReturnValue(false);
    const event = resolveStandaloneExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: null,
      locationLevel: 1,
    }, {
      rollPercentage,
      pickOne: (items) => items[0]!,
    });

    expect(event).toBeNull();
    expect(rollPercentage).toHaveBeenCalledWith(40);
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
    expect(event?.directorLine).toContain('Наставник Совета рун');
    expect(event?.outcomeLine).toContain('Боя нет');
    expect(event?.outcomeLine).not.toContain('быстрее');
    expect(event?.effect.kind).toBe('vital_recovery');
    expect(getExplorationSceneVitalRecovery(event!)).toEqual({ healthRatio: 0.7, manaRatio: 0.75 });
    expect(getExplorationSceneEffectLine(event!)).toContain('Восстановление');
  });

  it('can force a recovery rest scene for anti-stall routes', () => {
    const event = resolveRecoveryRestExplorationEvent({
      biome: createBiome(),
      currentSchoolCode: null,
      locationLevel: 3,
    });

    expect(event).toMatchObject({
      code: 'quiet-rest',
      kind: 'rest',
    });
    expect(getExplorationSceneVitalRecovery(event!)).toEqual({ healthRatio: 0.7, manaRatio: 0.75 });
  });

  it('can return a resource-find scene with a small exact-once inventory effect', () => {
    const event = pickStandaloneSceneByCode('abandoned-camp');

    expect(event).toMatchObject({
      code: 'abandoned-camp',
      kind: 'resource_find',
      kindLabel: 'находка',
    });
    expect(getExplorationSceneInventoryDelta(event!)).toEqual({ herb: 1 });
    expect(getExplorationSceneEffectLine(event!)).toBe('Найдено: трава +1.');
    expect(event?.directorLine).toContain('Мастер снабжения');
    expect(event?.outcomeLine).not.toContain('сегодня');
  });

  it('keeps resource-find rewards small and varied by scene', () => {
    const expectedFinds = [
      ['abandoned-camp', { herb: 1 }, 'Найдено: трава +1.'],
      ['torn-satchel', { leather: 1 }, 'Найдено: кожа +1.'],
      ['safe-cache', { herb: 1 }, 'Найдено: трава +1.'],
      ['old-snare', { bone: 1 }, 'Найдено: кость +1.'],
      ['cold-iron-chip', { metal: 1 }, 'Найдено: металл +1.'],
    ] as const;

    for (const [sceneCode, delta, effectLine] of expectedFinds) {
      const event = pickStandaloneSceneByCode(sceneCode);

      expect(event).toMatchObject({
        code: sceneCode,
        kind: 'resource_find',
      });
      expect(getExplorationSceneInventoryDelta(event!)).toEqual(delta);
      expect(getExplorationSceneEffectLine(event!)).toBe(effectLine);
    }
  });

  it('can return a safe-find scene without starting a battle', () => {
    const event = pickStandaloneSceneByCode('safe-cache');

    expect(event).toMatchObject({
      code: 'safe-cache',
      kind: 'resource_find',
      title: '🧺 Безопасная находка',
    });
    expect(event?.outcomeLine).toContain('Боя нет');
    expect(event?.nextStepLine).toContain('встрече');
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

  it('can return a school standalone scene without FOMO wording', () => {
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
    expect(event?.directorLine).toContain('Мастер Прорицания');
    expect(event?.directorLine).toContain('увидьте угрозу');
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
