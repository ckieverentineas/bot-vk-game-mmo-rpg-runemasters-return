import { gameBalance } from '../../../config/game-balance';
import type { PlayerState } from '../../../shared/types/game';
import {
  derivePlayerStats,
  derivePlayerVitals,
  getEquippedRunes,
  getRuneEquippedSlot,
  getUnlockedRuneSlotCount,
} from './player-stats';

export type AntiStallRecoveryReason = 'LOW_HEALTH' | 'DEFEAT_STREAK';

export interface AntiStallRecoveryView {
  readonly reason: AntiStallRecoveryReason;
  readonly healthRatio: number;
  readonly defeatStreak: number;
  readonly shouldOfferRest: boolean;
  readonly shouldReviewRunes: boolean;
}

const repeatedDefeatStreakThreshold = 2;

const hasOpenRuneSlotWithStoredRune = (player: PlayerState): boolean => {
  const equippedRunes = getEquippedRunes(player);
  const hasUnequippedRune = player.runes.some((rune) => getRuneEquippedSlot(rune) === null);

  return hasUnequippedRune && equippedRunes.length < getUnlockedRuneSlotCount(player);
};

export const buildAntiStallRecoveryView = (player: PlayerState): AntiStallRecoveryView | null => {
  if (player.tutorialState === 'ACTIVE') {
    return null;
  }

  const vitals = derivePlayerVitals(player, derivePlayerStats(player));
  const healthRatio = vitals.currentHealth / vitals.maxHealth;
  const hasLowHealth = healthRatio <= gameBalance.world.adaptiveDifficulty.lowHealthRatio;
  const hasRepeatedDefeats = player.defeatStreak >= repeatedDefeatStreakThreshold;

  if (!hasLowHealth && !hasRepeatedDefeats) {
    return null;
  }

  return {
    reason: hasLowHealth ? 'LOW_HEALTH' : 'DEFEAT_STREAK',
    healthRatio,
    defeatStreak: player.defeatStreak,
    shouldOfferRest: hasLowHealth,
    shouldReviewRunes: hasOpenRuneSlotWithStoredRune(player),
  };
};
