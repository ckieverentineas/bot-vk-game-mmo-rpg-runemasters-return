import { createHash } from 'node:crypto';

import type { PlayerState } from '../../../shared/types/game';
import { resolveAdaptiveAdventureLocationLevel } from '../../player/domain/player-stats';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

const buildExplorationSnapshot = (player: PlayerState) => ({
  tutorialState: player.tutorialState,
  activeBattleId: player.activeBattleId,
  locationLevel: player.locationLevel,
  highestLocationLevel: player.highestLocationLevel,
  victoryStreak: player.victoryStreak,
  defeatStreak: player.defeatStreak,
  adaptiveAdventureLocationLevel: resolveAdaptiveAdventureLocationLevel(player),
});

export const buildSkipTutorialIntentStateKey = (player: PlayerState): string => serializeStateKey({
  action: 'skip_tutorial',
  ...buildExplorationSnapshot(player),
});

export const buildEnterTutorialModeIntentStateKey = (player: PlayerState): string => serializeStateKey({
  action: 'enter_tutorial_mode',
  ...buildExplorationSnapshot(player),
});

export const buildReturnToAdventureIntentStateKey = (player: PlayerState): string => serializeStateKey({
  action: 'return_to_adventure',
  ...buildExplorationSnapshot(player),
});

export const buildExploreLocationIntentStateKey = (player: PlayerState): string => serializeStateKey({
  action: 'explore_location',
  ...buildExplorationSnapshot(player),
});
