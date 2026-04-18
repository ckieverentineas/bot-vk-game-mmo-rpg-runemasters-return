import { readFileSync } from 'node:fs';

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
  allocation: {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  progress: {
    playerId: 1,
    unspentStatPoints: 1,
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
  allocationPoints: {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  unspentStatPoints: 1,
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
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
});

const createPrismaMock = () => {
  const tx = {
    player: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
