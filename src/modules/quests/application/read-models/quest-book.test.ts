import { describe, expect, it } from 'vitest';

import { emptyInventory } from '../../../player/domain/player-stats';
import type { PlayerState } from '../../../../shared/types/game';
import { buildQuestBookView } from './quest-book';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 30,
    attack: 5,
    defence: 2,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  locationLevel: 0,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 2,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'ACTIVE',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-22T00:00:00.000Z',
  updatedAt: '2026-04-22T00:00:00.000Z',
  ...overrides,
});

describe('buildQuestBookView', () => {
  it('marks completed and claimed quest records separately', () => {
    const player = createPlayer({
      victories: 1,
      runes: [{
        id: 'rune-1',
        name: 'Обычная руна Пламени',
        rarity: 'USUAL',
        runeCode: 'ember',
        archetypeCode: 'ember_striker',
        activeAbilityCodes: [],
        passiveAbilityCodes: [],
        health: 0,
        attack: 1,
        defence: 0,
        magicDefence: 0,
        dexterity: 0,
        intelligence: 0,
        isEquipped: true,
        equippedSlot: 0,
        createdAt: '2026-04-22T00:00:00.000Z',
      }],
    });

    const book = buildQuestBookView(player, ['awakening_empty_master']);

    expect(book.claimedCount).toBe(1);
    expect(book.readyToClaimCount).toBe(1);
    expect(book.quests.find((quest) => quest.code === 'awakening_empty_master')?.status).toBe('CLAIMED');
    expect(book.quests.find((quest) => quest.code === 'first_sign')?.status).toBe('READY_TO_CLAIM');
  });
});
