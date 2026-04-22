import { describe, expect, it, vi } from 'vitest';

import { emptyInventory } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type { PlayerState } from '../../../../shared/types/game';
import { GetQuestBook } from './GetQuestBook';

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
  victories: 1,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 1,
  highestLocationLevel: 0,
  tutorialState: 'COMPLETED',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-22T00:00:00.000Z',
  updatedAt: '2026-04-22T00:00:00.000Z',
  ...overrides,
});

const createRepository = (
  player = createPlayer(),
  claimedQuestCodes: readonly string[] = [],
): GameRepository => ({
  findPlayerByVkId: vi.fn().mockResolvedValue(player),
  listClaimedQuestRewardCodes: vi.fn().mockResolvedValue(claimedQuestCodes),
} as unknown as GameRepository);

const createTelemetry = () => ({
  questBookOpened: vi.fn().mockResolvedValue(undefined),
});

const createUseCase = (repository: GameRepository, telemetry: GameTelemetry): GetQuestBook => (
  new GetQuestBook(repository, telemetry)
);

describe('GetQuestBook', () => {
  it('tracks quest book openings with current book counts', async () => {
    const repository = createRepository();
    const telemetry = createTelemetry();

    const book = await createUseCase(repository, telemetry as unknown as GameTelemetry).execute(1001);

    expect(book.readyToClaimCount).toBe(1);
    expect(telemetry.questBookOpened).toHaveBeenCalledWith(1, {
      playerId: 1,
      questCode: null,
      questStatus: null,
      readyToClaimCount: 1,
      claimedCount: 0,
    });
  });

  it('still returns the book when telemetry logging fails', async () => {
    const repository = createRepository();
    const telemetry = createTelemetry();
    telemetry.questBookOpened.mockRejectedValueOnce(new Error('telemetry offline'));

    await expect(createUseCase(repository, telemetry as unknown as GameTelemetry).execute(1001))
      .resolves.toMatchObject({
        readyToClaimCount: 1,
        claimedCount: 0,
      });
  });
});
