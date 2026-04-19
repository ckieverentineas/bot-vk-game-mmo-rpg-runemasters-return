import { readFileSync } from 'node:fs';

import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { BattleView, PlayerState, RuneDraft, StatBlock } from '../../../../shared/types/game';
import { PrismaGameRepository } from './PrismaGameRepository';

const readFixture = <T>(fileName: string): T => JSON.parse(
  readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), 'utf8'),
) as T;

const createPlayerRecord = () => ({
  id: 1,
  userId: 10,
  level: 3,
  experience: 12,
  gold: 7,
  baseHealth: 8,
  baseAttack: 4,
  baseDefence: 3,
  baseMagicDefence: 1,
  baseDexterity: 2,
  baseIntelligence: 1,
  createdAt: new Date('2026-04-12T00:00:00.000Z'),
  updatedAt: new Date('2026-04-12T00:00:00.000Z'),
  user: {
    vkId: 1001,
  },
  progress: {
    playerId: 1,
    locationLevel: 1,
    currentRuneIndex: 0,
    activeBattleId: null,
    tutorialState: 'SKIPPED',
    victories: 2,
    victoryStreak: 1,
    defeats: 0,
    defeatStreak: 0,
    mobsKilled: 2,
    highestLocationLevel: 2,
    updatedAt: new Date('2026-04-12T00:00:00.000Z'),
  },
  inventory: {
    playerId: 1,
    usualShards: 15,
    unusualShards: 4,
    rareShards: 1,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
    updatedAt: new Date('2026-04-12T00:00:00.000Z'),
  },
  schoolMasteries: [],
  runes: [],
});

const createBattleRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  battleSnapshot: null,
  playerLoadoutSnapshot: null,
  locationLevel: 1,
  biomeCode: 'initium',
  enemyCode: 'slime',
  enemyName: 'Слизень',
  turnOwner: 'PLAYER',
  playerSnapshot: JSON.stringify({
    playerId: 1,
    name: 'Рунный мастер #1001',
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
  }),
  enemySnapshot: JSON.stringify({
    code: 'slime',
    name: 'Слизень',
    kind: 'enemy',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 0,
    maxHealth: 5,
    currentHealth: 5,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 4,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'бьёт',
  }),
  log: JSON.stringify(['Враг найден.']),
  result: null,
  rewardsSnapshot: null,
  createdAt: new Date('2026-04-12T00:00:00.000Z'),
  updatedAt: new Date('2026-04-12T00:00:00.000Z'),
  ...overrides,
});

const createBattleView = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'initium',
  enemyCode: 'slime',
  turnOwner: 'PLAYER',
  player: {
    playerId: 1,
    name: 'Рунный мастер #1001',
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
  },
  enemy: {
    code: 'slime',
    name: 'Слизень',
    kind: 'enemy',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 0,
    maxHealth: 5,
    currentHealth: 0,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 4,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'бьёт',
  },
  log: ['Победа.'],
  result: 'VICTORY',
  rewards: {
    experience: 4,
    gold: 2,
    shards: { USUAL: 2 },
    droppedRune: null,
  },
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRuneDraft = (): RuneDraft => ({
  runeCode: 'rune-1',
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: 'Обычная руна Пламени',
  rarity: 'USUAL',
  isEquipped: false,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const createStats = (): StatBlock => ({
  health: 1,
  attack: 3,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const createPlayerStateSnapshot = (): PlayerState => ({
  userId: 10,
  vkId: 1001,
  playerId: 1,
  level: 3,
  experience: 12,
  gold: 7,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 2,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 2,
  highestLocationLevel: 2,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 15,
    unusualShards: 4,
    rareShards: 1,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
  },
  schoolMasteries: [],
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
});

const createPrismaMock = () => {
  const tx = {
    player: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    playerProgress: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    playerInventory: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    rune: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    rewardLedgerRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    commandIntentRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deletePlayerReceipt: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    playerSchoolMastery: {
      upsert: vi.fn(),
    },
    battleSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    gameLog: {
      create: vi.fn(),
    },
  };

  const prisma = {
    ...tx,
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  return {
    prisma,
    tx,
    repository: new PrismaGameRepository(prisma as never),
  };
};

describe('PrismaGameRepository release hardening', () => {
  it('does not craft a rune when shards were already spent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerInventory.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.craftRune(1, 'USUAL', createRuneDraft())).rejects.toMatchObject({
      code: 'not_enough_shards',
    });

    expect(tx.rune.create).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        playerId: 1,
        usualShards: { gte: 10 },
      }),
    }));
  });

  it('recovers a canonical player after a vkId uniqueness race during creation', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPlayerRecord());
    tx.user.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Unique conflict', {
      code: 'P2002',
      clientVersion: 'test',
      meta: {
        target: ['vkId'],
      },
    }));

    const result = await repository.createPlayer(1001);

    expect(result.created).toBe(false);
    expect(result.recoveredFromRace).toBe(true);
    expect(result.player.playerId).toBe(1);
  });

  it('creates new players without fresh legacy stat points', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.findFirst.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({
      player: createPlayerRecord(),
    });

    const result = await repository.createPlayer(1001);

    expect(result.created).toBe(true);
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        player: expect.objectContaining({
          create: expect.objectContaining({
            progress: expect.objectContaining({
              create: expect.objectContaining({
                locationLevel: 0,
              }),
            }),
          }),
        }),
      }),
    }));
  });

  it('replays a confirmed delete intent without requiring the deleted player row', async () => {
    const { repository, tx } = createPrismaMock();

    tx.deletePlayerReceipt.findUnique.mockResolvedValue({
      stateKey: '2026-04-12T00:00:00.000Z',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify({
        vkId: 1001,
        deletedPlayerId: 1,
        deletedPlayerUpdatedAt: '2026-04-12T00:00:00.000Z',
        deletedPlayerLevel: 3,
        deletedRuneCount: 0,
        deletedAt: '2026-04-18T00:00:00.000Z',
      }),
      expiresAt: new Date('2026-04-25T00:00:00.000Z'),
    });

    await expect(repository.confirmDeletePlayer(1001, 'intent-delete-1', '2026-04-12T00:00:00.000Z')).resolves.toBeUndefined();

    expect(tx.player.findFirst).not.toHaveBeenCalled();
    expect(tx.player.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it('deletes the player once and finalizes the delete receipt', async () => {
    const { repository, tx } = createPrismaMock();

    tx.deletePlayerReceipt.findUnique.mockResolvedValue(null);
    tx.player.findFirst.mockResolvedValue({
      id: 1,
      level: 3,
      updatedAt: new Date('2026-04-12T00:00:00.000Z'),
      runes: [{ id: 'rune-1' }, { id: 'rune-2' }],
    });
    tx.deletePlayerReceipt.create.mockResolvedValue({ id: 'receipt-1' });
    tx.player.deleteMany.mockResolvedValue({ count: 1 });
    tx.user.delete.mockResolvedValue({ id: 10, vkId: 1001 });
    tx.deletePlayerReceipt.update.mockResolvedValue({ id: 'receipt-1' });

    await expect(repository.confirmDeletePlayer(1001, 'intent-delete-2', '2026-04-12T00:00:00.000Z')).resolves.toBeUndefined();

    expect(tx.deletePlayerReceipt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        scopeVkId: 1001,
        intentId: 'intent-delete-2',
        stateKey: '2026-04-12T00:00:00.000Z',
      }),
    }));
    expect(tx.player.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 1,
        updatedAt: new Date('2026-04-12T00:00:00.000Z'),
      }),
    }));
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { vkId: 1001 } });
    expect(tx.deletePlayerReceipt.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'APPLIED',
        appliedAt: expect.any(Date),
      }),
    }));
  });

  it('rejects stale delete confirmations before reserving a delete receipt', async () => {
    const { repository, tx } = createPrismaMock();

    tx.deletePlayerReceipt.findUnique.mockResolvedValue(null);
    tx.player.findFirst.mockResolvedValue({
      id: 1,
      level: 3,
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      runes: [],
    });

    await expect(repository.confirmDeletePlayer(1001, 'intent-delete-3', '2026-04-12T00:00:00.000Z')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(tx.deletePlayerReceipt.create).not.toHaveBeenCalled();
    expect(tx.player.deleteMany).not.toHaveBeenCalled();
  });

  it('returns retry-pending for duplicate delete confirmation while the receipt is still pending', async () => {
    const { repository, tx } = createPrismaMock();

    tx.deletePlayerReceipt.findUnique.mockResolvedValue({
      stateKey: '2026-04-12T00:00:00.000Z',
      status: 'PENDING',
      resultSnapshot: '{}',
      expiresAt: new Date('2026-04-25T00:00:00.000Z'),
    });

    await expect(repository.confirmDeletePlayer(1001, 'intent-delete-4', '2026-04-12T00:00:00.000Z')).rejects.toMatchObject({
      code: 'command_retry_pending',
    });

    expect(tx.player.findFirst).not.toHaveBeenCalled();
  });

  it('returns canonical crafted result for a duplicate command intent without spending again', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'CRAFT_RUNE',
      stateKey: 'state-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createPlayerStateSnapshot()),
    });

    const player = await repository.craftRune(1, 'USUAL', createRuneDraft(), 'intent-1', 'state-1', 'state-1');

    expect(player.playerId).toBe(1);
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.rune.create).not.toHaveBeenCalled();
  });

  it('returns canonical exploration result for a duplicate tutorial navigation intent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'RETURN_TO_ADVENTURE',
      stateKey: 'state-return-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createPlayerStateSnapshot()),
    });

    const player = await repository.saveExplorationState(1, {
      locationLevel: 1,
      highestLocationLevel: 2,
      victoryStreak: 1,
      defeatStreak: 0,
      tutorialState: 'SKIPPED',
    }, {
      commandKey: 'RETURN_TO_ADVENTURE',
      intentId: 'intent-return-1',
      intentStateKey: 'state-return-1',
      expectedLocationLevel: 0,
      expectedHighestLocationLevel: 2,
      expectedVictoryStreak: 1,
      expectedDefeatStreak: 0,
      expectedTutorialState: 'ACTIVE',
    });

    expect(player.playerId).toBe(1);
    expect(tx.playerProgress.updateMany).not.toHaveBeenCalled();
  });

  it('returns canonical tutorial-entry result for a duplicate enter tutorial intent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'ENTER_TUTORIAL_MODE',
      stateKey: 'state-location-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createPlayerStateSnapshot()),
    });

    const player = await repository.saveExplorationState(1, {
      locationLevel: 0,
      highestLocationLevel: 2,
      victoryStreak: 1,
      defeatStreak: 0,
      tutorialState: 'ACTIVE',
    }, {
      commandKey: 'ENTER_TUTORIAL_MODE',
      intentId: 'intent-location-1',
      intentStateKey: 'state-location-1',
      expectedActiveBattleId: null,
      expectedLocationLevel: 1,
      expectedHighestLocationLevel: 2,
      expectedVictoryStreak: 1,
      expectedDefeatStreak: 0,
      expectedTutorialState: 'ACTIVE',
    });

    expect(player.playerId).toBe(1);
    expect(tx.playerProgress.updateMany).not.toHaveBeenCalled();
  });

  it('rejects replay lookups when the stored command key does not match the expected battle action rail', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'ALLOCATE_STAT_POINT',
      stateKey: 'state-profile-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createPlayerStateSnapshot()),
    });

    await expect(repository.getCommandIntentResult(1, 'intent-cross-1', ['BATTLE_ATTACK'])).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('rejects replay lookups when the stored state key does not match the expected battle rail', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'BATTLE_ATTACK',
      stateKey: 'state-battle-old',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createBattleView()),
    });

    await expect(repository.getCommandIntentResult(1, 'intent-battle-stale', ['BATTLE_ATTACK'], 'state-battle-new')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('returns canonical battle result for a duplicate saved battle action intent', async () => {
    const { repository, tx } = createPrismaMock();
    const replayedBattle = createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      turnOwner: 'ENEMY',
    });

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'BATTLE_ATTACK',
      stateKey: 'state-battle-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(replayedBattle),
    });

    const battle = await repository.saveBattle(createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
    }), {
      commandKey: 'BATTLE_ATTACK',
      intentId: 'intent-battle-1',
      intentStateKey: 'state-battle-1',
      currentStateKey: 'state-battle-1',
    });

    expect(battle.status).toBe('ACTIVE');
    expect(battle.turnOwner).toBe('ENEMY');
    expect(tx.battleSession.updateMany).not.toHaveBeenCalled();
  });

  it('returns canonical rune cursor result for a duplicate navigation intent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'MOVE_RUNE_CURSOR',
      stateKey: 'state-rune-page-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createPlayerStateSnapshot()),
    });

    const player = await repository.saveRuneCursor(1, 1, {
      commandKey: 'MOVE_RUNE_CURSOR',
      intentId: 'intent-rune-page-1',
      intentStateKey: 'state-rune-page-1',
      expectedPlayerUpdatedAt: '2026-04-12T00:00:00.000Z',
    });

    expect(player.playerId).toBe(1);
    expect(tx.playerProgress.update).not.toHaveBeenCalled();
  });

  it('rejects stale rune cursor writes when player freshness token changed', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.saveRuneCursor(1, 1, {
      commandKey: 'SELECT_RUNE_PAGE_SLOT',
      intentId: 'intent-rune-slot-stale',
      intentStateKey: 'state-rune-slot-stale',
      expectedPlayerUpdatedAt: '2026-04-12T00:00:00.000Z',
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('returns canonical finalized battle result for a duplicate battle action intent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'BATTLE_ATTACK',
      stateKey: 'state-battle-final',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createBattleView()),
    });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());

    const finalized = await repository.finalizeBattle(1, createBattleView(), {
      commandKey: 'BATTLE_ATTACK',
      intentId: 'intent-battle-final',
      intentStateKey: 'state-battle-final',
      currentStateKey: 'state-battle-final',
    });

    expect(finalized.battle.status).toBe('COMPLETED');
    expect(finalized.player.playerId).toBe(1);
    expect(tx.battleSession.updateMany).not.toHaveBeenCalled();
  });

  it('rejects stale exploration writes when the expected tutorial state no longer matches', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerProgress.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.saveExplorationState(1, {
      locationLevel: 1,
      highestLocationLevel: 2,
      victoryStreak: 1,
      defeatStreak: 0,
      tutorialState: 'SKIPPED',
    }, {
      commandKey: 'SKIP_TUTORIAL',
      intentId: 'intent-skip-stale',
      intentStateKey: 'state-skip-stale',
      expectedLocationLevel: 0,
      expectedHighestLocationLevel: 2,
      expectedVictoryStreak: 1,
      expectedDefeatStreak: 0,
      expectedTutorialState: 'ACTIVE',
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('rejects exploration writes when an active battle appeared after the state snapshot', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerProgress.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.saveExplorationState(1, {
      locationLevel: 1,
      highestLocationLevel: 2,
      victoryStreak: 1,
      defeatStreak: 0,
      tutorialState: 'SKIPPED',
    }, {
      commandKey: 'RETURN_TO_ADVENTURE',
      intentId: 'intent-return-battle',
      intentStateKey: 'state-return-battle',
      expectedActiveBattleId: null,
      expectedLocationLevel: 0,
      expectedHighestLocationLevel: 2,
      expectedVictoryStreak: 1,
      expectedDefeatStreak: 0,
      expectedTutorialState: 'ACTIVE',
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('does not reroll rune stats when the last shard is gone', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerInventory.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.rerollRuneStat(1, 'rune-1', 'USUAL', createStats())).rejects.toMatchObject({
      code: 'not_enough_shards',
    });

    expect(tx.rune.updateMany).not.toHaveBeenCalled();
  });

  it('does not refund shards when the rune was already destroyed', async () => {
    const { repository, tx } = createPrismaMock();

    tx.rune.deleteMany.mockResolvedValue({ count: 0 });

    await expect(repository.destroyRune(1, 'rune-1', { usualShards: 2 })).rejects.toMatchObject({
      code: 'rune_not_found',
    });

    expect(tx.playerInventory.update).not.toHaveBeenCalled();
  });

  it('reuses an existing active battle instead of creating a duplicate', async () => {
    const { repository, tx } = createPrismaMock();
    const existingBattle = createBattleRow();

    tx.battleSession.findFirst.mockResolvedValue(existingBattle);
    tx.playerProgress.update.mockResolvedValue({});

    const battle = await repository.createBattle(1, createBattleView({ status: 'ACTIVE', result: null, rewards: null }));

    expect(battle.id).toBe(existingBattle.id);
    expect(tx.battleSession.create).not.toHaveBeenCalled();
    expect(tx.playerProgress.update).toHaveBeenCalledWith({
      where: { playerId: 1 },
      data: { activeBattleId: existingBattle.id },
    });
  });

  it('returns canonical exploration battle for a duplicate explore command intent', async () => {
    const { repository, tx } = createPrismaMock();
    const replayedBattle = createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
    });

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'EXPLORE_LOCATION',
      stateKey: 'state-explore-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(replayedBattle),
    });

    const battle = await repository.createBattle(1, createBattleView({ status: 'ACTIVE', result: null, rewards: null }), {
      commandKey: 'EXPLORE_LOCATION',
      intentId: 'intent-explore-1',
      intentStateKey: 'state-explore-1',
      currentStateKey: 'state-explore-1',
    });

    expect(battle.id).toBe(replayedBattle.id);
    expect(tx.battleSession.create).not.toHaveBeenCalled();
    expect(tx.playerProgress.update).not.toHaveBeenCalled();
  });

  it('rejects stale explore command writes when the expected exploration state no longer matches', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);

    await expect(repository.createBattle(1, createBattleView({ status: 'ACTIVE', result: null, rewards: null }), {
      commandKey: 'EXPLORE_LOCATION',
      intentId: 'intent-explore-stale',
      intentStateKey: 'state-explore-old',
      currentStateKey: 'state-explore-new',
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(tx.battleSession.create).not.toHaveBeenCalled();
  });

  it('writes the versioned battle snapshot contract when saving battle state', async () => {
    const { repository, tx } = createPrismaMock();
    const persistedBattle = createBattleRow({
      actionRevision: 1,
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-v1.json')),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    const saved = await repository.saveBattle(createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      enemy: {
        ...createBattleView().enemy,
        currentHealth: 5,
      },
      actionRevision: 0,
    }));

    expect(saved.actionRevision).toBe(1);
    const persistedSnapshot = JSON.parse((tx.battleSession.updateMany.mock.calls[0]?.[0]?.data?.battleSnapshot as string) ?? '{}');
    expect(persistedSnapshot.actionRevision).toBe(1);
    expect(tx.battleSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        battleSnapshot: expect.any(String),
      }),
    }));
  });

  it('treats repeated battle finalization as idempotent', async () => {
    const { repository, tx } = createPrismaMock();
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(createBattleView().rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 0 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    const finalized = await repository.finalizeBattle(1, createBattleView());

    expect(finalized.player.playerId).toBe(1);
    expect(finalized.battle.id).toBe(persistedBattle.id);
    expect(tx.player.update).not.toHaveBeenCalled();
    expect(tx.playerProgress.update).not.toHaveBeenCalled();
    expect(tx.playerInventory.update).not.toHaveBeenCalled();
    expect(tx.rune.create).not.toHaveBeenCalled();
    expect(tx.rewardLedgerRecord.create).not.toHaveBeenCalled();
  });

  it('creates a reward ledger entry for the canonical victory reward', async () => {
    const { repository, tx } = createPrismaMock();
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(createBattleView().rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    const finalized = await repository.finalizeBattle(1, createBattleView());

    expect(finalized.battle.status).toBe('COMPLETED');
    expect(tx.rewardLedgerRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 1,
        ledgerKey: 'battle-victory:battle-1',
        sourceType: 'BATTLE_VICTORY',
        sourceId: 'battle-1',
        status: 'APPLIED',
      }),
    });
    expect(tx.gameLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'reward_claim_applied',
      }),
    });
  });

  it('levels up from battle rewards without touching any removed stat-point state', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    currentPlayer.level = 1;
    currentPlayer.experience = 49;
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify({
        ...createBattleView().rewards,
        experience: 11,
      }),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, createBattleView({
      rewards: {
        experience: 11,
        gold: 2,
        shards: { USUAL: 2 },
        droppedRune: null,
      },
    }));

    expect(tx.player.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        level: 2,
        experience: 0,
      }),
    }));
    expect(tx.playerProgress.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        activeBattleId: null,
      }),
    }));
  });

  it('awards school mastery progress from the school that actually fought the battle', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    currentPlayer.runes = [{
      id: 'rune-stone-1',
      runeCode: 'rune-stone-1',
      archetypeCode: 'stone',
      passiveAbilityCodes: '[]',
      activeAbilityCodes: '[]',
      name: 'Руна Тверди',
      rarity: 'USUAL',
      health: 0,
      attack: 1,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
      isEquipped: true,
      createdAt: new Date('2026-04-12T00:00:00.000Z'),
      updatedAt: new Date('2026-04-12T00:00:00.000Z'),
    }];
    currentPlayer.schoolMasteries = [{
      playerId: 1,
      schoolCode: 'ember',
      experience: 2,
      rank: 0,
      updatedAt: new Date('2026-04-12T00:00:00.000Z'),
    }];
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(createBattleView().rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, createBattleView({
      player: {
        ...createBattleView().player,
        runeLoadout: {
          runeId: 'rune-ember-1',
          runeName: 'Руна Пламени',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          schoolMasteryRank: 0,
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: null,
        },
      },
    }));

    expect(tx.playerSchoolMastery.upsert).toHaveBeenCalledWith({
      where: {
        playerId_schoolCode: {
          playerId: 1,
          schoolCode: 'ember',
        },
      },
      update: {
        experience: 3,
        rank: 1,
      },
      create: {
        playerId: 1,
        schoolCode: 'ember',
        experience: 3,
        rank: 1,
      },
    });
  });

  it('does not snap skipped players back to intro after finishing a stale intro battle', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    currentPlayer.level = 5;
    currentPlayer.progress.tutorialState = 'SKIPPED';
    currentPlayer.progress.locationLevel = 0;
    currentPlayer.progress.activeBattleId = 'battle-1';
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'DEFEAT',
      locationLevel: 0,
      rewardsSnapshot: null,
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, createBattleView({
      locationLevel: 0,
      result: 'DEFEAT',
      rewards: null,
      log: ['Поражение.'],
    }));

    expect(tx.playerProgress.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        locationLevel: 1,
        tutorialState: 'SKIPPED',
      }),
    }));
  });

  it('hydrates legacy battle snapshots without rune combat fields', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow());

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.runeLoadout ?? null).toBeNull();
    expect(battle?.player.guardPoints ?? 0).toBe(0);
  });

  it('preserves rune cooldown and guard state when reading persisted battles', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      playerSnapshot: JSON.stringify(readFixture('battle-player-legacy.json')),
      enemySnapshot: JSON.stringify(readFixture('battle-enemy-legacy.json')),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.guardPoints).toBe(3);
    expect(battle?.player.runeLoadout?.activeAbility?.currentCooldown).toBe(1);
    expect(battle?.player.currentMana).toBe(1);
    expect(battle?.enemy.intent?.code).toBe('HEAVY_STRIKE');
    expect(battle?.enemy.hasUsedSignatureMove).toBe(false);
  });

  it('hydrates battle rune loadout from the frozen loadout snapshot contract', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      playerLoadoutSnapshot: JSON.stringify({
        schemaVersion: 1,
        runeId: 'rune-1',
        runeName: 'Руна Пламени',
        archetypeCode: 'ember',
        passiveAbilityCodes: ['ember_heart'],
        activeAbility: {
          code: 'ember_pulse',
          name: 'Импульс углей',
          manaCost: 3,
          cooldownTurns: 2,
        },
      }),
      playerSnapshot: JSON.stringify({
        playerId: 1,
        name: 'Рунный мастер #1001',
        attack: 4,
        defence: 3,
        magicDefence: 1,
        dexterity: 2,
        intelligence: 1,
        maxHealth: 8,
        currentHealth: 8,
        maxMana: 4,
        currentMana: 4,
      }),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.runeLoadout?.runeId).toBe('rune-1');
    expect(battle?.player.runeLoadout?.activeAbility?.currentCooldown).toBe(0);
    expect(battle?.player.runeLoadout?.archetypeName).toBe('Штурм');
  });

  it('preserves school mastery fields when hydrating a persisted loadout snapshot', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      playerLoadoutSnapshot: JSON.stringify({
        schemaVersion: 1,
        runeId: 'rune-1',
        runeName: 'Руна Пламени',
        archetypeCode: 'ember',
        schoolCode: 'ember',
        schoolMasteryRank: 1,
        passiveAbilityCodes: ['ember_heart'],
        activeAbility: {
          code: 'ember_pulse',
          name: 'Импульс углей',
          manaCost: 3,
          cooldownTurns: 2,
        },
      }),
      playerSnapshot: JSON.stringify({
        playerId: 1,
        name: 'Рунный мастер #1001',
        attack: 4,
        defence: 3,
        magicDefence: 1,
        dexterity: 2,
        intelligence: 1,
        maxHealth: 8,
        currentHealth: 8,
        maxMana: 4,
        currentMana: 4,
      }),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.runeLoadout?.schoolCode).toBe('ember');
    expect(battle?.player.runeLoadout?.schoolMasteryRank).toBe(1);
  });

  it('rejects unsupported loadout snapshot versions instead of silently masking them', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      playerLoadoutSnapshot: JSON.stringify({
        schemaVersion: 99,
        runeId: 'rune-1',
      }),
    }));

    await expect(repository.getActiveBattle(1)).rejects.toMatchObject({
      code: 'loadout_snapshot_invalid',
    });
  });

  it('falls back to the legacy battle loadout when the versioned snapshot is newer than the runtime', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      playerLoadoutSnapshot: JSON.stringify({
        schemaVersion: 99,
      }),
      playerSnapshot: JSON.stringify({
        ...readFixture<Record<string, unknown>>('battle-player-legacy.json'),
        guardPoints: 1,
      }),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.runeLoadout?.runeId).toBe('rune-1');
    expect(battle?.player.runeLoadout?.activeAbility?.currentCooldown).toBe(1);
    expect(battle?.player.guardPoints).toBe(1);
  });

  it('hydrates the canonical battle state from the versioned battle snapshot contract', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-v1.json')),
      playerSnapshot: JSON.stringify({ playerId: 1, name: 'Legacy fallback' }),
      enemySnapshot: JSON.stringify({ code: 'legacy-enemy', name: 'Legacy fallback' }),
      log: JSON.stringify(['legacy']),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.currentHealth).toBe(7);
    expect(battle?.player.runeLoadout?.activeAbility?.currentCooldown).toBe(1);
    expect(battle?.enemy.intent?.code).toBe('HEAVY_STRIKE');
    expect(battle?.log).toContain('🛡️ Защита смягчает удар на 2 урона.');
  });

  it('falls back to legacy columns when the persisted battle snapshot is from a newer schema', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-future.json')),
      playerSnapshot: JSON.stringify(readFixture('battle-player-legacy.json')),
      enemySnapshot: JSON.stringify(readFixture('battle-enemy-legacy.json')),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.player.currentHealth).toBe(8);
    expect(battle?.enemy.kind).toBe('wolf');
  });

  it('falls back to newer legacy columns when a rollback left the versioned battle snapshot stale', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      actionRevision: 1,
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-v1.json')),
      playerSnapshot: JSON.stringify({
        ...readFixture<Record<string, unknown>>('battle-player-legacy.json'),
        currentHealth: 5,
      }),
      log: JSON.stringify(['legacy-after-rollback']),
    }));

    const battle = await repository.getActiveBattle(1);

    expect(battle?.actionRevision).toBe(1);
    expect(battle?.player.currentHealth).toBe(5);
    expect(battle?.log).toEqual(['legacy-after-rollback']);
  });
});
