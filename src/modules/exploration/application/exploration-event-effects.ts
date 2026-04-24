import type { PlayerState } from '../../../shared/types/game';
import { derivePlayerStats, derivePlayerVitals } from '../../player/domain/player-stats';
import type { ExplorationVitalRecovery } from '../../world/domain/exploration-events';

export const resolveRecoveredPlayerVitals = (
  player: PlayerState,
  recovery: { readonly healthRatio: ExplorationVitalRecovery['healthRatio']; readonly manaRatio: ExplorationVitalRecovery['manaRatio'] },
): Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>> => {
  const vitals = derivePlayerVitals(player, derivePlayerStats(player));

  return {
    currentHealth: Math.max(vitals.currentHealth, Math.ceil(vitals.maxHealth * recovery.healthRatio)),
    currentMana: Math.max(vitals.currentMana, Math.ceil(vitals.maxMana * recovery.manaRatio)),
  };
};
