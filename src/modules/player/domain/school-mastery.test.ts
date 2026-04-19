import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../../shared/types/game';
import {
  applySchoolMasteryExperience,
  createSchoolMasteryView,
  getPlayerSchoolMasteryForArchetype,
  listMissingStarterSchoolMasteries,
  resolveNextSchoolMasteryThreshold,
  resolveSchoolMasteryRewardGain,
} from './school-mastery';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 3,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  allocationPoints: { health: 0, attack: 0, defence: 0, magicDefence: 0, dexterity: 0, intelligence: 0 },
  unspentStatPoints: 0,
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
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('school mastery', () => {
  it('promotes mastery rank at the first threshold', () => {
    const next = applySchoolMasteryExperience(createSchoolMasteryView('ember', 2), 'ember', 1);

    expect(next.experience).toBe(3);
    expect(next.rank).toBe(1);
    expect(resolveNextSchoolMasteryThreshold(next.rank)).toBeNull();
  });

  it('resolves mastery gain from the equipped school rune', () => {
    const player = createPlayer({
      runes: [
        {
          id: 'rune-1',
          runeCode: 'rune-1',
          archetypeCode: 'stone',
          passiveAbilityCodes: ['stone_guard'],
          activeAbilityCodes: ['stone_bastion'],
          name: 'Руна Тверди',
          rarity: 'USUAL',
          isEquipped: true,
          health: 1,
          attack: 0,
          defence: 2,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(resolveSchoolMasteryRewardGain(player)).toEqual({
      schoolCode: 'stone',
      experienceGain: 1,
    });
  });

  it('reads mastery for the current archetype and backfills starter defaults', () => {
    const player = createPlayer({
      schoolMasteries: [createSchoolMasteryView('ember', 3)],
    });

    expect(getPlayerSchoolMasteryForArchetype(player, 'ember')).toEqual({
      schoolCode: 'ember',
      experience: 3,
      rank: 1,
    });
    expect(listMissingStarterSchoolMasteries(player).map((entry) => entry.schoolCode)).toEqual(['stone', 'gale', 'echo']);
  });
});
