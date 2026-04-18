import { createHash } from 'node:crypto';

import type { PlayerState, StatKey } from '../../../shared/types/game';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

const buildAllocationSnapshot = (player: PlayerState) => ({
  allocationPoints: {
    health: player.allocationPoints.health,
    attack: player.allocationPoints.attack,
    defence: player.allocationPoints.defence,
    magicDefence: player.allocationPoints.magicDefence,
    dexterity: player.allocationPoints.dexterity,
    intelligence: player.allocationPoints.intelligence,
  },
  unspentStatPoints: player.unspentStatPoints,
});

export const buildAllocateStatIntentStateKey = (player: PlayerState, stat: StatKey): string => serializeStateKey({
  stat,
  ...buildAllocationSnapshot(player),
});

export const buildResetAllocatedStatsIntentStateKey = (player: PlayerState): string => serializeStateKey(buildAllocationSnapshot(player));
