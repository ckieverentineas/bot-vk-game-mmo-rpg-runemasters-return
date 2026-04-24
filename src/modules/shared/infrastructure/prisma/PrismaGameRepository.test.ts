import { readFileSync } from 'node:fs';

import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { BattleView, PlayerState, RuneDraft, StatBlock } from '../../../../shared/types/game';
import { createPendingRewardSnapshot, type PendingRewardAppliedResultSnapshot } from '../../../rewards/domain/pending-reward-snapshot';
import type { TrophyActionDefinition } from '../../../rewards/domain/trophy-actions';
import type {
  PlayerBlueprintView,
  PlayerCraftedItemView,
} from '../../../workshop/application/workshop-persistence';
import { BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE } from '../../domain/contracts/bestiary-enemy-kill-milestone-ledger';
import { BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE } from '../../domain/contracts/bestiary-location-discovery-ledger';
import { createAppliedPendingRewardLedgerEntry, createPendingRewardLedgerEntry } from '../../domain/contracts/reward-ledger';
import type { RewardIntent } from '../../domain/contracts/reward-intent';
import { PrismaGameRepository } from './PrismaGameRepository';
import type { PersistedPlayerStateHydrationInput } from './player-state-hydration';

const readFixture = <T>(fileName: string): T => JSON.parse(
  readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), 'utf8'),
) as T;

const materializePlayerRecordFixture = (fileName: string) => {
  const fixture = readFixture<PersistedPlayerStateHydrationInput>(fileName);
  const base = createPlayerRecord();

  return {
    ...base,
    id: fixture.playerId,
    userId: fixture.userId,
    level: fixture.level,
    experience: fixture.experience,
    gold: fixture.gold,
    radiance: fixture.radiance ?? 0,
    baseHealth: fixture.baseStats.health,
    baseAttack: fixture.baseStats.attack,
    baseDefence: fixture.baseStats.defence,
    baseMagicDefence: fixture.baseStats.magicDefence,
    baseDexterity: fixture.baseStats.dexterity,
    baseIntelligence: fixture.baseStats.intelligence,
    createdAt: new Date(fixture.createdAt),
    updatedAt: new Date(fixture.updatedAt),
    user: {
      vkId: fixture.vkId,
    },
    progress: fixture.progress
      ? {
          playerId: fixture.playerId,
          locationLevel: fixture.progress.locationLevel ?? 0,
          currentRuneIndex: fixture.progress.currentRuneIndex ?? 0,
          unlockedRuneSlotCount: fixture.progress.unlockedRuneSlotCount ?? 1,
          activeBattleId: typeof fixture.progress.activeBattleId === 'string' ? fixture.progress.activeBattleId : null,
          currentHealth: fixture.progress.currentHealth ?? null,
          currentMana: fixture.progress.currentMana ?? null,
          tutorialState: typeof fixture.progress.tutorialState === 'string' ? fixture.progress.tutorialState : 'ACTIVE',
          victories: fixture.progress.victories ?? 0,
          victoryStreak: fixture.progress.victoryStreak ?? 0,
          defeats: fixture.progress.defeats ?? 0,
          defeatStreak: fixture.progress.defeatStreak ?? 0,
          mobsKilled: fixture.progress.mobsKilled ?? 0,
          highestLocationLevel: fixture.progress.highestLocationLevel ?? 0,
          updatedAt: new Date(fixture.updatedAt),
        }
      : null,
    inventory: fixture.inventory
      ? {
          playerId: fixture.playerId,
          usualShards: fixture.inventory.usualShards ?? 0,
          unusualShards: fixture.inventory.unusualShards ?? 0,
          rareShards: fixture.inventory.rareShards ?? 0,
          epicShards: fixture.inventory.epicShards ?? 0,
          legendaryShards: fixture.inventory.legendaryShards ?? 0,
          mythicalShards: fixture.inventory.mythicalShards ?? 0,
          leather: fixture.inventory.leather ?? 0,
          bone: fixture.inventory.bone ?? 0,
          herb: fixture.inventory.herb ?? 0,
          essence: fixture.inventory.essence ?? 0,
          metal: fixture.inventory.metal ?? 0,
          crystal: fixture.inventory.crystal ?? 0,
          updatedAt: new Date(fixture.updatedAt),
        }
      : null,
    schoolMasteries: (fixture.schoolMasteries ?? []).map((entry) => ({
      playerId: fixture.playerId,
      schoolCode: entry.schoolCode,
      experience: entry.experience,
      rank: 0,
      updatedAt: new Date(fixture.updatedAt),
    })),
    skills: [],
    runes: fixture.runes.map((rune) => ({
      id: rune.id,
      playerId: fixture.playerId,
      runeCode: rune.runeCode ?? null,
      archetypeCode: rune.archetypeCode ?? null,
      passiveAbilityCodes: Array.isArray(rune.passiveAbilityCodes) ? JSON.stringify(rune.passiveAbilityCodes) : rune.passiveAbilityCodes ?? '[]',
      activeAbilityCodes: Array.isArray(rune.activeAbilityCodes) ? JSON.stringify(rune.activeAbilityCodes) : rune.activeAbilityCodes ?? '[]',
      name: rune.name,
      rarity: rune.rarity,
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
      isEquipped: rune.isEquipped,
      equippedSlot: rune.equippedSlot ?? null,
      createdAt: new Date(rune.createdAt),
      updatedAt: new Date(rune.createdAt),
    })),
  };
};

const createPlayerRecord = () => ({
  id: 1,
  userId: 10,
  name: null,
  level: 3,
  experience: 12,
  gold: 7,
  radiance: 0,
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
    unlockedRuneSlotCount: 1,
    activeBattleId: null,
    currentHealth: null,
    currentMana: null,
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
    healingPills: 0,
    focusPills: 0,
    guardPills: 0,
    clarityPills: 0,
    updatedAt: new Date('2026-04-12T00:00:00.000Z'),
  },
  schoolMasteries: [],
  skills: [],
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

const createPlayerRecordFor = (
  playerId: number,
  vkId: number,
  overrides: Partial<ReturnType<typeof createPlayerRecord>> = {},
) => ({
  ...createPlayerRecord(),
  id: playerId,
  userId: 9 + playerId,
  user: {
    vkId,
  },
  progress: {
    ...createPlayerRecord().progress,
    playerId,
  },
  inventory: {
    ...createPlayerRecord().inventory,
    playerId,
  },
  ...overrides,
});

const createPartyRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'party-1',
  inviteCode: 'ABC123',
  leaderPlayerId: 1,
  status: 'OPEN',
  activeBattleId: null,
  maxMembers: 2,
  createdAt: new Date('2026-04-12T00:00:00.000Z'),
  updatedAt: new Date('2026-04-12T00:01:00.000Z'),
  members: [
    {
      partyId: 'party-1',
      playerId: 1,
      role: 'LEADER',
      joinedAt: new Date('2026-04-12T00:00:00.000Z'),
      player: {
        user: {
          vkId: 1001,
        },
      },
    },
    {
      partyId: 'party-1',
      playerId: 2,
      role: 'MEMBER',
      joinedAt: new Date('2026-04-12T00:01:00.000Z'),
      player: {
        user: {
          vkId: 1002,
        },
      },
    },
  ],
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

interface PlayerBlueprintRecordFixture {
  readonly playerId: number;
  readonly blueprintCode: string;
  readonly quantity: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface PlayerCraftedItemRecordFixture {
  readonly id: string;
  readonly playerId: number;
  readonly itemCode: string;
  readonly itemClass: string;
  readonly slot: string;
  readonly status: string;
  readonly equipped: boolean;
  readonly durability: number;
  readonly maxDurability: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const createPlayerBlueprintRecord = (
  overrides: Partial<PlayerBlueprintRecordFixture> = {},
): PlayerBlueprintRecordFixture => ({
  playerId: 1,
  blueprintCode: 'skinning_kit',
  quantity: 2,
  createdAt: new Date('2026-04-22T10:00:00.000Z'),
  updatedAt: new Date('2026-04-22T10:30:00.000Z'),
  ...overrides,
});

const createPlayerBlueprintViewSnapshot = (
  overrides: Partial<PlayerBlueprintView> = {},
): PlayerBlueprintView => ({
  playerId: 1,
  blueprintCode: 'skinning_kit',
  quantity: 2,
  createdAt: '2026-04-22T10:00:00.000Z',
  updatedAt: '2026-04-22T10:30:00.000Z',
  ...overrides,
});

const createCraftedItemRecord = (
  overrides: Partial<PlayerCraftedItemRecordFixture> = {},
): PlayerCraftedItemRecordFixture => ({
  id: 'crafted-1',
  playerId: 1,
  itemCode: 'skinning_kit',
  itemClass: 'UL',
  slot: 'tool',
  status: 'ACTIVE',
  equipped: false,
  durability: 12,
  maxDurability: 12,
  createdAt: new Date('2026-04-22T11:00:00.000Z'),
  updatedAt: new Date('2026-04-22T11:30:00.000Z'),
  ...overrides,
});

const createCraftedItemViewSnapshot = (
  overrides: Partial<PlayerCraftedItemView> = {},
): PlayerCraftedItemView => ({
  id: 'crafted-1',
  playerId: 1,
  itemCode: 'skinning_kit',
  itemClass: 'UL',
  slot: 'tool',
  status: 'ACTIVE',
  equipped: false,
  durability: 12,
  maxDurability: 12,
  createdAt: '2026-04-22T11:00:00.000Z',
  updatedAt: '2026-04-22T11:30:00.000Z',
  ...overrides,
});

const createRewardIntent = (): RewardIntent => ({
  schemaVersion: 1,
  intentId: 'battle-victory:battle-1',
  sourceType: 'BATTLE_VICTORY',
  sourceId: 'battle-1',
  playerId: 1,
  payload: {
    experience: 4,
    gold: 2,
    shards: {
      USUAL: 2,
    },
    droppedRune: null,
  },
});

const createTrophyActions = (): readonly TrophyActionDefinition[] => [
  {
    code: 'skin_beast',
    label: 'Skin beast',
    skillCodes: ['gathering.skinning'],
    visibleRewardFields: ['leather', 'bone'],
  },
  {
    code: 'claim_all',
    label: 'Claim all',
    skillCodes: [],
    visibleRewardFields: [],
  },
];

const createEmberHiddenTrophyActions = (): readonly TrophyActionDefinition[] => [
  {
    code: 'draw_ember_sign',
    label: '🔥 Вытянуть знак Пламени',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['essence'],
  },
  {
    code: 'claim_all',
    label: 'Claim all',
    skillCodes: [],
    visibleRewardFields: [],
  },
];

const createPendingRewardLedgerRecord = () => {
  const pendingSnapshot = createPendingRewardSnapshot(
    createRewardIntent(),
    createTrophyActions(),
    '2026-04-22T00:00:00.000Z',
  );
  const ledger = createPendingRewardLedgerEntry(pendingSnapshot);

  return {
    id: 'reward-ledger-row-1',
    playerId: 1,
    ledgerKey: ledger.ledgerKey,
    sourceType: ledger.sourceType,
    sourceId: ledger.sourceId,
    status: ledger.status,
    entrySnapshot: JSON.stringify(ledger),
    appliedAt: null,
    createdAt: new Date('2026-04-22T00:00:00.000Z'),
    updatedAt: new Date('2026-04-22T00:00:00.000Z'),
  };
};

const createClaimAllRewardLedgerRecord = () => {
  const pendingRecord = createPendingRewardLedgerRecord();
  const ledger = JSON.parse(pendingRecord.entrySnapshot);
  const pendingRewardSnapshot = ledger.pendingRewardSnapshot as {
    trophyActions: Array<Record<string, unknown>>;
  };

  return {
    ...pendingRecord,
    entrySnapshot: JSON.stringify({
      ...ledger,
      pendingRewardSnapshot: {
        ...pendingRewardSnapshot,
        trophyActions: pendingRewardSnapshot.trophyActions.map((action) => action.code === 'claim_all'
          ? {
              ...action,
              reward: {
                inventoryDelta: {
                  leather: 2,
                  bone: 1,
                  herb: 3,
                },
                skillPoints: [],
              },
            }
          : action),
      },
    }),
  };
};

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
  unlockedRuneSlotCount: 1,
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
    playerBlueprint: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    playerCraftedItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    rune: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    rewardLedgerRecord: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    roamingThreat: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
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
    playerSkill: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    battleSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    playerParty: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    playerPartyMember: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    gameLog: {
      create: vi.fn(),
    },
  };

  const prisma = {
    ...tx,
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  tx.player.updateMany.mockResolvedValue({ count: 1 });

  return {
    prisma,
    tx,
    repository: new PrismaGameRepository(prisma as never),
  };
};

describe('PrismaGameRepository release hardening', () => {
  it('lists player workshop blueprints as a focused read model', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerBlueprint.findMany.mockResolvedValue([
      createPlayerBlueprintRecord({
        blueprintCode: 'hunter_cleaver',
        quantity: 3,
      }),
    ]);

    await expect(repository.listPlayerBlueprints(1)).resolves.toEqual([
      createPlayerBlueprintViewSnapshot({
        blueprintCode: 'hunter_cleaver',
        quantity: 3,
      }),
    ]);

    expect(tx.playerBlueprint.findMany).toHaveBeenCalledWith({
      where: { playerId: 1 },
      orderBy: { blueprintCode: 'asc' },
    });
    expect(tx.player.findUnique).not.toHaveBeenCalled();
  });

  it('lists player crafted workshop items as a focused read model', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerCraftedItem.findMany.mockResolvedValue([
      createCraftedItemRecord({
        id: 'crafted-weapon-1',
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        durability: 14,
        maxDurability: 14,
      }),
    ]);

    await expect(repository.listPlayerCraftedItems(1)).resolves.toEqual([
      createCraftedItemViewSnapshot({
        id: 'crafted-weapon-1',
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        durability: 14,
        maxDurability: 14,
      }),
    ]);

    expect(tx.playerCraftedItem.findMany).toHaveBeenCalledWith({
      where: { playerId: 1 },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
    expect(tx.player.findUnique).not.toHaveBeenCalled();
  });

  it('rejects corrupted workshop item records at the persistence boundary', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerCraftedItem.findMany.mockResolvedValue([
      createCraftedItemRecord({
        status: 'LEGACY_STATUS',
      }),
    ]);

    await expect(repository.listPlayerCraftedItems(1)).rejects.toMatchObject({
      code: 'workshop_persistence_invalid',
    });
  });

  it('grants workshop blueprints by incrementing quantity under a command intent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.playerBlueprint.upsert.mockResolvedValue(createPlayerBlueprintRecord({
      quantity: 4,
    }));
    tx.player.update.mockResolvedValue({});

    const result = await repository.grantPlayerBlueprint(1, 'skinning_kit', 2, {
      intentId: 'intent-blueprint-1',
      intentStateKey: 'state-blueprint-1',
      currentStateKey: 'state-blueprint-1',
    });

    expect(result.quantity).toBe(4);
    expect(tx.commandIntentRecord.create).toHaveBeenCalledWith({
      data: {
        playerId: 1,
        intentId: 'intent-blueprint-1',
        commandKey: 'GRANT_WORKSHOP_BLUEPRINT',
        stateKey: 'state-blueprint-1',
      },
    });
    expect(tx.playerBlueprint.upsert).toHaveBeenCalledWith({
      where: {
        playerId_blueprintCode: {
          playerId: 1,
          blueprintCode: 'skinning_kit',
        },
      },
      update: {
        quantity: { increment: 2 },
      },
      create: {
        playerId: 1,
        blueprintCode: 'skinning_kit',
        quantity: 2,
      },
    });
    expect(tx.commandIntentRecord.update).toHaveBeenCalledWith({
      where: {
        playerId_intentId: {
          playerId: 1,
          intentId: 'intent-blueprint-1',
        },
      },
      data: {
        status: 'APPLIED',
        resultSnapshot: expect.any(String),
      },
    });
  });

  it('returns applied blueprint grant intent before validating the new request body', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'GRANT_WORKSHOP_BLUEPRINT',
      stateKey: 'state-blueprint-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createPlayerBlueprintViewSnapshot({
        quantity: 2,
      })),
    });

    await expect(repository.grantPlayerBlueprint(1, 'skinning_kit', 0, {
      intentId: 'intent-blueprint-1',
      intentStateKey: 'state-blueprint-1',
      currentStateKey: 'state-blueprint-1',
    })).resolves.toMatchObject({
      quantity: 2,
    });
    expect(tx.playerBlueprint.upsert).not.toHaveBeenCalled();
  });

  it('crafts a workshop item by consuming one craft blueprint and catalog material cost', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.playerBlueprint.updateMany.mockResolvedValue({ count: 1 });
    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.playerCraftedItem.create.mockResolvedValue(createCraftedItemRecord({
      id: 'crafted-cleaver-1',
      itemCode: 'hunter_cleaver',
      itemClass: 'L',
      slot: 'weapon',
      durability: 14,
      maxDurability: 14,
    }));
    tx.player.update.mockResolvedValue({});

    const item = await repository.craftWorkshopItem(1, 'hunter_cleaver', {
      intentId: 'intent-workshop-craft-1',
      intentStateKey: 'state-workshop-craft-1',
      currentStateKey: 'state-workshop-craft-1',
    });

    expect(item).toMatchObject({
      id: 'crafted-cleaver-1',
      itemCode: 'hunter_cleaver',
      itemClass: 'L',
      slot: 'weapon',
      status: 'ACTIVE',
      equipped: false,
      durability: 14,
      maxDurability: 14,
    });
    expect(tx.playerBlueprint.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        blueprintCode: 'hunter_cleaver',
        quantity: { gte: 1 },
      },
      data: {
        quantity: { decrement: 1 },
      },
    });
    expect(tx.playerInventory.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        leather: { gte: 4 },
        bone: { gte: 2 },
        metal: { gte: 1 },
      },
      data: {
        leather: { increment: -4 },
        bone: { increment: -2 },
        metal: { increment: -1 },
      },
    });
    expect(tx.playerCraftedItem.create).toHaveBeenCalledWith({
      data: {
        playerId: 1,
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        status: 'ACTIVE',
        equipped: false,
        durability: 14,
        maxDurability: 14,
      },
    });
  });

  it('rejects repair blueprints when crafting workshop items', async () => {
    const { repository, tx } = createPrismaMock();

    await expect(repository.craftWorkshopItem(1, 'resonance_tool')).rejects.toMatchObject({
      code: 'workshop_blueprint_not_craftable',
    });

    expect(tx.playerBlueprint.updateMany).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.playerCraftedItem.create).not.toHaveBeenCalled();
  });

  it('returns canonical crafted workshop item for duplicate command intent without spending again', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'CRAFT_WORKSHOP_ITEM',
      stateKey: 'state-workshop-craft-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createCraftedItemViewSnapshot({
        id: 'crafted-cleaver-1',
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        durability: 14,
        maxDurability: 14,
      })),
    });

    const item = await repository.craftWorkshopItem(1, 'hunter_cleaver', {
      intentId: 'intent-workshop-craft-1',
      intentStateKey: 'state-workshop-craft-1',
      currentStateKey: 'state-workshop-craft-1',
    });

    expect(item.id).toBe('crafted-cleaver-1');
    expect(tx.playerBlueprint.updateMany).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.playerCraftedItem.create).not.toHaveBeenCalled();
  });

  it('returns applied workshop craft intent before validating current blueprint kind', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'CRAFT_WORKSHOP_ITEM',
      stateKey: 'state-workshop-craft-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createCraftedItemViewSnapshot({
        id: 'crafted-cleaver-1',
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        durability: 14,
        maxDurability: 14,
      })),
    });

    await expect(repository.craftWorkshopItem(1, 'resonance_tool', {
      intentId: 'intent-workshop-craft-1',
      intentStateKey: 'state-workshop-craft-1',
      currentStateKey: 'state-workshop-craft-1',
    })).resolves.toMatchObject({
      id: 'crafted-cleaver-1',
    });
    expect(tx.playerBlueprint.updateMany).not.toHaveBeenCalled();
    expect(tx.playerCraftedItem.create).not.toHaveBeenCalled();
  });

  it('equips one active workshop item per slot under a command intent', async () => {
    const { repository, tx } = createPrismaMock();
    const targetItem = createCraftedItemRecord({
      id: 'crafted-weapon-1',
      itemCode: 'hunter_cleaver',
      itemClass: 'L',
      slot: 'weapon',
      equipped: false,
      durability: 14,
      maxDurability: 14,
    });
    const equippedItem = {
      ...targetItem,
      equipped: true,
      updatedAt: new Date('2026-04-22T12:30:00.000Z'),
    };

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.playerCraftedItem.findFirst
      .mockResolvedValueOnce(targetItem)
      .mockResolvedValueOnce(equippedItem);
    tx.playerCraftedItem.updateMany.mockResolvedValue({ count: 1 });
    tx.player.update.mockResolvedValue({});

    const item = await repository.equipWorkshopItem(1, 'crafted-weapon-1', {
      intentId: 'intent-workshop-equip-1',
      intentStateKey: 'state-workshop-equip-1',
      currentStateKey: 'state-workshop-equip-1',
    });

    expect(item.equipped).toBe(true);
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        slot: 'weapon',
        equipped: true,
      },
      data: { equipped: false },
    });
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'crafted-weapon-1',
        playerId: 1,
        status: 'ACTIVE',
        durability: { gt: 0 },
      },
      data: { equipped: true },
    });
  });

  it('unequips a workshop item under a command intent', async () => {
    const { repository, tx } = createPrismaMock();
    const equippedItem = createCraftedItemRecord({
      id: 'crafted-tool-1',
      itemClass: 'UL',
      equipped: true,
    });
    const unequippedItem = {
      ...equippedItem,
      equipped: false,
      updatedAt: new Date('2026-04-22T12:30:00.000Z'),
    };

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.playerCraftedItem.findFirst
      .mockResolvedValueOnce(equippedItem)
      .mockResolvedValueOnce(unequippedItem);
    tx.playerCraftedItem.updateMany.mockResolvedValue({ count: 1 });
    tx.player.update.mockResolvedValue({});

    const item = await repository.unequipWorkshopItem(1, 'crafted-tool-1', {
      intentId: 'intent-workshop-unequip-1',
      intentStateKey: 'state-workshop-unequip-1',
      currentStateKey: 'state-workshop-unequip-1',
    });

    expect(item.equipped).toBe(false);
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'crafted-tool-1',
        playerId: 1,
      },
      data: { equipped: false },
    });
  });

  it('repairs a damaged active UL workshop item with a repair blueprint', async () => {
    const { repository, tx } = createPrismaMock();
    const damagedItem = createCraftedItemRecord({
      id: 'crafted-ul-1',
      itemClass: 'UL',
      durability: 5,
      maxDurability: 12,
    });
    const repairedItem = {
      ...damagedItem,
      durability: 12,
      updatedAt: new Date('2026-04-22T12:00:00.000Z'),
    };

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.playerCraftedItem.findFirst
      .mockResolvedValueOnce(damagedItem)
      .mockResolvedValueOnce(repairedItem);
    tx.playerBlueprint.updateMany.mockResolvedValue({ count: 1 });
    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.playerCraftedItem.updateMany.mockResolvedValue({ count: 1 });
    tx.player.update.mockResolvedValue({});

    const item = await repository.repairWorkshopItem(1, 'crafted-ul-1', 'resonance_tool', {
      intentId: 'intent-workshop-repair-1',
      intentStateKey: 'state-workshop-repair-1',
      currentStateKey: 'state-workshop-repair-1',
    });

    expect(item.durability).toBe(12);
    expect(tx.playerBlueprint.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        blueprintCode: 'resonance_tool',
        quantity: { gte: 1 },
      },
      data: {
        quantity: { decrement: 1 },
      },
    });
    expect(tx.playerInventory.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        essence: { gte: 2 },
        crystal: { gte: 2 },
      },
      data: {
        essence: { increment: -2 },
        crystal: { increment: -2 },
      },
    });
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'crafted-ul-1',
        playerId: 1,
        itemClass: 'UL',
        status: { in: ['ACTIVE', 'BROKEN'] },
        durability: {
          lt: 12,
        },
      },
      data: {
        status: 'ACTIVE',
        durability: 12,
      },
    });
  });

  it('returns applied workshop repair intent before validating current repair blueprint kind', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue({
      commandKey: 'REPAIR_WORKSHOP_ITEM',
      stateKey: 'state-workshop-repair-1',
      status: 'APPLIED',
      resultSnapshot: JSON.stringify(createCraftedItemViewSnapshot({
        id: 'crafted-ul-1',
        itemClass: 'UL',
        durability: 12,
        maxDurability: 12,
      })),
    });

    await expect(repository.repairWorkshopItem(1, 'crafted-ul-1', 'hunter_cleaver', {
      intentId: 'intent-workshop-repair-1',
      intentStateKey: 'state-workshop-repair-1',
      currentStateKey: 'state-workshop-repair-1',
    })).resolves.toMatchObject({
      id: 'crafted-ul-1',
      durability: 12,
    });
    expect(tx.playerCraftedItem.findFirst).not.toHaveBeenCalled();
    expect(tx.playerBlueprint.updateMany).not.toHaveBeenCalled();
  });

  it('does not repair L workshop items', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerCraftedItem.findFirst.mockResolvedValue(createCraftedItemRecord({
      itemClass: 'L',
      durability: 5,
      maxDurability: 12,
    }));

    await expect(repository.repairWorkshopItem(1, 'crafted-1', 'resonance_tool')).rejects.toMatchObject({
      code: 'workshop_item_not_repairable',
    });

    expect(tx.playerBlueprint.updateMany).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.playerCraftedItem.updateMany).not.toHaveBeenCalled();
  });

  it('repairs broken depleted UL workshop items', async () => {
    const { repository, tx } = createPrismaMock();
    const brokenItem = createCraftedItemRecord({
      id: 'crafted-broken-ul-1',
      itemClass: 'UL',
      status: 'BROKEN',
      durability: 0,
      maxDurability: 12,
    });
    const repairedItem = {
      ...brokenItem,
      status: 'ACTIVE',
      durability: 12,
      updatedAt: new Date('2026-04-22T12:00:00.000Z'),
    };

    tx.playerCraftedItem.findFirst
      .mockResolvedValueOnce(brokenItem)
      .mockResolvedValueOnce(repairedItem);
    tx.playerBlueprint.updateMany.mockResolvedValue({ count: 1 });
    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.playerCraftedItem.updateMany.mockResolvedValue({ count: 1 });
    tx.player.update.mockResolvedValue({});

    await expect(repository.repairWorkshopItem(1, 'crafted-broken-ul-1', 'resonance_tool')).resolves.toMatchObject({
      status: 'ACTIVE',
      durability: 12,
    });
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'crafted-broken-ul-1',
        playerId: 1,
        itemClass: 'UL',
        status: { in: ['ACTIVE', 'BROKEN'] },
        durability: { lt: 12 },
      },
      data: {
        status: 'ACTIVE',
        durability: 12,
      },
    });
  });

  it('does not repair destroyed workshop items', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerCraftedItem.findFirst.mockResolvedValue(createCraftedItemRecord({
      itemClass: 'UL',
      status: 'DESTROYED',
      durability: 5,
      maxDurability: 12,
    }));

    await expect(repository.repairWorkshopItem(1, 'crafted-1', 'resonance_tool')).rejects.toMatchObject({
      code: 'workshop_item_not_repairable',
    });

    expect(tx.playerBlueprint.updateMany).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.playerCraftedItem.updateMany).not.toHaveBeenCalled();
  });

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

  it('spends pill materials and stores the crafted consumable atomically', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.playerInventory.update.mockResolvedValue({});
    tx.playerSkill.findMany.mockResolvedValue([]);
    tx.playerSkill.upsert.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    tx.player.findUnique.mockResolvedValue({
      ...createPlayerRecord(),
      inventory: {
        ...createPlayerRecord().inventory,
        healingPills: 1,
      },
      skills: [
        {
          playerId: 1,
          skillCode: 'crafting.alchemy',
          experience: 8,
          rank: 0,
          updatedAt: new Date('2026-04-12T00:00:00.000Z'),
        },
      ],
    });

    await expect(repository.craftPlayerConsumable(
      1,
      { leather: -2, bone: -1 },
      { healingPills: 1 },
      [{ skillCode: 'crafting.alchemy', points: 8 }],
      'intent-pill-1',
      'state-pill-1',
      'state-pill-1',
    )).resolves.toMatchObject({
      playerId: 1,
      inventory: expect.objectContaining({
        healingPills: 1,
      }),
      skills: [
        {
          skillCode: 'crafting.alchemy',
          experience: 8,
          rank: 0,
        },
      ],
    });

    expect(tx.playerInventory.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        leather: { gte: 2 },
        bone: { gte: 1 },
      },
      data: {
        leather: { increment: -2 },
        bone: { increment: -1 },
      },
    });
    expect(tx.playerInventory.update).toHaveBeenCalledWith({
      where: { playerId: 1 },
      data: {
        healingPills: { increment: 1 },
      },
    });
    expect(tx.playerSkill.upsert).toHaveBeenCalledWith({
      where: {
        playerId_skillCode: {
          playerId: 1,
          skillCode: 'crafting.alchemy',
        },
      },
      update: {
        experience: 8,
        rank: 0,
      },
      create: {
        playerId: 1,
        skillCode: 'crafting.alchemy',
        experience: 8,
        rank: 0,
      },
    });
    expect(tx.player.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        updatedAt: expect.any(Date),
      },
    });
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

  it('hydrates legacy player-state fixture through repository-safe fallbacks', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.findFirst.mockResolvedValue(materializePlayerRecordFixture('player-state-legacy.json'));

    const player = await repository.findPlayerByVkId(1001);

    expect(player?.currentRuneIndex).toBe(0);
    expect(player?.inventory.rareShards).toBe(0);
    expect(player?.highestLocationLevel).toBe(2);
    expect(player?.runes[0]?.equippedSlot).toBe(0);
    expect(player?.schoolMasteries?.map((entry) => entry.schoolCode)).toEqual(['echo', 'ember', 'gale', 'stone']);
  });

  it('hydrates newer player-state fixture without corrupting tutorial or slot state', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.findFirst.mockResolvedValue(materializePlayerRecordFixture('player-state-future.json'));

    const player = await repository.findPlayerByVkId(1001);

    expect(player?.tutorialState).toBe('ACTIVE');
    expect(player?.activeBattleId).toBeNull();
    expect(player?.unlockedRuneSlotCount).toBe(2);
    expect(player?.highestLocationLevel).toBe(3);
  });

  it('persists player skill experience gains and returns hydrated skills', async () => {
    const { repository, tx } = createPrismaMock();
    const updatedPlayer = {
      ...createPlayerRecord(),
      skills: [
        {
          playerId: 1,
          skillCode: 'gathering.skinning',
          experience: 100,
          rank: 1,
          updatedAt: new Date('2026-04-12T00:00:00.000Z'),
        },
      ],
    };

    tx.playerSkill.findMany.mockResolvedValue([
      {
        playerId: 1,
        skillCode: 'gathering.skinning',
        experience: 99,
        rank: 0,
        updatedAt: new Date('2026-04-12T00:00:00.000Z'),
      },
    ]);
    tx.playerSkill.upsert.mockResolvedValue({});
    tx.player.findUnique.mockResolvedValue(updatedPlayer);

    const player = await repository.applyPlayerSkillExperience(1, [
      {
        skillCode: 'gathering.skinning',
        points: 1,
      },
    ]);

    expect(tx.playerSkill.findMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        skillCode: {
          in: ['gathering.skinning'],
        },
      },
    });
    expect(tx.playerSkill.upsert).toHaveBeenCalledWith({
      where: {
        playerId_skillCode: {
          playerId: 1,
          skillCode: 'gathering.skinning',
        },
      },
      update: {
        experience: 100,
        rank: 1,
      },
      create: {
        playerId: 1,
        skillCode: 'gathering.skinning',
        experience: 100,
        rank: 1,
      },
    });
    expect(player.skills).toEqual([
      {
        skillCode: 'gathering.skinning',
        experience: 100,
        rank: 1,
      },
    ]);
  });

  it('persists battle skill gains when an active battle save wins the revision guard', async () => {
    const { repository, tx } = createPrismaMock();
    const persistedBattle = createBattleRow({
      actionRevision: 1,
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-v1.json')),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);
    tx.playerSkill.findMany.mockResolvedValue([]);
    tx.playerSkill.upsert.mockResolvedValue({});

    await repository.saveBattle(createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      enemy: {
        ...createBattleView().enemy,
        currentHealth: 4,
      },
      actionRevision: 0,
    }), {
      playerSkillGains: [
        {
          skillCode: 'combat.striking',
          points: 1,
        },
      ],
    });

    expect(tx.playerSkill.upsert).toHaveBeenCalledWith({
      where: {
        playerId_skillCode: {
          playerId: 1,
          skillCode: 'combat.striking',
        },
      },
      update: {
        experience: 1,
        rank: 0,
      },
      create: {
        playerId: 1,
        skillCode: 'combat.striking',
        experience: 1,
        rank: 0,
      },
    });
  });

  it('spends battle consumables only after the battle revision guard wins', async () => {
    const { repository, tx } = createPrismaMock();
    const persistedBattle = createBattleRow({
      actionRevision: 1,
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-v1.json')),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);
    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());

    await repository.saveBattleWithInventoryDelta(createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      actionRevision: 0,
    }), { healingPills: -1 });

    expect(tx.playerInventory.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        healingPills: { gte: 1 },
      },
      data: {
        healingPills: { increment: -1 },
      },
    });
  });

  it('does not spend battle consumables when the battle revision is stale', async () => {
    const { repository, tx } = createPrismaMock();
    const currentBattle = createBattleRow({
      actionRevision: 1,
      battleSnapshot: JSON.stringify(readFixture('battle-snapshot-v1.json')),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 0 });
    tx.battleSession.findFirst.mockResolvedValue(currentBattle);

    await repository.saveBattleWithInventoryDelta(createBattleView({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      actionRevision: 0,
    }), { healingPills: -1 });

    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
  });

  it('persists battle skill gains when battle finalization wins the revision guard', async () => {
    const { repository, tx } = createPrismaMock();
    const completedBattle = createBattleView({
      result: 'DEFEAT',
      rewards: {
        experience: 0,
        gold: 0,
        shards: {},
        droppedRune: null,
      },
    });
    const updatedPlayer = {
      ...createPlayerRecord(),
      skills: [
        {
          playerId: 1,
          skillCode: 'combat.guard',
          experience: 1,
          rank: 0,
          updatedAt: new Date('2026-04-12T00:00:00.000Z'),
        },
      ],
    };

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      status: 'COMPLETED',
      result: 'DEFEAT',
      rewardsSnapshot: JSON.stringify(completedBattle.rewards),
    }));
    tx.player.findUnique
      .mockResolvedValueOnce(createPlayerRecord())
      .mockResolvedValueOnce(updatedPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerSkill.findMany.mockResolvedValue([]);
    tx.playerSkill.upsert.mockResolvedValue({});

    const finalized = await repository.finalizeBattle(1, completedBattle, {
      playerSkillGains: [
        {
          skillCode: 'combat.guard',
          points: 1,
        },
      ],
    });

    expect(tx.playerSkill.upsert).toHaveBeenCalledWith({
      where: {
        playerId_skillCode: {
          playerId: 1,
          skillCode: 'combat.guard',
        },
      },
      update: {
        experience: 1,
        rank: 0,
      },
      create: {
        playerId: 1,
        skillCode: 'combat.guard',
        experience: 1,
        rank: 0,
      },
    });
    expect(finalized.player.skills).toEqual([
      {
        skillCode: 'combat.guard',
        experience: 1,
        rank: 0,
      },
    ]);
  });

  it('claims a quest reward under a command intent receipt when options are provided', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.rewardLedgerRecord.create.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue({
      ...createPlayerRecord(),
      gold: 12,
      inventory: {
        ...createPlayerRecord().inventory,
        usualShards: 16,
      },
    });

    const result = await repository.claimQuestReward(
      1,
      'awakening_empty_master',
      { gold: 5, inventoryDelta: { usualShards: 1 }, blueprintDelta: { skinning_kit: 1 } },
      {
        commandKey: 'CLAIM_QUEST_REWARD',
        intentId: 'legacy-text:2000000001:1001:94:забрать награду',
        intentStateKey: 'awakening_empty_master',
        currentStateKey: 'awakening_empty_master',
      },
    );

    expect(tx.commandIntentRecord.create).toHaveBeenCalledWith({
      data: {
        playerId: 1,
        intentId: 'legacy-text:2000000001:1001:94:забрать награду',
        commandKey: 'CLAIM_QUEST_REWARD',
        stateKey: 'awakening_empty_master',
      },
    });
    expect(tx.rewardLedgerRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 1,
        ledgerKey: 'quest_reward:1:awakening_empty_master',
        sourceType: 'QUEST_REWARD',
        sourceId: 'awakening_empty_master',
        status: 'APPLIED',
      }),
    });
    expect(tx.commandIntentRecord.update).toHaveBeenCalledWith({
      where: {
        playerId_intentId: {
          playerId: 1,
          intentId: 'legacy-text:2000000001:1001:94:забрать награду',
        },
      },
      data: {
        status: 'APPLIED',
        resultSnapshot: expect.any(String),
      },
    });

    const resultSnapshot = JSON.parse(String(tx.commandIntentRecord.update.mock.calls[0]?.[0]?.data?.resultSnapshot));
    expect(resultSnapshot).toMatchObject({
      questCode: 'awakening_empty_master',
      claimed: true,
      reward: {
        gold: 5,
        inventoryDelta: { usualShards: 1 },
        blueprintDelta: { skinning_kit: 1 },
      },
    });
    expect(tx.playerBlueprint.upsert).toHaveBeenCalledWith({
      where: {
        playerId_blueprintCode: {
          playerId: 1,
          blueprintCode: 'skinning_kit',
        },
      },
      update: {
        quantity: { increment: 1 },
      },
      create: {
        playerId: 1,
        blueprintCode: 'skinning_kit',
        quantity: 1,
      },
    });
    expect(result.claimed).toBe(true);
    expect(result.questCode).toBe('awakening_empty_master');
  });

  it('finalizes the quest command receipt when the reward ledger was already claimed', async () => {
    const { repository, tx } = createPrismaMock();

    tx.commandIntentRecord.findUnique.mockResolvedValue(null);
    tx.commandIntentRecord.create.mockResolvedValue({});
    tx.commandIntentRecord.update.mockResolvedValue({});
    tx.rewardLedgerRecord.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Unique conflict', {
      code: 'P2002',
      clientVersion: 'test',
      meta: {
        target: ['ledgerKey'],
      },
    }));
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());

    const result = await repository.claimQuestReward(
      1,
      'awakening_empty_master',
      { gold: 5, inventoryDelta: { usualShards: 1 } },
      {
        commandKey: 'CLAIM_QUEST_REWARD',
        intentId: 'legacy-text:2000000001:1001:95:забрать награду',
        intentStateKey: 'awakening_empty_master',
        currentStateKey: 'awakening_empty_master',
      },
    );

    expect(result.claimed).toBe(false);
    expect(tx.player.update).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.commandIntentRecord.update).toHaveBeenCalledWith({
      where: {
        playerId_intentId: {
          playerId: 1,
          intentId: 'legacy-text:2000000001:1001:95:забрать награду',
        },
      },
      data: {
        status: 'APPLIED',
        resultSnapshot: expect.any(String),
      },
    });

    const resultSnapshot = JSON.parse(String(tx.commandIntentRecord.update.mock.calls[0]?.[0]?.data?.resultSnapshot));
    expect(resultSnapshot).toMatchObject({
      questCode: 'awakening_empty_master',
      claimed: false,
    });
  });

  it('derives bestiary discovery from battles and applied victory ledgers', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findMany.mockResolvedValue([
      { id: 'battle-1', enemyCode: 'blue-slime' },
      { id: 'battle-2', enemyCode: 'forest-wolf' },
      { id: 'battle-3', enemyCode: 'blue-slime' },
    ]);
    tx.rewardLedgerRecord.findMany.mockResolvedValue([
      { sourceType: 'BATTLE_VICTORY', sourceId: 'battle-2' },
      { sourceType: 'BATTLE_VICTORY', sourceId: 'battle-3' },
      { sourceType: 'BATTLE_VICTORY', sourceId: 'battle-missing' },
      { sourceType: BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE, sourceId: 'initium' },
      { sourceType: BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE, sourceId: 'blue-slime:1' },
    ]);

    const discovery = await repository.listBestiaryDiscovery(1);

    expect(discovery).toEqual({
      discoveredEnemyCodes: ['blue-slime', 'forest-wolf'],
      rewardedEnemyCodes: ['forest-wolf', 'blue-slime'],
      enemyVictoryCounts: [
        { enemyCode: 'forest-wolf', victoryCount: 1 },
        { enemyCode: 'blue-slime', victoryCount: 1 },
      ],
      claimedLocationRewardCodes: ['initium'],
      claimedKillMilestones: [{ enemyCode: 'blue-slime', threshold: 1 }],
    });
    expect(tx.battleSession.findMany).toHaveBeenCalledWith({
      where: { playerId: 1 },
      select: {
        id: true,
        enemyCode: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    expect(tx.rewardLedgerRecord.findMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        sourceType: {
          in: [
            'BATTLE_VICTORY',
            BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE,
            BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE,
          ],
        },
        status: 'APPLIED',
      },
      select: {
        sourceType: true,
        sourceId: true,
      },
      orderBy: {
        appliedAt: 'asc',
      },
    });
  });

  it('claims a bestiary location discovery reward exactly once', async () => {
    const { repository, tx } = createPrismaMock();

    tx.rewardLedgerRecord.create.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    tx.player.findUnique.mockResolvedValue({
      ...createPlayerRecord(),
      radiance: 1,
    });

    const result = await repository.claimBestiaryLocationDiscoveryReward(1, 'initium', { radiance: 1 });

    expect(result).toMatchObject({
      biomeCode: 'initium',
      reward: { radiance: 1 },
      claimed: true,
    });
    expect(result.player.radiance).toBe(1);
    expect(tx.rewardLedgerRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 1,
        ledgerKey: 'bestiary_location:1:initium',
        sourceType: BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE,
        sourceId: 'initium',
        status: 'APPLIED',
      }),
    });
    expect(tx.player.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        radiance: {
          increment: 1,
        },
      },
    });
  });

  it('does not apply a duplicate bestiary location discovery reward', async () => {
    const { repository, tx } = createPrismaMock();

    tx.rewardLedgerRecord.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Unique conflict', {
      code: 'P2002',
      clientVersion: 'test',
      meta: {
        target: ['ledgerKey'],
      },
    }));
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());

    const result = await repository.claimBestiaryLocationDiscoveryReward(1, 'initium', { radiance: 1 });

    expect(result).toMatchObject({
      biomeCode: 'initium',
      reward: { radiance: 1 },
      claimed: false,
    });
    expect(tx.player.update).not.toHaveBeenCalled();
  });

  it('claims a bestiary enemy kill milestone reward exactly once', async () => {
    const { repository, tx } = createPrismaMock();

    tx.rewardLedgerRecord.create.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    tx.player.findUnique.mockResolvedValue({
      ...createPlayerRecord(),
      radiance: 2,
    });

    const result = await repository.claimBestiaryEnemyKillMilestoneReward(1, 'blue-slime', 10, { radiance: 2 });

    expect(result).toMatchObject({
      enemyCode: 'blue-slime',
      threshold: 10,
      reward: { radiance: 2 },
      claimed: true,
    });
    expect(result.player.radiance).toBe(2);
    expect(tx.rewardLedgerRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 1,
        ledgerKey: 'bestiary_kill:1:blue-slime:10',
        sourceType: BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE,
        sourceId: 'blue-slime:10',
        status: 'APPLIED',
      }),
    });
  });

  it('finds a pending reward with battle source context', async () => {
    const { repository, tx } = createPrismaMock();
    const pendingRecord = createPendingRewardLedgerRecord();
    const enemySnapshot = {
      ...createBattleView().enemy,
      code: 'forest-wolf',
      name: 'Лесной волк',
      kind: 'wolf',
    };

    tx.rewardLedgerRecord.findFirst.mockResolvedValue(pendingRecord);
    tx.battleSession.findUnique.mockResolvedValue(createBattleRow({
      enemyCode: 'forest-wolf',
      enemyName: 'Лесной волк',
      enemySnapshot: JSON.stringify(enemySnapshot),
    }));

    const result = await repository.findPendingReward(1);

    expect(tx.rewardLedgerRecord.findFirst).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    expect(tx.battleSession.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'battle-1',
      },
    });
    expect(result).toMatchObject({
      ledgerKey: 'battle-victory:battle-1',
      source: {
        battleId: 'battle-1',
        enemyCode: 'forest-wolf',
        enemyName: 'Лесной волк',
        enemyKind: 'wolf',
      },
      snapshot: {
        status: 'PENDING',
        sourceId: 'battle-1',
      },
    });
  });

  it('collects a pending reward with the selected trophy action', async () => {
    const { repository, tx } = createPrismaMock();
    const pendingRecord = createPendingRewardLedgerRecord();

    tx.rewardLedgerRecord.findUnique.mockResolvedValue(pendingRecord);
    tx.rewardLedgerRecord.updateMany.mockResolvedValue({ count: 1 });
    tx.playerSkill.findMany.mockResolvedValue([]);
    tx.playerSkill.upsert.mockResolvedValue({});
    tx.player.findUnique.mockResolvedValue({
      ...createPlayerRecord(),
      skills: [
        {
          playerId: 1,
          skillCode: 'gathering.skinning',
          experience: 1,
          rank: 0,
          updatedAt: new Date('2026-04-22T00:01:00.000Z'),
        },
      ],
    });

    const result = await repository.collectPendingReward(1, 'battle-victory:battle-1', 'skin_beast');

    expect(tx.rewardLedgerRecord.findUnique).toHaveBeenCalledWith({
      where: {
        ledgerKey: 'battle-victory:battle-1',
      },
    });
    expect(tx.rewardLedgerRecord.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        ledgerKey: 'battle-victory:battle-1',
        status: 'PENDING',
      },
      data: {
        status: 'APPLIED',
        entrySnapshot: expect.any(String),
        appliedAt: expect.any(Date),
      },
    });

    const updateData = tx.rewardLedgerRecord.updateMany.mock.calls[0]?.[0]?.data;
    const ledgerSnapshot = JSON.parse(String(updateData?.entrySnapshot));

    expect(ledgerSnapshot).toMatchObject({
      ledgerKey: 'battle-victory:battle-1',
      status: 'APPLIED',
      pendingRewardSnapshot: {
        status: 'APPLIED',
        selectedActionCode: 'skin_beast',
        appliedResult: {
          baseRewardApplied: true,
          inventoryDelta: {},
          skillUps: [
            {
              skillCode: 'gathering.skinning',
              experienceBefore: 0,
              experienceAfter: 1,
              rankBefore: 0,
              rankAfter: 0,
            },
          ],
          statUps: [],
          schoolUps: [],
        },
      },
    });
    expect(tx.playerSkill.upsert).toHaveBeenCalledWith({
      where: {
        playerId_skillCode: {
          playerId: 1,
          skillCode: 'gathering.skinning',
        },
      },
      update: {
        experience: 1,
        rank: 0,
      },
      create: {
        playerId: 1,
        skillCode: 'gathering.skinning',
        experience: 1,
        rank: 0,
      },
    });
    expect(result.ledgerKey).toBe('battle-victory:battle-1');
    expect(result.selectedActionCode).toBe('skin_beast');
    expect(result.appliedResult).toEqual(ledgerSnapshot.pendingRewardSnapshot.appliedResult);
    expect(result.player.skills).toEqual([
      {
        skillCode: 'gathering.skinning',
        experience: 1,
        rank: 0,
      },
    ]);
  });

  it('collects the claim-all trophy action as material loot without skill progress', async () => {
    const { repository, tx } = createPrismaMock();
    const pendingRecord = createClaimAllRewardLedgerRecord();

    tx.rewardLedgerRecord.findUnique.mockResolvedValue(pendingRecord);
    tx.rewardLedgerRecord.updateMany.mockResolvedValue({ count: 1 });
    tx.playerInventory.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue({
      ...createPlayerRecord(),
      inventory: {
        ...createPlayerRecord().inventory,
        leather: 2,
        bone: 1,
        herb: 3,
      },
    });

    const result = await repository.collectPendingReward(1, 'battle-victory:battle-1', 'claim_all');

    const updateData = tx.rewardLedgerRecord.updateMany.mock.calls[0]?.[0]?.data;
    const ledgerSnapshot = JSON.parse(String(updateData?.entrySnapshot));

    expect(ledgerSnapshot.pendingRewardSnapshot).toMatchObject({
      status: 'APPLIED',
      selectedActionCode: 'claim_all',
      appliedResult: {
        baseRewardApplied: true,
        inventoryDelta: {
          leather: 2,
          bone: 1,
          herb: 3,
        },
        skillUps: [],
        statUps: [],
        schoolUps: [],
      },
    });
    expect(tx.playerInventory.updateMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
      },
      data: {
        leather: { increment: 2 },
        bone: { increment: 1 },
        herb: { increment: 3 },
      },
    });
    expect(tx.playerSkill.findMany).not.toHaveBeenCalled();
    expect(tx.playerSkill.upsert).not.toHaveBeenCalled();
    expect(result.selectedActionCode).toBe('claim_all');
    expect(result.appliedResult.inventoryDelta).toEqual({
      leather: 2,
      bone: 1,
      herb: 3,
    });
    expect(result.player.inventory).toMatchObject({
      leather: 2,
      bone: 1,
      herb: 3,
    });
  });

  it('replays an already applied pending reward without applying it again', async () => {
    const { repository, tx } = createPrismaMock();
    const pendingRecord = createPendingRewardLedgerRecord();
    const pendingLedger = JSON.parse(pendingRecord.entrySnapshot);
    const appliedAt = '2026-04-22T00:01:00.000Z';
    const appliedResult: PendingRewardAppliedResultSnapshot = {
      baseRewardApplied: true,
      inventoryDelta: {},
      skillUps: [
        {
          skillCode: 'gathering.skinning',
          experienceBefore: 0,
          experienceAfter: 1,
          rankBefore: 0,
          rankAfter: 0,
        },
      ],
      statUps: [],
      schoolUps: [],
    };
    const appliedLedger = createAppliedPendingRewardLedgerEntry({
      ...pendingLedger.pendingRewardSnapshot,
      status: 'APPLIED',
      selectedActionCode: 'skin_beast',
      appliedResult,
      updatedAt: appliedAt,
    }, appliedAt);

    tx.rewardLedgerRecord.findUnique.mockResolvedValue({
      ...pendingRecord,
      status: 'APPLIED',
      entrySnapshot: JSON.stringify(appliedLedger),
      appliedAt: new Date(appliedAt),
    });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());

    const result = await repository.collectPendingReward(1, 'battle-victory:battle-1', 'claim_all');

    expect(result.ledgerKey).toBe('battle-victory:battle-1');
    expect(result.selectedActionCode).toBe('skin_beast');
    expect(result.appliedResult).toEqual(appliedResult);
    expect(tx.rewardLedgerRecord.updateMany).not.toHaveBeenCalled();
    expect(tx.playerSkill.upsert).not.toHaveBeenCalled();
  });

  it('replays an already applied ember hidden trophy reward without rerolling it', async () => {
    const { repository, tx } = createPrismaMock();
    const createdAt = '2026-04-22T00:00:00.000Z';
    const appliedAt = '2026-04-22T00:01:00.000Z';
    const pendingSnapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      createEmberHiddenTrophyActions(),
      createdAt,
      [
        {
          actionCode: 'draw_ember_sign',
          inventoryDelta: {
            essence: 2,
          },
          skillPoints: [
            {
              skillCode: 'gathering.essence_extraction',
              points: 2,
            },
          ],
        },
      ],
    );
    const pendingLedger = createPendingRewardLedgerEntry(pendingSnapshot);
    const appliedResult: PendingRewardAppliedResultSnapshot = {
      baseRewardApplied: true,
      inventoryDelta: {
        essence: 2,
      },
      skillUps: [
        {
          skillCode: 'gathering.essence_extraction',
          experienceBefore: 0,
          experienceAfter: 2,
          rankBefore: 0,
          rankAfter: 0,
        },
      ],
      statUps: [],
      schoolUps: [],
    };
    const appliedLedger = createAppliedPendingRewardLedgerEntry({
      ...pendingLedger.pendingRewardSnapshot,
      status: 'APPLIED',
      selectedActionCode: 'draw_ember_sign',
      appliedResult,
      updatedAt: appliedAt,
    }, appliedAt);

    tx.rewardLedgerRecord.findUnique.mockResolvedValue({
      id: 'reward-ledger-row-1',
      playerId: 1,
      ledgerKey: appliedLedger.ledgerKey,
      sourceType: appliedLedger.sourceType,
      sourceId: appliedLedger.sourceId,
      status: 'APPLIED',
      entrySnapshot: JSON.stringify(appliedLedger),
      appliedAt: new Date(appliedAt),
      createdAt: new Date(createdAt),
      updatedAt: new Date(appliedAt),
    });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());

    const result = await repository.collectPendingReward(1, 'battle-victory:battle-1', 'claim_all');

    expect(result.ledgerKey).toBe('battle-victory:battle-1');
    expect(result.selectedActionCode).toBe('draw_ember_sign');
    expect(result.appliedResult).toEqual(appliedResult);
    expect(tx.rewardLedgerRecord.updateMany).not.toHaveBeenCalled();
    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.playerSkill.upsert).not.toHaveBeenCalled();
  });

  it('recovers missing pending rewards for completed victories', async () => {
    const { repository, tx } = createPrismaMock();
    const completedBattle = createBattleView({
      enemy: {
        ...createBattleView().enemy,
        kind: 'slime',
        lootTable: {
          herb: 2,
          essence: 1,
        },
      },
    });
    const completedBattleRow = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(completedBattle.rewards),
      enemySnapshot: JSON.stringify(completedBattle.enemy),
      updatedAt: new Date('2026-04-22T00:02:00.000Z'),
    });

    tx.battleSession.findMany.mockResolvedValue([completedBattleRow]);
    tx.rewardLedgerRecord.findUnique.mockResolvedValue(null);
    tx.rewardLedgerRecord.create.mockResolvedValue({});

    const result = await repository.recoverPendingRewardsOnStart();

    expect(result).toEqual({
      scanned: 1,
      recovered: 1,
      skipped: 0,
    });
    expect(tx.battleSession.findMany).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        result: 'VICTORY',
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    expect(tx.rewardLedgerRecord.findUnique).toHaveBeenCalledWith({
      where: {
        ledgerKey: 'battle-victory:battle-1',
      },
    });
    expect(tx.rewardLedgerRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 1,
        ledgerKey: 'battle-victory:battle-1',
        sourceType: 'BATTLE_VICTORY',
        sourceId: 'battle-1',
        status: 'PENDING',
        appliedAt: null,
      }),
    });

    const ledgerSnapshot = JSON.parse(String(tx.rewardLedgerRecord.create.mock.calls[0]?.[0]?.data?.entrySnapshot));
    expect(ledgerSnapshot).toMatchObject({
      status: 'PENDING',
      pendingRewardSnapshot: {
        createdAt: '2026-04-22T00:02:00.000Z',
        trophyActions: [
          expect.objectContaining({
            code: 'gather_slime',
            reward: {
              inventoryDelta: {
                herb: 3,
                essence: 1,
              },
              skillPoints: [
                {
                  skillCode: 'gathering.reagent_gathering',
                  points: 1,
                },
              ],
            },
          }),
          expect.objectContaining({
            code: 'claim_all',
            reward: {
              inventoryDelta: {
                herb: 2,
                essence: 1,
              },
              skillPoints: [],
            },
          }),
        ],
      },
    });
  });

  it('skips completed victories that already have a reward ledger', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findMany.mockResolvedValue([
      createBattleRow({
        status: 'COMPLETED',
        result: 'VICTORY',
        rewardsSnapshot: JSON.stringify(createBattleView().rewards),
        updatedAt: new Date('2026-04-22T00:02:00.000Z'),
      }),
    ]);
    tx.rewardLedgerRecord.findUnique.mockResolvedValue(createPendingRewardLedgerRecord());

    const result = await repository.recoverPendingRewardsOnStart();

    expect(result).toEqual({
      scanned: 1,
      recovered: 0,
      skipped: 1,
    });
    expect(tx.rewardLedgerRecord.create).not.toHaveBeenCalled();
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

  it('stores a requested nickname when creating a player', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.findFirst.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({
      player: {
        ...createPlayerRecord(),
        name: 'Лианна',
      },
    });

    const result = await repository.createPlayer(1001, { name: 'Лианна' });

    expect(result.player.name).toBe('Лианна');
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        player: expect.objectContaining({
          create: expect.objectContaining({
            name: 'Лианна',
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
      playerSkillGains: [
        {
          skillCode: 'combat.striking',
          points: 1,
        },
      ],
    });

    expect(battle.status).toBe('ACTIVE');
    expect(battle.turnOwner).toBe('ENEMY');
    expect(tx.battleSession.updateMany).not.toHaveBeenCalled();
    expect(tx.playerSkill.upsert).not.toHaveBeenCalled();
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
      playerSkillGains: [
        {
          skillCode: 'combat.striking',
          points: 1,
        },
      ],
    });

    expect(finalized.battle.status).toBe('COMPLETED');
    expect(finalized.player.playerId).toBe(1);
    expect(tx.battleSession.updateMany).not.toHaveBeenCalled();
    expect(tx.playerSkill.upsert).not.toHaveBeenCalled();
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

  it('does not reroll rune stats when rune dust is already spent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.rerollRuneStat(1, 'rune-1', 'USUAL', createStats())).rejects.toMatchObject({
      code: 'not_enough_rune_resources',
    });

    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
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

  it('returns the party to open state after a shared battle ends', async () => {
    const { repository, tx } = createPrismaMock();
    const leaderRecord = createPlayerRecordFor(1, 1001);
    const allyRecord = createPlayerRecordFor(2, 1002);
    const leaderSnapshot = {
      ...createBattleView().player,
      playerId: 1,
      name: 'Рунный мастер #1001',
    };
    const allySnapshot = {
      ...createBattleView().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const battleView = createBattleView({
      battleType: 'PARTY_PVE',
      result: 'DEFEAT',
      rewards: null,
      player: leaderSnapshot,
      party: {
        id: 'party-1',
        inviteCode: 'ABC123',
        leaderPlayerId: 1,
        currentTurnPlayerId: null,
        enemyTargetPlayerId: null,
        actedPlayerIds: [1, 2],
        members: [
          { playerId: 1, vkId: 1001, name: leaderSnapshot.name, snapshot: leaderSnapshot },
          { playerId: 2, vkId: 1002, name: allySnapshot.name, snapshot: allySnapshot },
        ],
      },
    });
    const persistedBattle = createBattleRow({
      battleType: 'PARTY_PVE',
      status: 'COMPLETED',
      result: 'DEFEAT',
      rewardsSnapshot: null,
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockImplementation(async ({ where }: { where: { id: number } }) => (
      where.id === allyRecord.id ? allyRecord : leaderRecord
    ));
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerParty.updateMany.mockResolvedValue({ count: 1 });
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    expect(tx.playerParty.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'party-1',
        activeBattleId: 'battle-1',
      },
      data: {
        status: 'OPEN',
        activeBattleId: null,
      },
    });
  });

  it('lets a member leave an active party outside battle', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerParty.findFirst.mockResolvedValue(createPartyRecord());
    tx.playerPartyMember.deleteMany.mockResolvedValue({ count: 1 });

    await expect(repository.leaveParty(2)).resolves.toBeUndefined();

    expect(tx.playerPartyMember.deleteMany).toHaveBeenCalledWith({
      where: {
        partyId: 'party-1',
        playerId: 2,
      },
    });
  });

  it('uses saved player names in active party views', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerParty.findFirst.mockResolvedValue(createPartyRecord({
      members: [
        {
          partyId: 'party-1',
          playerId: 1,
          role: 'LEADER',
          joinedAt: new Date('2026-04-12T00:00:00.000Z'),
          player: {
            name: 'Лианна',
            user: {
              vkId: 1001,
            },
          },
        },
        {
          partyId: 'party-1',
          playerId: 2,
          role: 'MEMBER',
          joinedAt: new Date('2026-04-12T00:01:00.000Z'),
          player: {
            name: null,
            user: {
              vkId: 1002,
            },
          },
        },
      ],
    }));

    const party = await repository.getActiveParty(1);

    expect(party?.members[0]?.name).toBe('Лианна');
    expect(party?.members[1]?.name).toBe('Рунный мастер #1002');
  });

  it('lets the leader disband an active party outside battle', async () => {
    const { repository, tx } = createPrismaMock();

    tx.playerParty.findFirst.mockResolvedValue(createPartyRecord());
    tx.playerParty.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.disbandParty(1)).resolves.toBeUndefined();

    expect(tx.playerParty.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'party-1',
        leaderPlayerId: 1,
      },
      data: {
        status: 'COMPLETED',
        activeBattleId: null,
      },
    });
  });

  it('decays workshop loadout durability once when finalizing battle', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      player: {
        ...createBattleView().player,
        workshopLoadout: [
          {
            id: 'limited-weapon-1',
            itemCode: 'hunter_cleaver',
            itemClass: 'L',
            slot: 'weapon',
            durability: 1,
            maxDurability: 14,
          },
          {
            id: 'ul-tool-1',
            itemCode: 'skinning_kit',
            itemClass: 'UL',
            slot: 'tool',
            durability: 2,
            maxDurability: 12,
          },
        ],
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);
    tx.playerCraftedItem.findMany.mockResolvedValue([
      createCraftedItemRecord({
        id: 'limited-weapon-1',
        itemCode: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        equipped: true,
        durability: 1,
        maxDurability: 14,
      }),
      createCraftedItemRecord({
        id: 'ul-tool-1',
        itemCode: 'skinning_kit',
        itemClass: 'UL',
        slot: 'tool',
        equipped: true,
        durability: 2,
        maxDurability: 12,
      }),
    ]);
    tx.playerCraftedItem.updateMany.mockResolvedValue({ count: 1 });

    await repository.finalizeBattle(1, battleView);

    expect(tx.playerCraftedItem.findMany).toHaveBeenCalledWith({
      where: {
        playerId: 1,
        id: { in: ['limited-weapon-1', 'ul-tool-1'] },
        status: 'ACTIVE',
        durability: { gt: 0 },
      },
    });
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'limited-weapon-1',
        playerId: 1,
        status: 'ACTIVE',
        durability: { gt: 0 },
      },
      data: {
        status: 'DESTROYED',
        equipped: false,
        durability: 0,
      },
    });
    expect(tx.playerCraftedItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ul-tool-1',
        playerId: 1,
        status: 'ACTIVE',
        durability: { gt: 0 },
      },
      data: {
        status: 'ACTIVE',
        equipped: true,
        durability: 1,
      },
    });
  });

  it('creates a pending reward ledger entry for the canonical victory reward', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      enemy: {
        ...createBattleView().enemy,
        kind: 'wolf',
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
      enemyKind: 'wolf',
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    const finalized = await repository.finalizeBattle(1, battleView);

    expect(finalized.battle.status).toBe('COMPLETED');
    expect(tx.rewardLedgerRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 1,
        ledgerKey: 'battle-victory:battle-1',
        sourceType: 'BATTLE_VICTORY',
        sourceId: 'battle-1',
        status: 'PENDING',
        appliedAt: null,
      }),
    });
    const ledgerSnapshot = JSON.parse(String(tx.rewardLedgerRecord.create.mock.calls[0]?.[0]?.data?.entrySnapshot));
    expect(ledgerSnapshot).toMatchObject({
      schemaVersion: 1,
      ledgerKey: 'battle-victory:battle-1',
      status: 'PENDING',
      sourceType: 'BATTLE_VICTORY',
      sourceId: 'battle-1',
      playerId: 1,
      pendingRewardSnapshot: {
        schemaVersion: 1,
        intentId: 'battle-victory:battle-1',
        status: 'PENDING',
        sourceType: 'BATTLE_VICTORY',
        sourceId: 'battle-1',
        playerId: 1,
        selectedActionCode: null,
        appliedResult: null,
        trophyActions: [
          expect.objectContaining({
            code: 'skin_beast',
            skillCodes: ['gathering.skinning'],
            visibleRewardFields: ['leather', 'bone'],
          }),
          expect.objectContaining({
            code: 'claim_all',
          }),
        ],
      },
    });
    expect(tx.gameLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'reward_claim_applied',
      }),
    });
  });

  it('records a surviving higher-biome roaming enemy as a server threat', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      result: 'DEFEAT',
      rewards: null,
      locationLevel: 8,
      biomeCode: 'dark-forest',
      enemyCode: 'cave-stalker',
      enemy: {
        ...createBattleView().enemy,
        code: 'cave-stalker',
        name: 'Пещерный следопыт',
        currentHealth: 7,
        experienceReward: 20,
        roaming: {
          direction: 'HIGHER_BIOME',
          originBiomeCode: 'forgotten-caves',
          originBiomeName: 'Забытые пещеры',
          levelBonus: 2,
          experienceBonus: 4,
        },
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'DEFEAT',
      rewardsSnapshot: null,
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    expect(tx.roamingThreat.upsert).toHaveBeenCalledWith({
      where: {
        enemyCode_originBiomeCode_currentBiomeCode: {
          enemyCode: 'cave-stalker',
          originBiomeCode: 'forgotten-caves',
          currentBiomeCode: 'dark-forest',
        },
      },
      update: {
        enemyName: 'Пещерный следопыт',
        originBiomeName: 'Забытые пещеры',
        lastSeenBattleId: 'battle-1',
        lastSeenLocationLevel: 8,
        lastSurvivalResult: 'DEFEAT',
        survivalCount: { increment: 1 },
        experience: { increment: 12 },
        levelBonus: { increment: 1 },
        status: 'ACTIVE',
      },
      create: {
        enemyCode: 'cave-stalker',
        enemyName: 'Пещерный следопыт',
        originBiomeCode: 'forgotten-caves',
        originBiomeName: 'Забытые пещеры',
        currentBiomeCode: 'dark-forest',
        firstSeenBattleId: 'battle-1',
        lastSeenBattleId: 'battle-1',
        lastSeenLocationLevel: 8,
        lastSurvivalResult: 'DEFEAT',
        survivalCount: 1,
        experience: 12,
        levelBonus: 2,
        status: 'ACTIVE',
      },
    });
  });

  it('records an ordinary new enemy when the player flees from it', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      result: 'FLED',
      rewards: null,
      locationLevel: 6,
      biomeCode: 'dark-forest',
      enemyCode: 'blue-slime',
      enemy: {
        ...createBattleView().enemy,
        code: 'blue-slime',
        name: 'Blue Slime',
        currentHealth: 4,
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'FLED',
      rewardsSnapshot: null,
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    expect(tx.roamingThreat.upsert).toHaveBeenCalledWith({
      where: {
        enemyCode_originBiomeCode_currentBiomeCode: {
          enemyCode: 'blue-slime',
          originBiomeCode: 'dark-forest',
          currentBiomeCode: 'dark-forest',
        },
      },
      update: {
        enemyName: 'Blue Slime',
        originBiomeName: 'dark-forest',
        lastSeenBattleId: 'battle-1',
        lastSeenLocationLevel: 6,
        lastSurvivalResult: 'FLED',
        survivalCount: { increment: 1 },
        experience: { increment: 6 },
        levelBonus: { increment: 1 },
        status: 'ACTIVE',
      },
      create: {
        enemyCode: 'blue-slime',
        enemyName: 'Blue Slime',
        originBiomeCode: 'dark-forest',
        originBiomeName: 'dark-forest',
        currentBiomeCode: 'dark-forest',
        firstSeenBattleId: 'battle-1',
        lastSeenBattleId: 'battle-1',
        lastSeenLocationLevel: 6,
        lastSurvivalResult: 'FLED',
        survivalCount: 1,
        experience: 6,
        levelBonus: 1,
        status: 'ACTIVE',
      },
    });
  });

  it('marks an active ordinary threat as defeated when the player kills that enemy', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      result: 'VICTORY',
      locationLevel: 6,
      biomeCode: 'dark-forest',
      enemyCode: 'blue-slime',
      enemy: {
        ...createBattleView().enemy,
        code: 'blue-slime',
        name: 'Blue Slime',
        currentHealth: 0,
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    expect(tx.roamingThreat.updateMany).toHaveBeenCalledWith({
      where: {
        enemyCode: 'blue-slime',
        originBiomeCode: 'dark-forest',
        currentBiomeCode: 'dark-forest',
        status: 'ACTIVE',
      },
      data: {
        lastSeenBattleId: 'battle-1',
        lastSeenLocationLevel: 6,
        status: 'DEFEATED',
      },
    });
  });

  it('uses post-battle vitals when persisting the next adaptive location level', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      player: {
        ...createBattleView().player,
        currentHealth: 1,
        currentMana: 1,
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    expect(tx.playerProgress.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        locationLevel: 1,
        currentHealth: 1,
        currentMana: 1,
      }),
    }));
  });

  it('adds the ember hidden trophy action to ash seer pending rewards when ember is equipped', async () => {
    const { repository, tx } = createPrismaMock();
    const battleView = createBattleView({
      enemyCode: 'ash-seer',
      player: {
        ...createBattleView().player,
        runeLoadout: {
          runeId: 'rune-ember-1',
          runeName: 'Руна Пламени',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'ember_pulse',
            name: 'Импульс углей',
            manaCost: 3,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
      enemy: {
        ...createBattleView().enemy,
        code: 'ash-seer',
        name: 'Пепельная ведунья',
        kind: 'mage',
        isElite: true,
        lootTable: {
          herb: 2,
          essence: 1,
        },
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      enemyCode: 'ash-seer',
      enemyName: 'Пепельная ведунья',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
      enemySnapshot: JSON.stringify(battleView.enemy),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(createPlayerRecord());
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    const ledgerSnapshot = JSON.parse(String(tx.rewardLedgerRecord.create.mock.calls[0]?.[0]?.data?.entrySnapshot));
    const trophyActions = ledgerSnapshot.pendingRewardSnapshot.trophyActions as Array<{
      readonly code: string;
      readonly reward?: unknown;
    }>;

    expect(trophyActions.map((action) => action.code)).toEqual([
      'draw_ember_sign',
      'extract_essence',
      'claim_all',
    ]);
    expect(trophyActions.find((action) => action.code === 'draw_ember_sign')).toMatchObject({
      code: 'draw_ember_sign',
      skillCodes: ['gathering.essence_extraction'],
      visibleRewardFields: ['essence'],
      reward: {
        inventoryDelta: {
          essence: 2,
        },
        skillPoints: [
          {
            skillCode: 'gathering.essence_extraction',
            points: 2,
          },
        ],
      },
    });
  });

  it('adds a skill-threshold trophy action to pending rewards when the player has enough skill', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = {
      ...createPlayerRecord(),
      skills: [
        {
          playerId: 1,
          skillCode: 'gathering.skinning',
          experience: 10,
          rank: 0,
          updatedAt: new Date('2026-04-22T00:00:00.000Z'),
        },
      ],
    };
    const battleView = createBattleView({
      enemy: {
        ...createBattleView().enemy,
        code: 'forest-wolf',
        name: 'Лесной волк',
        kind: 'wolf',
        lootTable: {
          leather: 2,
          bone: 1,
        },
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      enemyCode: 'forest-wolf',
      enemyName: 'Лесной волк',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
      enemySnapshot: JSON.stringify(battleView.enemy),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    const ledgerSnapshot = JSON.parse(String(tx.rewardLedgerRecord.create.mock.calls[0]?.[0]?.data?.entrySnapshot));
    const trophyActions = ledgerSnapshot.pendingRewardSnapshot.trophyActions as Array<{
      readonly code: string;
      readonly reward?: unknown;
    }>;

    expect(trophyActions.map((action) => action.code)).toEqual([
      'skin_beast',
      'careful_skinning',
      'claim_all',
    ]);
    expect(trophyActions.find((action) => action.code === 'careful_skinning')).toMatchObject({
      code: 'careful_skinning',
      skillCodes: ['gathering.skinning'],
      visibleRewardFields: ['leather', 'bone'],
      reward: {
        inventoryDelta: {
          leather: 3,
          bone: 1,
        },
        skillPoints: [
          {
            skillCode: 'gathering.skinning',
            points: 1,
          },
        ],
      },
    });
  });

  it('marks school novice aligned reward claims in the reward telemetry payload', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    const battleView = createBattleView({
      locationLevel: 4,
      biomeCode: 'dark-forest',
      enemyCode: 'ash-seer',
      player: {
        ...createBattleView().player,
        runeLoadout: {
          runeId: 'rune-ember-1',
          runeName: 'Руна Пламени',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'ember_pulse',
            name: 'Импульс углей',
            manaCost: 3,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
      enemy: {
        ...createBattleView().enemy,
        code: 'ash-seer',
        name: 'Пепельная ведунья',
        kind: 'mage',
        isElite: true,
        attack: 7,
        magicDefence: 4,
        dexterity: 5,
        intelligence: 8,
        maxHealth: 24,
        experienceReward: 24,
        goldReward: 9,
        runeDropChance: 28,
        attackText: 'выпускает пепельный прорыв',
      },
      rewards: {
        experience: 24,
        gold: 9,
        shards: { USUAL: 2, UNUSUAL: 1 },
        droppedRune: {
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          archetypeCode: 'ember',
          activeAbilityCodes: ['ember_pulse'],
          passiveAbilityCodes: ['ember_heart'],
          health: 2,
          attack: 3,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
        },
      },
    });
    const persistedBattle = createBattleRow({
      status: 'COMPLETED',
      result: 'VICTORY',
      locationLevel: 4,
      biomeCode: 'dark-forest',
      enemyCode: 'ash-seer',
      enemyName: 'Пепельная ведунья',
      rewardsSnapshot: JSON.stringify(battleView.rewards),
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.playerInventory.update.mockResolvedValue({});
    tx.rune.create.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(persistedBattle);

    await repository.finalizeBattle(1, battleView);

    const gameLogCall = tx.gameLog.create.mock.calls.at(-1)?.[0];
    expect(gameLogCall?.data.action).toBe('reward_claim_applied');
    expect(JSON.parse(String(gameLogCall?.data.details))).toEqual(expect.objectContaining({
      battleId: 'battle-1',
      enemyCode: 'ash-seer',
      battleSchoolCode: 'ember',
      isSchoolNoviceAligned: true,
      novicePathSchoolCode: 'ember',
      noviceTargetRewardRarity: 'UNUSUAL',
      hadTargetRarityBefore: false,
      rewardRuneArchetypeCode: 'ember',
      rewardRuneRarity: 'UNUSUAL',
    }));
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

  it('does not craft a rune when rune dust is already spent', async () => {
    const { repository, tx } = createPrismaMock();

    tx.player.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.craftRune(1, 'USUAL', createRuneDraft())).rejects.toMatchObject({
      code: 'not_enough_rune_resources',
    });

    expect(tx.playerInventory.updateMany).not.toHaveBeenCalled();
    expect(tx.rune.create).not.toHaveBeenCalled();
  });

  it('persists defeat recovery vitals on player progress for the next encounter', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    const battle = createBattleView({
      result: 'DEFEAT',
      rewards: null,
      player: {
        ...createBattleView().player,
        currentHealth: 0,
        currentMana: 2,
      },
      enemy: {
        ...createBattleView().enemy,
        currentHealth: 3,
      },
    });

    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.player.update.mockResolvedValue({});
    tx.playerProgress.update.mockResolvedValue({});
    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      status: 'COMPLETED',
      result: 'DEFEAT',
      rewardsSnapshot: null,
    }));

    await repository.finalizeBattle(1, battle);

    expect(tx.playerProgress.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        activeBattleId: null,
        currentHealth: 3,
        currentMana: 2,
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
      equippedSlot: 0,
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
    expect(tx.playerProgress.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        unlockedRuneSlotCount: 2,
      }),
    }));
  });

  it('allows moving the first rune into slot 2 through repository path', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    currentPlayer.progress.unlockedRuneSlotCount = 2;
    currentPlayer.runes = [{
      id: 'rune-1',
      runeCode: 'rune-1',
      archetypeCode: 'ember',
      passiveAbilityCodes: '[]',
      activeAbilityCodes: '[]',
      name: 'Руна Пламени',
      rarity: 'USUAL',
      health: 1,
      attack: 2,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
      isEquipped: true,
      equippedSlot: 0,
      createdAt: new Date('2026-04-12T00:00:00.000Z'),
      updatedAt: new Date('2026-04-12T00:00:00.000Z'),
    }];
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.rune.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.equipRune(1, 'rune-1', { targetSlot: 1 })).resolves.toMatchObject({
      playerId: 1,
    });

    expect(tx.rune.updateMany).toHaveBeenCalledWith({
      where: { playerId: 1, equippedSlot: 1 },
      data: { isEquipped: false, equippedSlot: null },
    });
    expect(tx.rune.updateMany).toHaveBeenCalledWith({
      where: { id: 'rune-1', playerId: 1 },
      data: { isEquipped: true, equippedSlot: 1 },
    });
  });

  it('allows removing slot 1 while slot 2 is still filled', async () => {
    const { repository, tx } = createPrismaMock();
    const currentPlayer = createPlayerRecord();
    currentPlayer.progress.unlockedRuneSlotCount = 2;
    currentPlayer.runes = [
      {
        id: 'rune-1',
        runeCode: 'rune-1',
        archetypeCode: 'ember',
        passiveAbilityCodes: '[]',
        activeAbilityCodes: '[]',
        name: 'Руна Пламени',
        rarity: 'USUAL',
        health: 1,
        attack: 2,
        defence: 0,
        magicDefence: 0,
        dexterity: 0,
        intelligence: 0,
        isEquipped: true,
        equippedSlot: 0,
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
        updatedAt: new Date('2026-04-12T00:00:00.000Z'),
      },
      {
        id: 'rune-2',
        runeCode: 'rune-2',
        archetypeCode: 'stone',
        passiveAbilityCodes: '[]',
        activeAbilityCodes: '[]',
        name: 'Руна Тверди',
        rarity: 'USUAL',
        health: 2,
        attack: 0,
        defence: 2,
        magicDefence: 0,
        dexterity: 0,
        intelligence: 0,
        isEquipped: true,
        equippedSlot: 1,
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
        updatedAt: new Date('2026-04-12T00:00:00.000Z'),
      },
    ];
    tx.player.findUnique.mockResolvedValue(currentPlayer);
    tx.rune.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.equipRune(1, null, { targetSlot: 0 })).resolves.toMatchObject({
      playerId: 1,
    });

    expect(tx.rune.updateMany).toHaveBeenCalledWith({
      where: { playerId: 1, equippedSlot: 0 },
      data: { isEquipped: false, equippedSlot: null },
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

  it('hydrates support rune loadout from the versioned battle snapshot', async () => {
    const { repository, tx } = createPrismaMock();

    tx.battleSession.findFirst.mockResolvedValue(createBattleRow({
      battleSnapshot: JSON.stringify({
        schemaVersion: 1,
        actionRevision: 0,
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
          runeLoadout: {
            runeId: 'rune-1',
            runeName: 'Руна Пламени',
            archetypeCode: 'ember',
            archetypeName: 'Штурм',
            schoolCode: 'ember',
            schoolMasteryRank: 1,
            passiveAbilityCodes: ['ember_heart'],
            activeAbility: {
              code: 'ember_pulse',
              name: 'Импульс углей',
              manaCost: 3,
              cooldownTurns: 2,
              currentCooldown: 1,
            },
          },
          supportRuneLoadout: {
            runeId: 'rune-2',
            runeName: 'Щит второго слота',
            archetypeCode: 'stone',
            archetypeName: 'Страж',
            schoolCode: 'stone',
            schoolMasteryRank: 0,
            passiveAbilityCodes: ['stone_guard'],
            activeAbility: null,
          },
          guardPoints: 0,
        },
        enemy: JSON.parse(createBattleRow().enemySnapshot),
        log: ['Враг найден.'],
        result: null,
        rewards: null,
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
    expect(battle?.player.supportRuneLoadout?.runeId).toBe('rune-2');
    expect(battle?.player.supportRuneLoadout?.passiveAbilityCodes).toEqual(['stone_guard']);
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
