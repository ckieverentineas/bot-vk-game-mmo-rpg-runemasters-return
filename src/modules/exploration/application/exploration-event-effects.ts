import type { PlayerState } from '../../../shared/types/game';
import { derivePlayerStats, derivePlayerVitals } from '../../player/domain/player-stats';
import type {
  GameRepository,
  RecordInventoryDeltaResultOptions,
  RecordPlayerVitalsResultOptions,
} from '../../shared/application/ports/GameRepository';
import {
  getExplorationSceneInventoryDelta,
  getExplorationSceneVitalRecovery,
  type ExplorationSceneView,
  type ExplorationVitalRecovery,
} from '../../world/domain/exploration-events';

type ExplorationSceneEffectRepository = Pick<
  GameRepository,
  'recordInventoryDeltaResult' | 'recordPlayerVitalsResult'
>;

type ExplorationSceneEffectOptions = RecordInventoryDeltaResultOptions & RecordPlayerVitalsResultOptions;

interface PersistExplorationSceneEffectResultContext<TResult> {
  readonly repository: ExplorationSceneEffectRepository;
  readonly player: PlayerState;
  readonly event: ExplorationSceneView;
  readonly options: ExplorationSceneEffectOptions;
  readonly buildResult: (updatedPlayer: PlayerState) => TResult;
}

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

export const persistExplorationSceneEffectResult = async <TResult>({
  repository,
  player,
  event,
  options,
  buildResult,
}: PersistExplorationSceneEffectResultContext<TResult>): Promise<TResult | null> => {
  const inventoryDelta = getExplorationSceneInventoryDelta(event);
  if (inventoryDelta) {
    return repository.recordInventoryDeltaResult(
      player.playerId,
      inventoryDelta,
      options,
      buildResult,
    );
  }

  const vitalRecovery = getExplorationSceneVitalRecovery(event);
  if (vitalRecovery) {
    return repository.recordPlayerVitalsResult(
      player.playerId,
      resolveRecoveredPlayerVitals(player, vitalRecovery),
      options,
      buildResult,
    );
  }

  return null;
};
