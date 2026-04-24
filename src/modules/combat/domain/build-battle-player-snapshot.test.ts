import { describe, expect, it } from 'vitest';

import type { PlayerState, StatBlock } from '../../../shared/types/game';
import type { WorkshopEquippedItemView } from '../../workshop/domain/workshop-catalog';
import { buildBattlePlayerSnapshot } from './build-battle-player-snapshot';

const createStats = (): StatBlock => ({
  health: 12,
  attack: 4,
  defence: 3,
  magicDefence: 1,
  dexterity: 2,
  intelligence: 2,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  name: 'Рунный мастер #1001',
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: createStats(),
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
  schoolMasteries: [],
  runes: [],
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
  ...overrides,
});

const createWorkshopItem = (
  overrides: Partial<WorkshopEquippedItemView> = {},
): WorkshopEquippedItemView => ({
  id: 'item-1',
  code: 'hunter_cleaver',
  itemClass: 'L',
  slot: 'weapon',
  status: 'ACTIVE',
  equipped: true,
  durability: 14,
  maxDurability: 14,
  ...overrides,
});

describe('buildBattlePlayerSnapshot', () => {
  it('starts the next battle from persisted player vitals', () => {
    const snapshot = buildBattlePlayerSnapshot(1, 1001, createStats(), createPlayer({
      currentHealth: 5,
      currentMana: 3,
    }));

    expect(snapshot.maxHealth).toBe(12);
    expect(snapshot.currentHealth).toBe(5);
    expect(snapshot.maxMana).toBe(8);
    expect(snapshot.currentMana).toBe(3);
  });

  it('uses full vitals for players without persisted attrition state', () => {
    const snapshot = buildBattlePlayerSnapshot(1, 1001, createStats(), createPlayer());

    expect(snapshot.currentHealth).toBe(snapshot.maxHealth);
    expect(snapshot.currentMana).toBe(snapshot.maxMana);
  });

  it('uses the persisted player nickname in battle snapshots', () => {
    const snapshot = buildBattlePlayerSnapshot(1, 1001, createStats(), createPlayer({
      name: 'Лианна',
    }));

    expect(snapshot.name).toBe('Лианна');
  });

  it('adds equipped workshop item bonuses and records their battle loadout', () => {
    const snapshot = buildBattlePlayerSnapshot(1, 1001, createStats(), createPlayer(), [
      createWorkshopItem({
        id: 'weapon-1',
        code: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
      }),
      createWorkshopItem({
        id: 'armor-1',
        code: 'tracker_jacket',
        itemClass: 'L',
        slot: 'armor',
        durability: 18,
        maxDurability: 18,
      }),
      createWorkshopItem({
        id: 'tool-1',
        code: 'skinning_kit',
        itemClass: 'UL',
        slot: 'tool',
        equipped: false,
        durability: 12,
        maxDurability: 12,
      }),
    ]);

    expect(snapshot.attack).toBe(6);
    expect(snapshot.defence).toBe(4);
    expect(snapshot.maxHealth).toBe(15);
    expect(snapshot.workshopLoadout).toEqual([
      {
        id: 'weapon-1',
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        durability: 14,
        maxDurability: 14,
      },
      {
        id: 'armor-1',
        itemCode: 'tracker_jacket',
        itemClass: 'L',
        slot: 'armor',
        durability: 18,
        maxDurability: 18,
      },
    ]);
  });
});
