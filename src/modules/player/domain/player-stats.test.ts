import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../../shared/types/game';
import {
  derivePlayerStats,
  findFirstEmptyRuneSlot,
  getEquippedRuneIdsBySlot,
  getEquippedRunes,
  getUnlockedRuneSlotCount,
  isPlayerInTutorial,
  normalizeRuneIndex,
  resolveAdaptiveAdventureLocationLevel,
  resolveAutoEquipRuneSlot,
  resolveEncounterLocationLevel,
  resolveLevelProgression,
} from './player-stats';

const createPlayerState = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 0,
    unusualShards: 0,
    rareShards: 0,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('resolveAdaptiveAdventureLocationLevel', () => {
  it('не опускает сложность ниже минимального уровня приключений даже после серии поражений', () => {
    const player = createPlayerState({
      defeatStreak: 999,
    });

    expect(resolveAdaptiveAdventureLocationLevel(player)).toBe(1);
  });

  it('повышает рекомендуемую угрозу при росте боевой силы и победной серии', () => {
    const basePlayer = createPlayerState({
      level: 10,
      victoryStreak: 0,
    });

    const boostedPlayer = createPlayerState({
      level: 10,
      victoryStreak: 6,
      runes: [
        {
          id: 'rune-1',
          name: 'Руна давления',
          rarity: 'EPIC',
          health: 12,
          attack: 10,
          defence: 4,
          magicDefence: 2,
          dexterity: 6,
          intelligence: 0,
          isEquipped: true,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(resolveAdaptiveAdventureLocationLevel(boostedPlayer)).toBeGreaterThan(resolveAdaptiveAdventureLocationLevel(basePlayer));
  });

  it('не переоценивает магические статы без полноценной боевой системы заклинаний', () => {
    const attackPlayer = createPlayerState({
      level: 10,
      runes: [
        {
          id: 'rune-attack',
          name: 'Руна давления',
          rarity: 'EPIC',
          health: 6,
          attack: 8,
          defence: 2,
          magicDefence: 0,
          dexterity: 3,
          intelligence: 0,
          isEquipped: true,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    const magicPlayer = createPlayerState({
      level: 10,
      runes: [
        {
          id: 'rune-magic',
          name: 'Руна эха',
          rarity: 'EPIC',
          health: 6,
          attack: 0,
          defence: 2,
          magicDefence: 8,
          dexterity: 3,
          intelligence: 8,
          isEquipped: true,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(resolveAdaptiveAdventureLocationLevel(attackPlayer)).toBeGreaterThan(resolveAdaptiveAdventureLocationLevel(magicPlayer));
  });
});

describe('normalizeRuneIndex', () => {
  it('зацикливает индекс по кругу в обе стороны', () => {
    expect(normalizeRuneIndex(-1, 5)).toBe(4);
    expect(normalizeRuneIndex(5, 5)).toBe(0);
  });
});

describe('rune slot helpers', () => {
  it('normalizes legacy equipped booleans into slot zero', () => {
    const player = createPlayerState({
      runes: [
        {
          id: 'rune-1',
          name: 'Руна давления',
          rarity: 'EPIC',
          health: 1,
          attack: 1,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          isEquipped: true,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(getEquippedRunes(player)[0]?.equippedSlot ?? 0).toBe(0);
    expect(getEquippedRuneIdsBySlot(player)).toEqual(['rune-1', null]);
  });

  it('считает второй слот базовым и даёт от него полные статы', () => {
    const player = createPlayerState({
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      runes: [
        {
          id: 'rune-1',
          name: 'Основа',
          rarity: 'EPIC',
          health: 6,
          attack: 4,
          defence: 2,
          magicDefence: 0,
          dexterity: 2,
          intelligence: 0,
          isEquipped: true,
          equippedSlot: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
        {
          id: 'rune-2',
          name: 'Вторая руна',
          rarity: 'USUAL',
          health: 3,
          attack: 3,
          defence: 1,
          magicDefence: 1,
          dexterity: 1,
          intelligence: 0,
          isEquipped: true,
          equippedSlot: 1,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(getUnlockedRuneSlotCount(player)).toBe(2);
    expect(getEquippedRuneIdsBySlot(player)).toEqual(['rune-1', 'rune-2']);
    expect(derivePlayerStats(player)).toEqual({
      health: 17,
      attack: 11,
      defence: 6,
      magicDefence: 2,
      dexterity: 6,
      intelligence: 1,
    });
  });

  it('находит первый свободный слот для автоматической экипировки', () => {
    const player = createPlayerState({
      runes: [
        {
          id: 'rune-1',
          name: 'Основа',
          rarity: 'USUAL',
          health: 1,
          attack: 1,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          isEquipped: true,
          equippedSlot: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(findFirstEmptyRuneSlot(player)).toBe(1);
    expect(resolveAutoEquipRuneSlot(player)).toBe(1);
  });
});

describe('tutorial state gating', () => {
  it('treats intro location as tutorial only while onboarding is active', () => {
    expect(isPlayerInTutorial(createPlayerState({ tutorialState: 'ACTIVE', locationLevel: 0 }))).toBe(true);
    expect(isPlayerInTutorial(createPlayerState({ tutorialState: 'SKIPPED', locationLevel: 0 }))).toBe(false);
  });

  it('uses adaptive adventure level for skipped players stranded at intro location', () => {
    const player = createPlayerState({ tutorialState: 'SKIPPED', locationLevel: 0, level: 5 });

    expect(resolveEncounterLocationLevel(player)).toBe(resolveAdaptiveAdventureLocationLevel(player));
  });
});

describe('level progression', () => {
  it('считает только уровень и остаток опыта без stat-point логики', () => {
    expect(resolveLevelProgression(1, 49, 11)).toEqual({
      level: 2,
      experience: 0,
    });
  });
});
