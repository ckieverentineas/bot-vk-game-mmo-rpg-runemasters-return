import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { PersistedPlayerStateHydrationInput } from './player-state-hydration';
import { hydratePlayerStateFromPersistence } from './player-state-hydration';

const readFixture = (fileName: string): PersistedPlayerStateHydrationInput => JSON.parse(
  readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), 'utf8'),
) as PersistedPlayerStateHydrationInput;

describe('hydratePlayerStateFromPersistence', () => {
  it('preserves current persisted player-state fixture', () => {
    const player = hydratePlayerStateFromPersistence(readFixture('player-state-current.json'));

    expect(player.locationLevel).toBe(4);
    expect(player.currentRuneIndex).toBe(1);
    expect(player.inventory.usualShards).toBe(20);
    expect(player.unlockedRuneSlotCount).toBe(2);
    expect(player.schoolMasteries?.some((entry) => entry.schoolCode === 'ember' && entry.rank === 1)).toBe(true);
  });

  it('hydrates legacy persisted player-state fixture with safe defaults and clamped cursor state', () => {
    const player = hydratePlayerStateFromPersistence(readFixture('player-state-legacy.json'));

    expect(player.currentRuneIndex).toBe(0);
    expect(player.highestLocationLevel).toBe(2);
    expect(player.inventory.essence).toBe(0);
    expect(player.runes[0]?.isEquipped).toBe(true);
    expect(player.runes[0]?.equippedSlot).toBe(0);
    expect(player.schoolMasteries?.map((entry) => entry.schoolCode)).toEqual(['echo', 'ember', 'gale', 'stone']);
  });

  it('hydrates future persisted player-state fixture through safe fallback rules', () => {
    const player = hydratePlayerStateFromPersistence(readFixture('player-state-future.json'));

    expect(player.tutorialState).toBe('ACTIVE');
    expect(player.activeBattleId).toBeNull();
    expect(player.currentRuneIndex).toBe(0);
    expect(player.highestLocationLevel).toBe(3);
    expect(player.unlockedRuneSlotCount).toBe(2);
    expect(player.inventory.unusualShards).toBe(2);
    expect(player.inventory.crystal).toBe(0);
  });

  it('hydrates persisted player skills and filters unknown future skill codes', () => {
    const player = hydratePlayerStateFromPersistence({
      ...readFixture('player-state-current.json'),
      skills: [
        {
          skillCode: 'gathering.skinning',
          experience: 100,
        },
        {
          skillCode: 'unknown.future_skill',
          experience: 999,
        },
      ],
    });

    expect(player.skills).toEqual([
      {
        skillCode: 'gathering.skinning',
        experience: 100,
        rank: 1,
      },
    ]);
  });
});
