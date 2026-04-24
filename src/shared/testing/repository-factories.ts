import type { PlayerState } from '../types/game';

export interface TestPlayerLookupRepository {
  readonly findPlayerByVkId: (vkId: number) => Promise<PlayerState | null>;
  readonly findPlayerById: (playerId: number) => Promise<PlayerState | null>;
}

export const createTestPlayerLookupRepository = (
  players: readonly PlayerState[],
): TestPlayerLookupRepository => ({
  findPlayerByVkId: async (vkId) => players.find((player) => player.vkId === vkId) ?? null,
  findPlayerById: async (playerId) => players.find((player) => player.playerId === playerId) ?? null,
});
