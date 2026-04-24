import { describe, expect, it } from 'vitest';

import type { BattleEnemySnapshot, BiomeView } from '../../../shared/types/game';
import {
  resolveGameMasterEncounterLine,
  resolveGameMasterExplorationSceneLine,
} from './game-master-director';

const createBiome = (overrides: Partial<BiomeView> = {}): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Стартовая чаща для новых мастеров рун.',
  minLevel: 1,
  maxLevel: 15,
  ...overrides,
});

const createEnemy = (overrides: Partial<BattleEnemySnapshot> = {}): BattleEnemySnapshot => ({
  code: 'ash-seer',
  name: 'Пепельная ведунья',
  kind: 'mage',
  isElite: true,
  isBoss: false,
  attack: 7,
  defence: 2,
  magicDefence: 4,
  dexterity: 5,
  intelligence: 8,
  maxHealth: 24,
  currentHealth: 24,
  maxMana: 32,
  currentMana: 32,
  experienceReward: 24,
  goldReward: 9,
  runeDropChance: 28,
  attackText: 'выпускает пепельный прорыв',
  intent: null,
  hasUsedSignatureMove: false,
  ...overrides,
});

describe('resolveGameMasterEncounterLine', () => {
  it('adds a tutorial mentor cue without rewards or scheduling pressure', () => {
    const line = resolveGameMasterEncounterLine({
      biome: createBiome({ code: 'initium', minLevel: 0, maxLevel: 0 }),
      enemy: createEnemy({ isElite: false }),
      currentSchoolCode: null,
      locationLevel: 0,
    });

    expect(line).toContain('Наставник Совета рун');
    expect(line).toContain('базовую атаку');
    expect(line).not.toContain('сегодня');
  });

  it('prioritizes the equipped school trial cue for elite encounters', () => {
    const line = resolveGameMasterEncounterLine({
      biome: createBiome(),
      enemy: createEnemy(),
      currentSchoolCode: 'ember',
      locationLevel: 4,
    });

    expect(line).toContain('Мастер Пламени');
    expect(line).toContain('окно добивания');
  });

  it('uses a big-fight cue for bosses without a known school', () => {
    const line = resolveGameMasterEncounterLine({
      biome: createBiome(),
      enemy: createEnemy({ isBoss: true }),
      currentSchoolCode: null,
      locationLevel: 8,
    });

    expect(line).toContain('большой бой');
    expect(line).toContain('собранная руна');
  });

  it('stays silent for ordinary encounters', () => {
    const line = resolveGameMasterEncounterLine({
      biome: createBiome(),
      enemy: createEnemy({ isElite: false, isBoss: false }),
      currentSchoolCode: null,
      locationLevel: 2,
    });

    expect(line).toBeNull();
  });
});

describe('resolveGameMasterExplorationSceneLine', () => {
  it('adds a neutral resource-find cue without turning it into a power reward', () => {
    const line = resolveGameMasterExplorationSceneLine({
      biome: createBiome(),
      sceneKind: 'resource_find',
      currentSchoolCode: null,
      locationLevel: 2,
    });

    expect(line).toContain('Мастер снабжения');
    expect(line).toContain('малый материал');
    expect(line).toContain('пока тропа спокойна');
  });

  it('uses the equipped school voice for school clue scenes', () => {
    const line = resolveGameMasterExplorationSceneLine({
      biome: createBiome(),
      sceneKind: 'school_clue',
      currentSchoolCode: 'echo',
      locationLevel: 3,
    });

    expect(line).toContain('Мастер Прорицания');
    expect(line).toContain('увидьте угрозу');
    expect(line).not.toContain('сегодня');
  });

  it('stays silent for tutorial exploration scenes', () => {
    const line = resolveGameMasterExplorationSceneLine({
      biome: createBiome({ code: 'initium', minLevel: 0, maxLevel: 0 }),
      sceneKind: 'rest',
      currentSchoolCode: null,
      locationLevel: 0,
    });

    expect(line).toBeNull();
  });
});
