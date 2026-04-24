import { describe, expect, it, vi } from 'vitest';

import type {
  BattleView,
  BiomeView,
  CreateBattleInput,
  InventoryField,
  MobTemplateView,
  PartyView,
  PlayerState,
} from '../../../../../shared/types/game';
import type { GameRandom } from '../../../../shared/domain/GameRandom';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../../../../world/application/ports/WorldCatalog';
import { ExploreParty, isExplorePartyEventResult } from './ExploreParty';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 5,
  experience: 0,
  gold: 0,
  radiance: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
  },
  locationLevel: 2,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 2,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 2,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 0,
    unusualShards: 0,
    rareShards: 0,
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
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createParty = (): PartyView => ({
  id: 'party-1',
  inviteCode: 'ABC123',
  leaderPlayerId: 1,
  status: 'OPEN',
  activeBattleId: null,
  maxMembers: 2,
  members: [
    {
      playerId: 1,
      vkId: 1001,
      name: 'Рунный мастер #1001',
      role: 'LEADER',
      joinedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      playerId: 2,
      vkId: 1002,
      name: 'Рунный мастер #1002',
      role: 'MEMBER',
      joinedAt: '2026-04-12T00:01:00.000Z',
    },
  ],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:01:00.000Z',
});

const createBiome = (overrides: Partial<BiomeView> = {}): BiomeView => ({
  id: 2,
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Лес для отрядных выходов.',
  minLevel: 1,
  maxLevel: 10,
  ...overrides,
});

const createMobTemplate = (overrides: Partial<MobTemplateView> = {}): MobTemplateView => ({
  code: 'forest-wolf',
  biomeCode: 'dark-forest',
  name: 'Лесной волк',
  kind: 'wolf',
  isElite: false,
  isBoss: false,
  baseStats: {
    health: 8,
    attack: 3,
    defence: 1,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 0,
  },
  scales: {
    health: 1,
    attack: 1,
    defence: 1,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  baseExperience: 6,
  baseGold: 2,
  runeDropChance: 0,
  lootTable: {},
  attackText: 'кусает',
  ...overrides,
});

const createWorldCatalog = (
  options: {
    readonly biomes?: readonly BiomeView[];
    readonly templates?: readonly MobTemplateView[];
  } = {},
): WorldCatalog => {
  const biomes = options.biomes ?? [createBiome()];
  const templates = options.templates ?? [createMobTemplate()];

  return {
    listBiomes: vi.fn().mockReturnValue(biomes),
    findBiomeForLocationLevel: vi.fn().mockReturnValue(biomes[0] ?? createBiome()),
    listMobTemplatesForBiome: vi.fn().mockReturnValue(templates),
  };
};

const createRandom = (overrides: Partial<GameRandom> = {}): GameRandom => ({
  nextInt: vi.fn().mockReturnValue(1),
  rollPercentage: vi.fn().mockReturnValue(true),
  pickOne: vi.fn(<T extends { readonly code?: string }>(items: readonly T[]) => (
    items.find((item) => item.code === 'abandoned-camp') ?? items[0]!
  )),
  ...overrides,
});

const createBattleView = (leader: PlayerState, battle: CreateBattleInput): BattleView => ({
  id: 'battle-1',
  playerId: leader.playerId,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...battle,
});

const addInventoryDelta = (player: PlayerState, field: InventoryField, amount: number): PlayerState => ({
  ...player,
  inventory: {
    ...player.inventory,
    [field]: (player.inventory[field] ?? 0) + amount,
  },
});

describe('ExploreParty', () => {
  it('can resolve a joint exploration event and apply its resource find to every member', async () => {
    const leader = createPlayer();
    const ally = createPlayer({
      userId: 2,
      vkId: 1002,
      playerId: 2,
    });
    const party = createParty();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(leader),
      getActiveParty: vi.fn().mockResolvedValue(party),
      findPlayerById: vi.fn(async (playerId: number) => (playerId === leader.playerId ? leader : ally)),
      listPlayerCraftedItems: vi.fn().mockResolvedValue([]),
      recordInventoryDeltaResult: vi.fn(async (
        playerId: number,
        delta: { readonly herb?: number },
        _options: unknown,
        buildResult: (player: PlayerState) => PlayerState,
      ) => {
        const player = playerId === leader.playerId ? leader : ally;
        return buildResult(addInventoryDelta(player, 'herb', delta.herb ?? 0));
      }),
      recordPlayerVitalsResult: vi.fn(),
      startPartyBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreParty(repository, createWorldCatalog(), createRandom());

    const result = await useCase.execute(leader.vkId);

    expect(isExplorePartyEventResult(result)).toBe(true);
    if (!isExplorePartyEventResult(result)) {
      throw new Error('Expected party exploration event result.');
    }

    expect(result.event.code).toBe('abandoned-camp');
    expect(result.player.inventory.herb).toBe(1);
    expect(result.members.map((member) => member.player.inventory.herb)).toEqual([1, 1]);
    expect(repository.startPartyBattle).not.toHaveBeenCalled();
    expect(repository.recordInventoryDeltaResult).toHaveBeenCalledTimes(2);
    expect(repository.recordInventoryDeltaResult).toHaveBeenCalledWith(
      leader.playerId,
      { herb: 1 },
      { commandKey: 'EXPLORE_PARTY' },
      expect.any(Function),
    );
    expect(repository.recordInventoryDeltaResult).toHaveBeenCalledWith(
      ally.playerId,
      { herb: 1 },
      { commandKey: 'EXPLORE_PARTY' },
      expect.any(Function),
    );
  });

  it('rotates normal party encounters without suppressing weary variants', async () => {
    const leader = createPlayer({
      mobsKilled: 1,
      victories: 2,
      victoryStreak: 1,
    });
    const ally = createPlayer({
      userId: 2,
      vkId: 1002,
      playerId: 2,
    });
    const party = createParty();
    const random = createRandom({
      rollPercentage: vi.fn((chancePercent: number) => chancePercent === 18),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(leader),
      getActiveParty: vi.fn().mockResolvedValue(party),
      findPlayerById: vi.fn(async (playerId: number) => (playerId === leader.playerId ? leader : ally)),
      listPlayerCraftedItems: vi.fn().mockResolvedValue([]),
      startPartyBattle: vi.fn(async (
        _leaderPlayerId: number,
        _partyId: string,
        battle: CreateBattleInput,
      ) => createBattleView(leader, battle)),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      templates: [
        createMobTemplate({ code: 'blue-slime', name: 'Синий слизень', kind: 'slime' }),
        createMobTemplate({ code: 'forest-wolf', name: 'Лесной волк', kind: 'wolf' }),
      ],
    });
    const useCase = new ExploreParty(repository, worldCatalog, random);

    const result = await useCase.execute(leader.vkId);

    expect(isExplorePartyEventResult(result)).toBe(false);
    if (isExplorePartyEventResult(result)) {
      throw new Error('Expected party battle result.');
    }

    expect(result.enemy.code).toBe('forest-wolf');
    expect(result.enemy.currentHealth).toBeLessThan(result.enemy.maxHealth);
    expect(result.encounter?.kind).toBe('WEARY_ENEMY');
    expect(random.rollPercentage).toHaveBeenCalledWith(18);
  });
});
