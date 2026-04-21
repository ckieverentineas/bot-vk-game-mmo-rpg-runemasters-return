import { describe, expect, it } from 'vitest';

import type { BattleEnemySnapshot, BiomeView } from '../../../shared/types/game';
import { resolveGameMasterEncounterLine } from './game-master-director';

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

  it('uses a build-check cue for bosses without a known school', () => {
    const line = resolveGameMasterEncounterLine({
      biome: createBiome(),
      enemy: createEnemy({ isBoss: true }),
      currentSchoolCode: null,
      locationLevel: 8,
    });

    expect(line).toContain('проверку сборки');
    expect(line).toContain('не одна сильная кнопка');
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
