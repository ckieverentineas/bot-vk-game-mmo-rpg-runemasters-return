import { describe, expect, it, vi } from 'vitest';

import { emptyInventory } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type { PlayerState } from '../../../../shared/types/game';
import { ClaimQuestReward } from './ClaimQuestReward';

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

const createRepository = (player = createPlayer(), claimedQuestCodes: readonly string[] = []): GameRepository => ({
  findPlayerByVkId: vi.fn().mockResolvedValue(player),
  listClaimedQuestRewardCodes: vi.fn().mockResolvedValue(claimedQuestCodes),
  claimQuestReward: vi.fn().mockResolvedValue({
    player: {
      ...player,
      gold: player.gold + 5,
      inventory: {
        ...player.inventory,
        usualShards: player.inventory.usualShards + 1,
      },
    },
    questCode: 'awakening_empty_master',
    reward: { gold: 5, inventoryDelta: { usualShards: 1 } },
    claimed: true,
  }),
} as unknown as GameRepository);

const createTelemetry = () => ({
  questRewardClaimed: vi.fn().mockResolvedValue(undefined),
  questRewardReplayed: vi.fn().mockResolvedValue(undefined),
  questRewardNotReady: vi.fn().mockResolvedValue(undefined),
});

const createUseCase = (repository: GameRepository, telemetry = createTelemetry()): ClaimQuestReward => (
  new ClaimQuestReward(repository, telemetry as unknown as GameTelemetry)
);

describe('ClaimQuestReward', () => {
  it('claims a ready quest reward exactly through the repository rail', async () => {
    const repository = createRepository();
    const telemetry = createTelemetry();
    const result = await createUseCase(repository, telemetry).execute(1001, 'awakening_empty_master');

    expect(repository.claimQuestReward).toHaveBeenCalledWith(
      1,
      'awakening_empty_master',
      { gold: 5, inventoryDelta: { usualShards: 1 } },
    );
    expect(result.claimedNow).toBe(true);
    expect(result.book.claimedCount).toBe(1);
    expect(telemetry.questRewardClaimed).toHaveBeenCalledWith(1, {
      playerId: 1,
      questCode: 'awakening_empty_master',
      questStatus: 'CLAIMED',
      readyToClaimCount: 0,
      claimedCount: 1,
    });
  });

  it('does not apply a reward that is already in the claimed ledger', async () => {
    const repository = createRepository(createPlayer(), ['awakening_empty_master']);
    const telemetry = createTelemetry();
    const result = await createUseCase(repository, telemetry).execute(1001, 'awakening_empty_master');

    expect(repository.claimQuestReward).not.toHaveBeenCalled();
    expect(result.claimedNow).toBe(false);
    expect(result.quest.status).toBe('CLAIMED');
    expect(telemetry.questRewardReplayed).toHaveBeenCalledWith(1, {
      playerId: 1,
      questCode: 'awakening_empty_master',
      questStatus: 'CLAIMED',
      readyToClaimCount: 0,
      claimedCount: 1,
    });
  });

  it('tracks not-ready claims before returning the domain error', async () => {
    const player = createPlayer({ victories: 0, mobsKilled: 0 });
    const repository = createRepository(player);
    const telemetry = createTelemetry();

    await expect(createUseCase(repository, telemetry).execute(1001, 'awakening_empty_master'))
      .rejects.toMatchObject({ code: 'quest_not_ready' });

    expect(repository.claimQuestReward).not.toHaveBeenCalled();
    expect(telemetry.questRewardNotReady).toHaveBeenCalledWith(1, {
      playerId: 1,
      questCode: 'awakening_empty_master',
      questStatus: 'IN_PROGRESS',
      readyToClaimCount: 0,
      claimedCount: 0,
    });
  });

  it('still returns a claimed quest when telemetry logging fails after persistence', async () => {
    const repository = createRepository();
    const telemetry = createTelemetry();
    telemetry.questRewardClaimed.mockRejectedValueOnce(new Error('telemetry offline'));

    await expect(createUseCase(repository, telemetry).execute(1001, 'awakening_empty_master'))
      .resolves.toMatchObject({
        claimedNow: true,
        book: { claimedCount: 1 },
      });
  });
});
