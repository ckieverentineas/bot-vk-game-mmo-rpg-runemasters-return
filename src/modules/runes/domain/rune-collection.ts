import type { PlayerState, RuneView } from '../../../shared/types/game';
import { normalizeRuneIndex } from '../../player/domain/player-stats';

export const runeCollectionPageSize = 4;

export interface RuneCollectionPageEntry {
  readonly slot: number;
  readonly absoluteIndex: number;
  readonly rune: RuneView;
  readonly isSelected: boolean;
}

export interface RuneCollectionPage {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly startIndex: number;
  readonly entries: readonly RuneCollectionPageEntry[];
}

export const resolveRunePageStart = (
  currentRuneIndex: number,
  runeCount: number,
  pageSize = runeCollectionPageSize,
): number => {
  if (runeCount <= 0) {
    return 0;
  }

  const normalizedIndex = normalizeRuneIndex(currentRuneIndex, runeCount);
  return Math.floor(normalizedIndex / pageSize) * pageSize;
};

export const buildRuneCollectionPage = (
  player: Pick<PlayerState, 'runes' | 'currentRuneIndex'>,
  pageSize = runeCollectionPageSize,
): RuneCollectionPage => {
  if (player.runes.length === 0) {
    return {
      pageNumber: 0,
      totalPages: 0,
      startIndex: 0,
      entries: [],
    };
  }

  const startIndex = resolveRunePageStart(player.currentRuneIndex, player.runes.length, pageSize);
  const selectedIndex = normalizeRuneIndex(player.currentRuneIndex, player.runes.length);
  const entries = player.runes
    .slice(startIndex, startIndex + pageSize)
    .map((rune, slot): RuneCollectionPageEntry => ({
      slot,
      absoluteIndex: startIndex + slot,
      rune,
      isSelected: startIndex + slot === selectedIndex,
    }));

  return {
    pageNumber: Math.floor(startIndex / pageSize) + 1,
    totalPages: Math.ceil(player.runes.length / pageSize),
    startIndex,
    entries,
  };
};

export const resolveRunePageSlotIndex = (
  currentRuneIndex: number,
  runeCount: number,
  slot: number,
  pageSize = runeCollectionPageSize,
): number | null => {
  if (runeCount <= 0 || slot < 0 || slot >= pageSize) {
    return null;
  }

  const startIndex = resolveRunePageStart(currentRuneIndex, runeCount, pageSize);
  const targetIndex = startIndex + slot;
  return targetIndex < runeCount ? targetIndex : null;
};

export const resolveShiftedRunePageIndex = (
  currentRuneIndex: number,
  runeCount: number,
  direction: 1 | -1,
  pageSize = runeCollectionPageSize,
): number => {
  if (runeCount <= 0) {
    return 0;
  }

  const startIndex = resolveRunePageStart(currentRuneIndex, runeCount, pageSize);
  return normalizeRuneIndex(startIndex + direction * pageSize, runeCount);
};
