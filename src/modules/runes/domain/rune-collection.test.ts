import { describe, expect, it } from 'vitest';

import type { PlayerState, RuneView } from '../../../shared/types/game';
import { buildRuneCollectionPage, resolveRunePageSlotIndex, resolveShiftedRunePageIndex } from './rune-collection';

const createRune = (index: number): RuneView => ({
  id: `rune-${index}`,
  runeCode: `rune-${index}`,
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: `Руна ${index}`,
  rarity: 'USUAL',
  isEquipped: index === 4,
  health: index,
  attack: index + 1,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  createdAt: '2026-04-12T00:00:00.000Z',
});

const createPlayer = (currentRuneIndex: number, runeCount: number): Pick<PlayerState, 'runes' | 'currentRuneIndex'> => ({
  currentRuneIndex,
  runes: Array.from({ length: runeCount }, (_, index) => createRune(index)),
});

describe('rune collection paging', () => {
  it('строит текущую страницу вокруг выбранной руны', () => {
    const page = buildRuneCollectionPage(createPlayer(5, 6));

    expect(page.pageNumber).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.entries.map((entry) => entry.absoluteIndex)).toEqual([4, 5]);
    expect(page.entries[1]?.isSelected).toBe(true);
  });

  it('разрешает выбор слота только внутри текущей страницы', () => {
    expect(resolveRunePageSlotIndex(4, 6, 0)).toBe(4);
    expect(resolveRunePageSlotIndex(4, 6, 1)).toBe(5);
    expect(resolveRunePageSlotIndex(4, 6, 2)).toBeNull();
  });

  it('переключает страницы от начала текущей страницы, а не от текущего слота', () => {
    expect(resolveShiftedRunePageIndex(2, 6, 1)).toBe(4);
    expect(resolveShiftedRunePageIndex(5, 6, -1)).toBe(0);
  });
});
