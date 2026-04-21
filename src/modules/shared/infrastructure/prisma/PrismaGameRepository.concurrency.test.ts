import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { env } from '../../../../config/env';
import { gameBalance } from '../../../../config/game-balance';
import type { CreateBattleInput, PlayerState, RuneDraft, StatBlock } from '../../../../shared/types/game';
import { PrismaGameRepository } from './PrismaGameRepository';

const battleStats: StatBlock = {
  health: 8,
  attack: 4,
  defence: 3,
  magicDefence: 1,
  dexterity: 3,
  intelligence: 1,
};

const createRuneDraft = (name = 'Обычная руна Пламени'): RuneDraft => ({
  runeCode: `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(16).slice(2)}`,
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name,
  rarity: 'USUAL',
  isEquipped: false,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const createBattleInput = (playerId: number): CreateBattleInput => ({
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'initium',
  enemyCode: 'slime',
  turnOwner: 'PLAYER',
  player: {
    playerId,
    name: `Рунный мастер #${playerId}`,
    attack: battleStats.attack,
    defence: battleStats.defence,
    magicDefence: battleStats.magicDefence,
    dexterity: battleStats.dexterity,
    intelligence: battleStats.intelligence,
    maxHealth: battleStats.health,
    currentHealth: battleStats.health,
    maxMana: battleStats.intelligence * 4,
    currentMana: battleStats.intelligence * 4,
    runeLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'slime',
    name: 'Слизень',
    kind: 'slime',
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
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['Враг найден.'],
  result: null,
  rewards: null,
});

const toCompletedVictoryBattle = (battle: Awaited<ReturnType<PrismaGameRepository['createBattle']>>, droppedRune: RuneDraft) => ({
  ...battle,
  status: 'COMPLETED' as const,
  result: 'VICTORY' as const,
  enemy: {
    ...battle.enemy,
    currentHealth: 0,
  },
  rewards: {
    experience: battle.enemy.experienceReward,
    gold: battle.enemy.goldReward,
    shards: { USUAL: 2 },
    droppedRune,
  },
  log: [...battle.log, '🏆 Победа!'],
});

const splitSqlScript = (script: string): string[] => script
  .split(';')
  .map((statement) => statement
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .trim())
  .filter((statement) => statement.length > 0);

const applyCurrentPrismaSchema = async (prisma: PrismaClient): Promise<void> => {
  const script = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
    cwd: process.cwd(),
    stdio: 'pipe',
  }).toString('utf8');

  for (const statement of splitSqlScript(script)) {
    await prisma.$executeRawUnsafe(statement);
  }
};

describe.sequential('PrismaGameRepository concurrency rails', () => {
  const dbPath = path.join(tmpdir(), `runemasters-concurrency-${process.pid}-${Date.now()}.db`);
  const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;
  let prisma: PrismaClient;
  let repository: PrismaGameRepository;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    await applyCurrentPrismaSchema(prisma);

    repository = new PrismaGameRepository(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }

    if (existsSync(dbPath)) {
      rmSync(dbPath, { force: true });
    }
  });

  beforeEach(async () => {
    await prisma.deletePlayerReceipt.deleteMany();
    await prisma.gameLog.deleteMany();
    await prisma.rewardLedgerRecord.deleteMany();
    await prisma.battleSession.deleteMany();
    await prisma.rune.deleteMany();
    await prisma.playerInventory.deleteMany();
    await prisma.playerSchoolMastery.deleteMany();
    await prisma.playerProgress.deleteMany();
    await prisma.player.deleteMany();
    await prisma.user.deleteMany();
  });

  const createPlayer = async (vkId: number): Promise<PlayerState> => (await repository.createPlayer(vkId)).player;

  it('returns one canonical player under parallel first-start creation', async () => {
    const [first, second] = await Promise.all([
      repository.createPlayer(2999),
      repository.createPlayer(2999),
    ]);

    expect(first.player.playerId).toBe(second.player.playerId);
    expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
    expect([first.recoveredFromRace, second.recoveredFromRace].filter(Boolean)).toHaveLength(1);

    const users = await prisma.user.count({ where: { vkId: 2999 } });
    const players = await prisma.player.count({ where: { user: { vkId: 2999 } } });

    expect(users).toBe(1);
    expect(players).toBe(1);
  });

  it('starts newly created players without fresh legacy stat points', async () => {
    const player = await createPlayer(2998);

    expect(player.level).toBe(env.game.startingLevel);
    expect(player.schoolMasteries?.length).toBeGreaterThan(0);
  });

  it('treats parallel delete confirmations for one intent as one destructive action', async () => {
    const player = await createPlayer(2032);
    const intentId = 'intent-delete-2032';
    const stateKey = player.updatedAt;

    const results = await Promise.allSettled([
      repository.confirmDeletePlayer(2032, intentId, stateKey),
      repository.confirmDeletePlayer(2032, intentId, stateKey),
    ]);

    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (rejected.length > 0) {
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: 'command_retry_pending' });
    }

    await expect(repository.confirmDeletePlayer(2032, intentId, stateKey)).resolves.toBeUndefined();

    expect(await prisma.user.count({ where: { vkId: 2032 } })).toBe(0);
    expect(await prisma.player.count({ where: { user: { vkId: 2032 } } })).toBe(0);
    expect(await prisma.deletePlayerReceipt.count({ where: { scopeVkId: 2032, intentId, status: 'APPLIED' } })).toBe(1);
  });

  it('rejects an old delete confirmation after the player was recreated', async () => {
    const original = await createPlayer(2033);
    const staleStateKey = original.updatedAt;

    await repository.confirmDeletePlayer(2033, 'intent-delete-2033-success', staleStateKey);
    const recreated = await createPlayer(2033);

    await expect(repository.confirmDeletePlayer(2033, 'intent-delete-2033-stale', staleStateKey)).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(recreated.playerId).not.toBe(original.playerId);
    expect(await prisma.user.count({ where: { vkId: 2033 } })).toBe(1);
  });

  it('reuses one active battle under parallel createBattle calls', async () => {
    const player = await createPlayer(2001);
    const input = createBattleInput(player.playerId);

    const [first, second] = await Promise.all([
      repository.createBattle(player.playerId, input),
      repository.createBattle(player.playerId, input),
    ]);

    expect(first.id).toBe(second.id);
    expect(first.actionRevision).toBe(0);

    const activeBattles = await prisma.battleSession.count({
      where: {
        playerId: player.playerId,
        status: 'ACTIVE',
      },
    });

    expect(activeBattles).toBe(1);
  });

  it('accepts only one parallel active-battle mutation and logs the stale branch', async () => {
    const player = await createPlayer(2002);
    const activeBattle = await repository.createBattle(player.playerId, createBattleInput(player.playerId));

    const attackBranch = {
      ...activeBattle,
      turnOwner: 'ENEMY' as const,
      enemy: {
        ...activeBattle.enemy,
        currentHealth: 3,
      },
      log: [...activeBattle.log, '⚔️ Вы атакуете.'],
    };

    const defendBranch = {
      ...activeBattle,
      turnOwner: 'ENEMY' as const,
      player: {
        ...activeBattle.player,
        guardPoints: 3,
      },
      log: [...activeBattle.log, '🛡️ Вы готовите защиту.'],
    };

    const [first, second] = await Promise.all([
      repository.saveBattle(attackBranch),
      repository.saveBattle(defendBranch),
    ]);

    expect(first.actionRevision).toBe(1);
    expect(second.actionRevision).toBe(1);
    expect(first.log).toEqual(second.log);

    const staleLogs = await prisma.gameLog.count({
      where: {
        action: 'battle_stale_action_rejected',
      },
    });

    expect(staleLogs).toBe(1);
  });

  it('prefers the fresh versioned battle snapshot over stale legacy columns when revisions match', async () => {
    const player = await createPlayer(2008);
    const activeBattle = await repository.createBattle(player.playerId, createBattleInput(player.playerId));
    const savedBattle = await repository.saveBattle({
      ...activeBattle,
      turnOwner: 'ENEMY',
      player: {
        ...activeBattle.player,
        currentHealth: 6,
      },
      enemy: {
        ...activeBattle.enemy,
        currentHealth: 3,
      },
      log: [...activeBattle.log, '⚔️ Версионированный snapshot теперь главный.'],
    });

    const persistedBattle = await prisma.battleSession.findUnique({
      where: { id: savedBattle.id },
    });

    expect(persistedBattle?.battleSnapshot).toBeTruthy();
    const persistedSnapshot = JSON.parse(persistedBattle?.battleSnapshot ?? '{}') as { actionRevision?: number };
    expect(persistedSnapshot.actionRevision).toBe(savedBattle.actionRevision);

    await prisma.battleSession.update({
      where: { id: savedBattle.id },
      data: {
        playerSnapshot: JSON.stringify({
          ...savedBattle.player,
          currentHealth: 1,
        }),
        log: JSON.stringify(['legacy-stale']),
      },
    });

    const reloadedBattle = await repository.getActiveBattle(player.playerId);

    expect(reloadedBattle?.player.currentHealth).toBe(6);
    expect(reloadedBattle?.log).toEqual(savedBattle.log);
  });

  it('returns the canonical victory result on parallel finalizeBattle calls', async () => {
    const player = await createPlayer(2003);
    const activeBattle = await repository.createBattle(player.playerId, createBattleInput(player.playerId));
    const droppedRune = createRuneDraft('Наградная руна Пламени');
    const completedBattle = toCompletedVictoryBattle(activeBattle, droppedRune);

    const [first, second] = await Promise.all([
      repository.finalizeBattle(player.playerId, completedBattle),
      repository.finalizeBattle(player.playerId, completedBattle),
    ]);

    expect(first.battle.status).toBe('COMPLETED');
    expect(second.battle.status).toBe('COMPLETED');
    expect(first.battle.actionRevision).toBe(1);
    expect(second.battle.actionRevision).toBe(1);
    expect(first.battle.rewards).toEqual(second.battle.rewards);

    const persistedPlayer = await repository.findPlayerById(player.playerId);
    expect(persistedPlayer?.gold).toBe(player.gold + completedBattle.rewards.gold);
    expect(persistedPlayer?.experience).toBe(player.experience + completedBattle.rewards.experience);
    expect(persistedPlayer?.inventory.usualShards).toBe(player.inventory.usualShards + 2);

    const rewardLedgerCount = await prisma.rewardLedgerRecord.count({
      where: {
        playerId: player.playerId,
      },
    });

    const runeCount = await prisma.rune.count({
      where: {
        playerId: player.playerId,
      },
    });

    expect(rewardLedgerCount).toBe(1);
    expect(runeCount).toBe(1);
  });

  it('returns the same canonical drop when parallel finalize branches resolve different random outcomes', async () => {
    const player = await createPlayer(20031);
    const activeBattle = await repository.createBattle(player.playerId, createBattleInput(player.playerId));
    const firstOutcome = toCompletedVictoryBattle(activeBattle, createRuneDraft('Наградная руна Пламени A'));
    const secondOutcome = toCompletedVictoryBattle(activeBattle, createRuneDraft('Наградная руна Пламени B'));

    const [first, second] = await Promise.all([
      repository.finalizeBattle(player.playerId, firstOutcome),
      repository.finalizeBattle(player.playerId, secondOutcome),
    ]);

    expect(first.battle.status).toBe('COMPLETED');
    expect(second.battle.status).toBe('COMPLETED');
    expect(first.battle.rewards).toEqual(second.battle.rewards);

    const persistedBattle = await repository.getActiveBattle(player.playerId);
    expect(persistedBattle).toBeNull();

    const persistedRunes = await prisma.rune.findMany({
      where: { playerId: player.playerId },
    });

    expect(persistedRunes).toHaveLength(1);
    expect([firstOutcome.rewards.droppedRune!.name, secondOutcome.rewards.droppedRune!.name]).toContain(persistedRunes[0]?.name);
    expect(first.battle.rewards?.droppedRune?.name).toBe(persistedRunes[0]?.name);
  });

  it('does not let finalizeBattle overwrite a newer active battle mutation from the same revision', async () => {
    const player = await createPlayer(2007);
    const activeBattle = await repository.createBattle(player.playerId, createBattleInput(player.playerId));
    const activeBranch = {
      ...activeBattle,
      turnOwner: 'ENEMY' as const,
      enemy: {
        ...activeBattle.enemy,
        currentHealth: 2,
      },
      log: [...activeBattle.log, '⚔️ Вы нанесли урон, но бой ещё не закончен.'],
    };
    const completedBranch = toCompletedVictoryBattle(activeBattle, createRuneDraft('Финальная руна Пламени'));

    const [saved, finalized] = await Promise.all([
      repository.saveBattle(activeBranch),
      repository.finalizeBattle(player.playerId, completedBranch),
    ]);

    expect(saved.actionRevision).toBe(1);
    expect(finalized.battle.actionRevision).toBe(1);
    expect(finalized.battle.status).toBe(saved.status);
    expect(finalized.battle.log).toEqual(saved.log);

    const rewardLedgerCount = await prisma.rewardLedgerRecord.count({
      where: {
        playerId: player.playerId,
      },
    });

    if (saved.status === 'COMPLETED') {
      expect(rewardLedgerCount).toBe(1);
    } else {
      expect(saved.status).toBe('ACTIVE');
      expect(rewardLedgerCount).toBe(0);
    }
  });

  it('spends shards only once under parallel craft attempts with one craft budget', async () => {
    const player = await createPlayer(2004);
    await prisma.playerInventory.update({
      where: { playerId: player.playerId },
      data: {
        usualShards: gameBalance.runes.craftCost,
        unusualShards: 0,
        rareShards: 0,
        epicShards: 0,
        legendaryShards: 0,
        mythicalShards: 0,
      },
    });

    const results = await Promise.allSettled([
      repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Крафтовая руна A')),
      repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Крафтовая руна B')),
    ]);

    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
    expect((results.find((entry) => entry.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({
      code: 'not_enough_shards',
    });

    const persistedPlayer = await repository.findPlayerById(player.playerId);
    const runeCount = await prisma.rune.count({ where: { playerId: player.playerId } });

    expect(persistedPlayer?.inventory.usualShards).toBe(0);
    expect(runeCount).toBe(1);
  });

  it('returns the canonical equip result for a duplicate intent', async () => {
    const player = await createPlayer(2021);
    await repository.createRune(player.playerId, createRuneDraft('Руна для экипировки'));
    const currentPlayer = await repository.findPlayerById(player.playerId);
    const rune = currentPlayer?.runes[0];

    const [first, second] = await Promise.all([
      repository.equipRune(player.playerId, rune!.id, {
        commandKey: 'EQUIP_RUNE',
        targetSlot: 0,
        intentId: 'intent-equip-1',
        intentStateKey: 'state-equip-1',
        expectedPlayerUpdatedAt: currentPlayer!.updatedAt,
        expectedCurrentRuneIndex: 0,
        expectedUnlockedRuneSlotCount: 2,
        expectedSelectedRuneId: rune!.id,
        expectedEquippedRuneId: null,
        expectedEquippedRuneIdsBySlot: [null, null],
        expectedRuneIds: [rune!.id],
      }),
      repository.equipRune(player.playerId, rune!.id, {
        commandKey: 'EQUIP_RUNE',
        targetSlot: 0,
        intentId: 'intent-equip-1',
        intentStateKey: 'state-equip-1',
        expectedPlayerUpdatedAt: currentPlayer!.updatedAt,
        expectedCurrentRuneIndex: 0,
        expectedUnlockedRuneSlotCount: 2,
        expectedSelectedRuneId: rune!.id,
        expectedEquippedRuneId: null,
        expectedEquippedRuneIdsBySlot: [null, null],
        expectedRuneIds: [rune!.id],
      }),
    ]);

    expect(first.runes).toEqual(second.runes);
    expect(first.runes[0]?.isEquipped).toBe(true);
    expect(first.runes[0]?.equippedSlot).toBe(0);
  });

  it('rejects a stale equip intent after rune selection changed', async () => {
    const player = await createPlayer(2022);
    await repository.createRune(player.playerId, createRuneDraft('Руна A'));
    await repository.createRune(player.playerId, createRuneDraft('Руна B'));
    const persistedPlayer = await repository.findPlayerById(player.playerId);
    const [runeA, runeB] = persistedPlayer?.runes ?? [];

    await repository.saveRuneCursor(player.playerId, 1);

    await expect(repository.equipRune(player.playerId, runeA!.id, {
      commandKey: 'EQUIP_RUNE',
      targetSlot: 0,
      intentId: 'intent-equip-stale',
      intentStateKey: 'state-equip-stale',
      expectedPlayerUpdatedAt: persistedPlayer!.updatedAt,
      expectedCurrentRuneIndex: 0,
      expectedUnlockedRuneSlotCount: 2,
      expectedSelectedRuneId: runeA!.id,
      expectedEquippedRuneId: null,
      expectedEquippedRuneIdsBySlot: [null, null],
      expectedRuneIds: [runeA!.id, runeB!.id],
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('invalidates old equip buttons after a newer craft changes rune loadout state', async () => {
    const player = await createPlayer(2025);
    await repository.createRune(player.playerId, createRuneDraft('Старая руна'));
    await prisma.playerInventory.update({
      where: { playerId: player.playerId },
      data: {
        usualShards: gameBalance.runes.craftCost * 2,
      },
    });
    const beforeCraft = await repository.findPlayerById(player.playerId);
    const rune = beforeCraft?.runes[0];

    await repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Новая руна'), 'intent-craft-loadout', 'state-craft-loadout', 'state-craft-loadout');

    await expect(repository.equipRune(player.playerId, rune!.id, {
      commandKey: 'EQUIP_RUNE',
      targetSlot: 0,
      intentId: 'intent-equip-after-craft',
      intentStateKey: 'state-equip-after-craft',
      expectedPlayerUpdatedAt: beforeCraft!.updatedAt,
      expectedCurrentRuneIndex: 0,
      expectedUnlockedRuneSlotCount: 2,
      expectedSelectedRuneId: rune!.id,
      expectedEquippedRuneId: null,
      expectedEquippedRuneIdsBySlot: [null, null],
      expectedRuneIds: [rune!.id],
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('returns the canonical unequip result for a duplicate intent', async () => {
    const player = await createPlayer(2023);
    await repository.createRune(player.playerId, createRuneDraft('Руна для снятия'));
    const createdPlayer = await repository.findPlayerById(player.playerId);
    const rune = createdPlayer?.runes[0];
    await repository.equipRune(player.playerId, rune!.id);
    const equippedPlayer = await repository.findPlayerById(player.playerId);

    const [first, second] = await Promise.all([
      repository.equipRune(player.playerId, null, {
        commandKey: 'UNEQUIP_RUNE',
        targetSlot: 0,
        intentId: 'intent-unequip-1',
        intentStateKey: 'state-unequip-1',
        expectedPlayerUpdatedAt: equippedPlayer!.updatedAt,
        expectedCurrentRuneIndex: 0,
        expectedUnlockedRuneSlotCount: 2,
        expectedSelectedRuneId: rune!.id,
        expectedEquippedRuneId: rune!.id,
        expectedEquippedRuneIdsBySlot: [rune!.id, null],
        expectedRuneIds: [rune!.id],
      }),
      repository.equipRune(player.playerId, null, {
        commandKey: 'UNEQUIP_RUNE',
        targetSlot: 0,
        intentId: 'intent-unequip-1',
        intentStateKey: 'state-unequip-1',
        expectedPlayerUpdatedAt: equippedPlayer!.updatedAt,
        expectedCurrentRuneIndex: 0,
        expectedUnlockedRuneSlotCount: 2,
        expectedSelectedRuneId: rune!.id,
        expectedEquippedRuneId: rune!.id,
        expectedEquippedRuneIdsBySlot: [rune!.id, null],
        expectedRuneIds: [rune!.id],
      }),
    ]);

    expect(first.runes).toEqual(second.runes);
    expect(first.runes[0]?.isEquipped).toBe(false);
  });

  it('rejects a stale unequip intent after loadout changed', async () => {
    const player = await createPlayer(2024);
    await repository.createRune(player.playerId, createRuneDraft('Руна A'));
    await repository.createRune(player.playerId, createRuneDraft('Руна B'));
    const persistedPlayer = await repository.findPlayerById(player.playerId);
    const [runeA, runeB] = persistedPlayer?.runes ?? [];
    await repository.equipRune(player.playerId, runeA!.id);
    const equippedPlayer = await repository.findPlayerById(player.playerId);
    await repository.equipRune(player.playerId, runeB!.id);

    await expect(repository.equipRune(player.playerId, null, {
      commandKey: 'UNEQUIP_RUNE',
      targetSlot: 0,
      intentId: 'intent-unequip-stale',
      intentStateKey: 'state-unequip-stale',
      expectedPlayerUpdatedAt: equippedPlayer!.updatedAt,
      expectedCurrentRuneIndex: 0,
      expectedUnlockedRuneSlotCount: 2,
      expectedSelectedRuneId: runeA!.id,
      expectedEquippedRuneId: runeA!.id,
      expectedEquippedRuneIdsBySlot: [runeA!.id, null],
      expectedRuneIds: [runeA!.id, runeB!.id],
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('invalidates old unequip buttons after a newer destroy changes rune collection state', async () => {
    const player = await createPlayer(2026);
    await repository.createRune(player.playerId, createRuneDraft('Руна A'));
    await repository.createRune(player.playerId, createRuneDraft('Руна B'));
    const beforeDestroy = await repository.findPlayerById(player.playerId);
    const [runeA, runeB] = beforeDestroy?.runes ?? [];
    await repository.equipRune(player.playerId, runeA!.id);
    const equippedPlayer = await repository.findPlayerById(player.playerId);

    await repository.destroyRune(player.playerId, runeB!.id, { usualShards: 2 }, 'intent-destroy-loadout', 'state-destroy-loadout', 'state-destroy-loadout');

    await expect(repository.equipRune(player.playerId, null, {
      commandKey: 'UNEQUIP_RUNE',
      targetSlot: 0,
      intentId: 'intent-unequip-after-destroy',
      intentStateKey: 'state-unequip-after-destroy',
      expectedPlayerUpdatedAt: equippedPlayer!.updatedAt,
      expectedCurrentRuneIndex: 0,
      expectedUnlockedRuneSlotCount: 2,
      expectedSelectedRuneId: runeA!.id,
      expectedEquippedRuneId: runeA!.id,
      expectedEquippedRuneIdsBySlot: [runeA!.id, null],
      expectedRuneIds: [runeA!.id, runeB!.id],
    })).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });

  it('applies a standalone exploration inventory effect only once for a duplicate intent', async () => {
    const player = await createPlayer(2027);
    const options = {
      commandKey: 'EXPLORE_LOCATION' as const,
      intentId: 'intent-explore-resource-1',
      intentStateKey: 'state-explore-resource-1',
      currentStateKey: 'state-explore-resource-1',
    };

    const [first, second] = await Promise.all([
      repository.recordInventoryDeltaResult(player.playerId, { herb: 1 }, options, (updatedPlayer) => ({
        eventCode: 'first-resource-scene',
        player: updatedPlayer,
      })),
      repository.recordInventoryDeltaResult(player.playerId, { herb: 1 }, options, (updatedPlayer) => ({
        eventCode: 'second-resource-scene',
        player: updatedPlayer,
      })),
    ]);

    const persistedPlayer = await repository.findPlayerById(player.playerId);

    expect(first.eventCode).toBe(second.eventCode);
    expect(first.player.inventory.herb).toBe(second.player.inventory.herb);
    expect(first.player.inventory.herb).toBe(player.inventory.herb + 1);
    expect(persistedPlayer?.inventory.herb).toBe(player.inventory.herb + 1);
  });

  it('returns the canonical crafted rune for a duplicate intent even with enough budget for two crafts', async () => {
    const player = await createPlayer(2014);
    await prisma.playerInventory.update({
      where: { playerId: player.playerId },
      data: {
        usualShards: gameBalance.runes.craftCost * 2,
      },
    });

    const [first, second] = await Promise.all([
      repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Крафтовая руна A'), 'intent-craft-1', 'state-craft-1', 'state-craft-1'),
      repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Крафтовая руна B'), 'intent-craft-1', 'state-craft-1', 'state-craft-1'),
    ]);

    expect(first.inventory.usualShards).toBe(second.inventory.usualShards);
    expect(first.runes).toEqual(second.runes);
    expect(first.inventory.usualShards).toBe(gameBalance.runes.craftCost);
    expect(first.runes).toHaveLength(1);
  });

  it('refunds and deletes only once under parallel destroy attempts', async () => {
    const player = await createPlayer(2005);
    await repository.createRune(player.playerId, createRuneDraft('Руна для распыления'));
    const rune = (await repository.findPlayerById(player.playerId))?.runes[0];

    expect(rune).toBeDefined();

    const results = await Promise.allSettled([
      repository.destroyRune(player.playerId, rune!.id, { usualShards: 2 }),
      repository.destroyRune(player.playerId, rune!.id, { usualShards: 2 }),
    ]);

    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
    expect((results.find((entry) => entry.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({
      code: 'rune_not_found',
    });

    const persistedPlayer = await repository.findPlayerById(player.playerId);
    const runeCount = await prisma.rune.count({ where: { playerId: player.playerId } });

    expect(persistedPlayer?.inventory.usualShards).toBe(player.inventory.usualShards + 2);
    expect(runeCount).toBe(0);
  });

  it('returns the canonical destroy result for a duplicate intent instead of refunding twice', async () => {
    const player = await createPlayer(2015);
    await repository.createRune(player.playerId, createRuneDraft('Руна для идемпотентного распыления'));
    const rune = (await repository.findPlayerById(player.playerId))?.runes[0];

    const [first, second] = await Promise.all([
      repository.destroyRune(player.playerId, rune!.id, { usualShards: 2 }, 'intent-destroy-1', 'state-destroy-1', 'state-destroy-1'),
      repository.destroyRune(player.playerId, rune!.id, { usualShards: 2 }, 'intent-destroy-1', 'state-destroy-1', 'state-destroy-1'),
    ]);

    expect(first.inventory.usualShards).toBe(second.inventory.usualShards);
    expect(first.runes).toEqual(second.runes);
    expect(first.runes).toHaveLength(0);
    expect(first.inventory.usualShards).toBe(player.inventory.usualShards + 2);
  });

  it('spends the last shard only once under parallel reroll attempts', async () => {
    const player = await createPlayer(2006);
    await repository.createRune(player.playerId, createRuneDraft('Руна для реролла'));
    const rune = (await repository.findPlayerById(player.playerId))?.runes[0];

    expect(rune).toBeDefined();

    await prisma.playerInventory.update({
      where: { playerId: player.playerId },
      data: {
        usualShards: 1,
      },
    });

    const rerolledStats: StatBlock = {
      health: rune!.health,
      attack: rune!.attack + 2,
      defence: rune!.defence,
      magicDefence: rune!.magicDefence,
      dexterity: rune!.dexterity,
      intelligence: rune!.intelligence,
    };

    const results = await Promise.allSettled([
      repository.rerollRuneStat(player.playerId, rune!.id, 'USUAL', rerolledStats),
      repository.rerollRuneStat(player.playerId, rune!.id, 'USUAL', rerolledStats),
    ]);

    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
    expect((results.find((entry) => entry.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({
      code: 'not_enough_shards',
    });

    const persistedPlayer = await repository.findPlayerById(player.playerId);
    const persistedRune = await prisma.rune.findUnique({ where: { id: rune!.id } });

    expect(persistedPlayer?.inventory.usualShards).toBe(0);
    expect(persistedRune?.attack).toBe(rerolledStats.attack);
  });

  it('returns the canonical reroll result for a duplicate intent even with enough shards for two rerolls', async () => {
    const player = await createPlayer(2016);
    await repository.createRune(player.playerId, createRuneDraft('Руна для идемпотентного реролла'));
    const rune = (await repository.findPlayerById(player.playerId))?.runes[0];

    await prisma.playerInventory.update({
      where: { playerId: player.playerId },
      data: {
        usualShards: 2,
      },
    });

    const firstStats: StatBlock = {
      health: rune!.health,
      attack: rune!.attack + 1,
      defence: rune!.defence,
      magicDefence: rune!.magicDefence,
      dexterity: rune!.dexterity,
      intelligence: rune!.intelligence,
    };
    const secondStats: StatBlock = {
      ...firstStats,
      attack: rune!.attack + 4,
    };

    const [first, second] = await Promise.all([
      repository.rerollRuneStat(player.playerId, rune!.id, 'USUAL', firstStats, 'intent-reroll-1', 'state-reroll-1', 'state-reroll-1'),
      repository.rerollRuneStat(player.playerId, rune!.id, 'USUAL', secondStats, 'intent-reroll-1', 'state-reroll-1', 'state-reroll-1'),
    ]);

    expect(first.inventory.usualShards).toBe(second.inventory.usualShards);
    expect(first.runes).toEqual(second.runes);
    expect(first.inventory.usualShards).toBe(1);
    expect([firstStats.attack, secondStats.attack]).toContain(first.runes[0]?.attack);
  });

  it('rejects a stale reused craft intent after player state already changed', async () => {
    const player = await createPlayer(2017);
    await prisma.playerInventory.update({
      where: { playerId: player.playerId },
      data: {
        usualShards: gameBalance.runes.craftCost * 2,
      },
    });

    await repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Первая руна'), 'intent-craft-stale', 'state-before', 'state-before');

    await expect(
      repository.craftRune(player.playerId, 'USUAL', createRuneDraft('Вторая руна'), 'intent-craft-stale', 'state-after', 'state-after'),
    ).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
  });
});
