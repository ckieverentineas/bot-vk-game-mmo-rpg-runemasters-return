import { describe, expect, it, vi } from 'vitest';

import type { BattleView, BiomeView, MobTemplateView, PlayerState } from '../../../../../shared/types/game';
import type { GameTelemetry } from '../../../../shared/application/ports/GameTelemetry';
import type { GameRandom } from '../../../../shared/domain/GameRandom';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import type { PlayerCraftedItemView } from '../../../../workshop/application/workshop-persistence';
import type { WorldCatalog } from '../../../../world/application/ports/WorldCatalog';
import { resolveEncounterLocationLevel } from '../../../player/domain/player-stats';

import { buildExploreLocationIntentStateKey } from '../command-intent-state';
import { ExploreLocation } from './ExploreLocation';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 5,
  experience: 0,
  gold: 0,
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
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createBiome = (overrides: Partial<BiomeView> = {}): BiomeView => ({
  id: 1,
  code: 'initium',
  name: 'Порог Инициации',
  description: 'Стартовая зона.',
  minLevel: 0,
  maxLevel: 10,
  ...overrides,
});

const createMobTemplate = (overrides: Partial<MobTemplateView> = {}): MobTemplateView => ({
  code: 'training-wisp',
  biomeCode: 'initium',
  name: 'Учебный огонёк',
  kind: 'spirit',
  isElite: false,
  isBoss: false,
  baseStats: {
    health: 6,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 1,
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
  attackText: 'касается искрой',
  ...overrides,
});

const createWorldCatalog = (overrides: Partial<WorldCatalog> = {}): WorldCatalog => ({
  listBiomes: vi.fn().mockReturnValue([createBiome()]),
  findBiomeForLocationLevel: vi.fn().mockReturnValue(createBiome()),
  listMobTemplatesForBiome: vi.fn().mockReturnValue([createMobTemplate()]),
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'initium',
  enemyCode: 'training-wisp',
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
    runeLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'training-wisp',
    name: 'Учебный огонёк',
    kind: 'spirit',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 1,
    maxHealth: 6,
    currentHealth: 6,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 6,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'касается искрой',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['🗺️ Порог Инициации: на вас выходит обычный враг Учебный огонёк.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createPartyView = () => ({
  id: 'party-1',
  inviteCode: 'ABC123',
  leaderPlayerId: 1,
  status: 'OPEN' as const,
  activeBattleId: null,
  maxMembers: 2,
  members: [
    {
      playerId: 1,
      vkId: 1001,
      name: 'Рунный мастер #1001',
      role: 'LEADER' as const,
      joinedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      playerId: 2,
      vkId: 1002,
      name: 'Рунный мастер #1002',
      role: 'MEMBER' as const,
      joinedAt: '2026-04-12T00:01:00.000Z',
    },
  ],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:01:00.000Z',
});

const createCraftedItem = (
  overrides: Partial<PlayerCraftedItemView> = {},
): PlayerCraftedItemView => ({
  id: 'crafted-1',
  playerId: 1,
  itemCode: 'hunter_cleaver',
  itemClass: 'L',
  slot: 'weapon',
  status: 'ACTIVE',
  equipped: true,
  durability: 14,
  maxDurability: 14,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRandom = (): GameRandom => ({
  nextInt: vi.fn().mockReturnValue(1),
  rollPercentage: vi.fn().mockReturnValue(false),
  pickOne: vi.fn((items: readonly string[]) => items[0]),
});

const createTelemetry = (): GameTelemetry => ({
  onboardingStarted: vi.fn().mockResolvedValue(undefined),
  tutorialPathChosen: vi.fn().mockResolvedValue(undefined),
  loadoutChanged: vi.fn().mockResolvedValue(undefined),
  schoolNoviceEliteEncounterStarted: vi.fn().mockResolvedValue(undefined),
  firstSchoolPresented: vi.fn().mockResolvedValue(undefined),
  firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
  schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
  returnRecapShown: vi.fn().mockResolvedValue(undefined),
  postSessionNextGoalShown: vi.fn().mockResolvedValue(undefined),
  questBookOpened: vi.fn().mockResolvedValue(undefined),
  questRewardClaimed: vi.fn().mockResolvedValue(undefined),
  questRewardReplayed: vi.fn().mockResolvedValue(undefined),
  questRewardNotReady: vi.fn().mockResolvedValue(undefined),
});

describe('ExploreLocation', () => {
  it('logs continue_tutorial when the player starts the intro battle', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0, highestLocationLevel: 0, victories: 0, victoryStreak: 0 });
    const battle = createBattle({ locationLevel: 0, biomeCode: 'initium' });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockResolvedValue(battle),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog();
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, createRandom(), telemetry);

    await useCase.execute(player.vkId, 'intent-explore-tutorial-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(telemetry.tutorialPathChosen).toHaveBeenCalledWith(player.userId, {
      entrySurface: 'location',
      choice: 'continue_tutorial',
      tutorialState: 'ACTIVE',
    });
  });

  it('passes guarded createBattle options when payload intent metadata is present', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockResolvedValue(createBattle()),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog();
    const useCase = new ExploreLocation(repository, worldCatalog, createRandom());
    const stateKey = buildExploreLocationIntentStateKey(player);

    await useCase.execute(player.vkId, 'intent-explore-1', stateKey, 'payload');

    expect(repository.createBattle).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        status: 'ACTIVE',
        battleType: 'PVE',
        locationLevel: resolveEncounterLocationLevel(player),
        turnOwner: 'PLAYER',
        encounter: expect.objectContaining({
          status: 'OFFERED',
          canFlee: true,
          fleeChancePercent: 52,
        }),
      }),
      expect.objectContaining({
        commandKey: 'EXPLORE_LOCATION',
        intentId: 'intent-explore-1',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
    );
  });

  it('loads crafted workshop items into the next battle snapshot', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      listPlayerCraftedItems: vi.fn().mockResolvedValue([
        createCraftedItem({ id: 'weapon-1' }),
      ]),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-workshop',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());
    const stateKey = buildExploreLocationIntentStateKey(player);

    await useCase.execute(player.vkId, 'intent-explore-workshop-1', stateKey, 'payload');

    expect(repository.listPlayerCraftedItems).toHaveBeenCalledWith(player.playerId);
    expect(repository.createBattle).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        player: expect.objectContaining({
          attack: 6,
          workshopLoadout: [
            expect.objectContaining({
              id: 'weapon-1',
              itemCode: 'hunter_cleaver',
            }),
          ],
        }),
      }),
      expect.anything(),
    );
  });

  it('blocks solo exploration while the player remains in an active party', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      getActiveParty: vi.fn().mockResolvedValue(createPartyView()),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());
    const stateKey = buildExploreLocationIntentStateKey(player);

    await expect(useCase.execute(player.vkId, 'intent-explore-party-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'party_explore_required',
    });

    expect(repository.createBattle).not.toHaveBeenCalled();
  });

  it('offers an encounter decision before an adventure battle starts', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-offered-encounter',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
      saveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());

    const battle = await useCase.execute(player.vkId, 'intent-explore-offer-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(battle.turnOwner).toBe('PLAYER');
    expect(battle.encounter).toEqual({
      status: 'OFFERED',
      initialTurnOwner: 'PLAYER',
      canFlee: true,
      fleeChancePercent: 52,
    });
    expect(repository.saveBattle).not.toHaveBeenCalled();
  });

  it('passes encounter variety into the offered battle decision', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 4, level: 4, victories: 4 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-offered-ambush',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
      saveBattle: vi.fn(),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue(createBiome({
        code: 'dark-forest',
        name: 'Тёмный лес',
        minLevel: 1,
        maxLevel: 15,
      })),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([createMobTemplate({
        biomeCode: 'dark-forest',
        name: 'Лесной волк',
        kind: 'beast',
      })]),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const battle = await useCase.execute(player.vkId, 'intent-explore-ambush-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(battle.turnOwner).toBe('PLAYER');
    expect(battle.encounter).toMatchObject({
      status: 'OFFERED',
      kind: 'AMBUSH',
      initialTurnOwner: 'ENEMY',
      title: 'Засада',
    });
    expect(repository.saveBattle).not.toHaveBeenCalled();
  });

  it('can add a path episode before the generated battle', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-with-event',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({
        ...createBiome(),
        code: 'dark-forest',
        name: 'Тёмный лес',
        minLevel: 1,
        maxLevel: 15,
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const battle = await useCase.execute(player.vkId, 'intent-explore-event-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(battle.log[0]).toContain('на вас выходит');
    expect(battle.log.some((entry) => entry.includes('Путевой эпизод'))).toBe(true);
  });

  it('can create a roaming encounter from the nearest lower biome', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 18, level: 18 });
    const darkForest = createBiome({
      id: 2,
      code: 'dark-forest',
      name: 'Тёмный лес',
      minLevel: 1,
      maxLevel: 15,
    });
    const forgottenCaves = createBiome({
      id: 3,
      code: 'forgotten-caves',
      name: 'Забытые пещеры',
      minLevel: 16,
      maxLevel: 35,
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-roaming',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      listBiomes: vi.fn().mockReturnValue([darkForest, forgottenCaves]),
      findBiomeForLocationLevel: vi.fn().mockReturnValue(forgottenCaves),
      listMobTemplatesForBiome: vi.fn((biomeCode: string) => {
        if (biomeCode === 'dark-forest') {
          return [createMobTemplate({
            code: 'forest-wolf',
            biomeCode: 'dark-forest',
            name: 'Лесной волк',
          })];
        }

        return [createMobTemplate({
          code: 'cave-goblin',
          biomeCode: 'forgotten-caves',
          name: 'Пещерный гоблин',
        })];
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const battle = await useCase.execute(player.vkId, 'intent-explore-roaming-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(battle.enemyCode).toBe('forest-wolf');
    expect(battle.biomeCode).toBe('forgotten-caves');
    expect(battle.log).toContain('🧭 Бродячий след: Лесной волк пришёл из места «Тёмный лес».');
  });

  it('can start a battle against an active survived enemy threat in the current biome', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 6, level: 6 });
    const darkForest = createBiome({
      id: 2,
      code: 'dark-forest',
      name: 'Dark Forest',
      minLevel: 1,
      maxLevel: 15,
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      listActiveEnemyThreatsForBiome: vi.fn().mockResolvedValue([{
        enemyCode: 'blue-slime',
        enemyName: 'Blue Slime',
        originBiomeCode: 'dark-forest',
        originBiomeName: 'Dark Forest',
        currentBiomeCode: 'dark-forest',
        survivalCount: 2,
        experience: 18,
        levelBonus: 3,
        lastSeenLocationLevel: 5,
      }]),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-active-threat',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      listBiomes: vi.fn().mockReturnValue([darkForest]),
      findBiomeForLocationLevel: vi.fn().mockReturnValue(darkForest),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        createMobTemplate({
          code: 'blue-slime',
          biomeCode: 'dark-forest',
          name: 'Blue Slime',
          scales: {
            health: 1.4,
            attack: 1.2,
            defence: 1,
            magicDefence: 1,
            dexterity: 1,
            intelligence: 1,
          },
        }),
      ]),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const battle = await useCase.execute(player.vkId, 'intent-explore-threat-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(repository.listActiveEnemyThreatsForBiome).toHaveBeenCalledWith('dark-forest');
    expect(battle.enemyCode).toBe('blue-slime');
    expect(battle.enemy.name).toBe('Упрямый Blue Slime');
    expect(battle.enemy.threat?.rank).toBe('NAMED');
    expect(battle.enemy.maxHealth).toBeGreaterThan(6);
    expect(battle.log).toContain(
      '⚠️ Именная угроза: Упрямый Blue Slime пережил 2 встречи и вернулся сильнее.',
    );
  });

  it('does not pull a higher-biome roaming mob during the first-hour guardrail window', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 8, level: 8 });
    const darkForest = createBiome({
      id: 2,
      code: 'dark-forest',
      name: 'Тёмный лес',
      minLevel: 1,
      maxLevel: 15,
    });
    const forgottenCaves = createBiome({
      id: 3,
      code: 'forgotten-caves',
      name: 'Забытые пещеры',
      minLevel: 16,
      maxLevel: 35,
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-no-early-higher-roaming',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValue(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      listBiomes: vi.fn().mockReturnValue([darkForest, forgottenCaves]),
      findBiomeForLocationLevel: vi.fn().mockReturnValue(darkForest),
      listMobTemplatesForBiome: vi.fn((biomeCode: string) => {
        if (biomeCode === 'forgotten-caves') {
          return [createMobTemplate({
            code: 'cave-goblin',
            biomeCode: 'forgotten-caves',
            name: 'Пещерный гоблин',
          })];
        }

        return [createMobTemplate({
          code: 'forest-wolf',
          biomeCode: 'dark-forest',
          name: 'Лесной волк',
        })];
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const battle = await useCase.execute(player.vkId, 'intent-explore-no-higher-roaming-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(battle.enemyCode).toBe('forest-wolf');
    expect(battle.log.some((entry) => entry.includes('Забытые пещеры'))).toBe(false);
  });

  it('does not pull a higher-biome roaming mob during post-defeat recovery', async () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 15,
      level: 15,
      defeats: 1,
      defeatStreak: 1,
    });
    const darkForest = createBiome({
      id: 2,
      code: 'dark-forest',
      name: 'Тёмный лес',
      minLevel: 1,
      maxLevel: 15,
    });
    const forgottenCaves = createBiome({
      id: 3,
      code: 'forgotten-caves',
      name: 'Забытые пещеры',
      minLevel: 16,
      maxLevel: 35,
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-defeat-no-higher-roaming',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValue(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      listBiomes: vi.fn().mockReturnValue([darkForest, forgottenCaves]),
      findBiomeForLocationLevel: vi.fn().mockReturnValue(darkForest),
      listMobTemplatesForBiome: vi.fn((biomeCode: string) => {
        if (biomeCode === 'forgotten-caves') {
          return [createMobTemplate({
            code: 'cave-goblin',
            biomeCode: 'forgotten-caves',
            name: 'Пещерный гоблин',
          })];
        }

        return [createMobTemplate({
          code: 'forest-wolf',
          biomeCode: 'dark-forest',
          name: 'Лесной волк',
        })];
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const battle = await useCase.execute(player.vkId, 'intent-explore-defeat-no-higher-roaming-1', buildExploreLocationIntentStateKey(player), 'payload') as BattleView;

    expect(battle.enemyCode).toBe('forest-wolf');
    expect(battle.log.some((entry) => entry.includes('Забытые пещеры'))).toBe(false);
  });

  it('can resolve a standalone exploration event without creating a battle', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const stateKey = buildExploreLocationIntentStateKey(player);
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      recordCommandIntentResult: vi.fn(async (
        _playerId: number,
        _commandKey: string,
        _intentId: string | undefined,
        _intentStateKey: string | undefined,
        _currentStateKey: string | undefined,
        result: unknown,
      ) => result),
      recordPlayerVitalsResult: vi.fn(async (
        _playerId: number,
        _vitals: unknown,
        _options: unknown,
        buildResult: (player: PlayerState) => unknown,
      ) => buildResult(createPlayer({
        ...player,
        currentHealth: 8,
        currentMana: 4,
      }))),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({
        ...createBiome(),
        code: 'dark-forest',
        name: 'Тёмный лес',
        minLevel: 1,
        maxLevel: 15,
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const result = await useCase.execute(player.vkId, 'intent-explore-scene-1', stateKey, 'payload');

    expect('event' in result && result.event.title).toContain('Тихая передышка');
    expect(repository.createBattle).not.toHaveBeenCalled();
    expect(repository.recordCommandIntentResult).not.toHaveBeenCalled();
    expect(repository.recordPlayerVitalsResult).toHaveBeenCalledWith(
      player.playerId,
      { currentHealth: 8, currentMana: 4 },
      expect.objectContaining({
        commandKey: 'EXPLORE_LOCATION',
        intentId: 'intent-explore-scene-1',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
      expect.any(Function),
    );
  });

  it('persists anti-stall recovery rest when the player explores at low health', async () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 4,
      currentHealth: 2,
      currentMana: 0,
    });
    const recoveredPlayer = createPlayer({
      ...player,
      currentHealth: 6,
      currentMana: 3,
    });
    const stateKey = buildExploreLocationIntentStateKey(player);
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      recordPlayerVitalsResult: vi.fn(async (
        _playerId: number,
        _vitals: unknown,
        _options: unknown,
        buildResult: (player: PlayerState) => unknown,
      ) => buildResult(recoveredPlayer)),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({
        ...createBiome(),
        code: 'dark-forest',
        name: 'Тёмный лес',
        minLevel: 1,
        maxLevel: 15,
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const result = await useCase.execute(player.vkId, 'intent-explore-low-hp-rest-1', stateKey, 'payload');

    if (!('event' in result)) {
      throw new Error('Expected anti-stall exploration event result.');
    }

    expect(result.event.code).toBe('quiet-rest');
    expect(result.player.currentHealth).toBe(6);
    expect(result.player.currentMana).toBe(3);
    expect(repository.createBattle).not.toHaveBeenCalled();
    expect(repository.recordPlayerVitalsResult).toHaveBeenCalledWith(
      player.playerId,
      { currentHealth: 6, currentMana: 3 },
      expect.objectContaining({
        commandKey: 'EXPLORE_LOCATION',
        intentId: 'intent-explore-low-hp-rest-1',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
      expect.any(Function),
    );
    expect(random.rollPercentage).not.toHaveBeenCalled();
  });

  it('persists a standalone resource event through an exact-once inventory result', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const rewardedPlayer = createPlayer({
      ...player,
      inventory: {
        ...player.inventory,
        herb: player.inventory.herb + 1,
      },
    });
    const stateKey = buildExploreLocationIntentStateKey(player);
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      recordCommandIntentResult: vi.fn(),
      recordInventoryDeltaResult: vi.fn(async (
        _playerId: number,
        _delta: unknown,
        _options: unknown,
        buildResult: (player: PlayerState) => unknown,
      ) => buildResult(rewardedPlayer)),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn(<T extends { code?: string }>(items: readonly T[]) => (
        items.find((item) => item.code === 'abandoned-camp') ?? items[0]!
      )),
    };
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({
        ...createBiome(),
        code: 'dark-forest',
        name: 'Тёмный лес',
        minLevel: 1,
        maxLevel: 15,
      }),
    });
    const useCase = new ExploreLocation(repository, worldCatalog, random);

    const result = await useCase.execute(player.vkId, 'intent-explore-resource-1', stateKey, 'payload');

    if (!('event' in result)) {
      throw new Error('Expected standalone exploration event result.');
    }

    expect(result.event.code).toBe('abandoned-camp');
    expect(result.player.inventory.herb).toBe(player.inventory.herb + 1);
    expect(repository.createBattle).not.toHaveBeenCalled();
    expect(repository.recordCommandIntentResult).not.toHaveBeenCalled();
    expect(repository.recordInventoryDeltaResult).toHaveBeenCalledWith(
      player.playerId,
      { herb: 1 },
      expect.objectContaining({
        commandKey: 'EXPLORE_LOCATION',
        intentId: 'intent-explore-resource-1',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
      expect.any(Function),
    );
  });

  it('returns the canonical replay result before encounter generation for legacy text', async () => {
    const replayedBattle = createBattle({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewards: { experience: 6, gold: 2, shards: { USUAL: 1 }, droppedRune: null },
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ activeBattleId: 'battle-2' })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayedBattle }),
      getActiveBattle: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:91:исследовать', undefined, 'legacy_text')).resolves.toEqual({ battle: replayedBattle, replayed: true });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
    expect(repository.createBattle).not.toHaveBeenCalled();
  });

  it('uses the current exploration state key for a fresh legacy-text explore command', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockResolvedValue(createBattle()),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog();
    const useCase = new ExploreLocation(repository, worldCatalog, createRandom());
    const stateKey = buildExploreLocationIntentStateKey(player);

    await useCase.execute(1001, 'legacy-text:2000000001:1001:91:исследовать', undefined, 'legacy_text');

    expect(repository.createBattle).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        status: 'ACTIVE',
        battleType: 'PVE',
      }),
      expect.objectContaining({
        commandKey: 'EXPLORE_LOCATION',
        intentId: 'legacy-text:2000000001:1001:91:исследовать',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
    );
  });

  it('adds a school-specific encounter hint when the current school has a matching early elite hook', async () => {
    const player = createPlayer({
      runes: [
        {
          id: 'rune-ember-1',
          runeCode: 'rune-ember-1',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Руна Пламени',
          rarity: 'USUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-school-hook',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'ash-seer',
          biomeCode: 'dark-forest',
          name: 'Пепельная ведунья',
          kind: 'mage',
          isElite: true,
          baseExperience: 24,
          baseGold: 9,
          runeDropChance: 28,
          attackText: 'выпускает пепельный прорыв',
        },
      ]),
    });
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, random, telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-school-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.enemy.code).toBe('ash-seer');
    expect(battle.log[0]).toContain('первое испытание школы Пламени');
    expect(telemetry.schoolNoviceEliteEncounterStarted).toHaveBeenCalledWith(player.userId, {
      battleId: 'battle-school-hook',
      schoolCode: 'ember',
      enemyCode: 'ash-seer',
      biomeCode: 'dark-forest',
      locationLevel: resolveEncounterLocationLevel(player),
      targetRewardRarity: 'UNUSUAL',
      nextGoalType: 'hunt_school_elite',
    });
  });

  it('adds an echo-specific novice elite hook once the player fights as Прорицание', async () => {
    const player = createPlayer({
      victories: 1,
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-echo-1',
          runeCode: 'rune-echo-1',
          archetypeCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbilityCodes: [],
          name: 'Руна Прорицания',
          rarity: 'USUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 1,
          defence: 0,
          magicDefence: 1,
          dexterity: 0,
          intelligence: 2,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-echo-hook',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'blind-augur',
          biomeCode: 'dark-forest',
          name: 'Слепой авгур',
          kind: 'spirit',
          isElite: true,
          baseExperience: 24,
          baseGold: 9,
          runeDropChance: 28,
          attackText: 'срывает покров будущего ударом духа',
        },
      ]),
    });
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, random, telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-echo-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.enemy.code).toBe('blind-augur');
    expect(battle.log[0]).toContain('первое испытание школы Прорицания');
    expect(telemetry.schoolNoviceEliteEncounterStarted).toHaveBeenCalledWith(player.userId, expect.objectContaining({
      battleId: 'battle-echo-hook',
      schoolCode: 'echo',
      enemyCode: 'blind-augur',
    }));
  });

  it('adds a gale-specific novice elite hook once the player fights as Буря', async () => {
    const player = createPlayer({
      victories: 1,
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-gale-1',
          runeCode: 'rune-gale-1',
          archetypeCode: 'gale',
          passiveAbilityCodes: [],
          activeAbilityCodes: ['gale_step'],
          name: 'Руна Бури',
          rarity: 'USUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 2,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-gale-hook',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'storm-lynx',
          biomeCode: 'dark-forest',
          name: 'Шквальная рысь',
          kind: 'wolf',
          isElite: true,
          baseExperience: 24,
          baseGold: 9,
          runeDropChance: 28,
          attackText: 'срывается шквальным выпадом',
        },
      ]),
    });
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, random, telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-gale-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.enemy.code).toBe('storm-lynx');
    expect(battle.log[0]).toContain('первое испытание школы Бури');
    expect(telemetry.schoolNoviceEliteEncounterStarted).toHaveBeenCalledWith(player.userId, expect.objectContaining({
      battleId: 'battle-gale-hook',
      schoolCode: 'gale',
      enemyCode: 'storm-lynx',
    }));
  });

  it('logs the next battle as a school follow-up once the first school sign is already equipped', async () => {
    const player = createPlayer({
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-ember-1',
          runeCode: 'rune-ember-1',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-follow-up-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'blue-slime',
          biomeCode: 'dark-forest',
        },
      ]),
    });
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, createRandom(), telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-follow-up-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.id).toBe('battle-follow-up-1');
    expect(telemetry.schoolNoviceEliteEncounterStarted).not.toHaveBeenCalled();
    expect(telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(player.userId, {
      schoolCode: 'ember',
      currentGoalType: 'challenge_school_miniboss',
      actionType: 'start_next_battle',
      signEquipped: true,
      usedSchoolSign: true,
      battleId: 'battle-follow-up-1',
      enemyCode: 'blue-slime',
    });
  });

  it('prefers the school miniboss after the first sign is already equipped and rare school rune is still missing', async () => {
    const player = createPlayer({
      victories: 4,
      locationLevel: 6,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-ember-1',
          runeCode: 'rune-ember-1',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-miniboss-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'blue-slime',
          biomeCode: 'dark-forest',
        },
        {
          ...createMobTemplate(),
          code: 'ash-matron',
          biomeCode: 'dark-forest',
          name: 'Пепельная матрона',
          kind: 'mage',
          isElite: true,
          isBoss: true,
          baseExperience: 96,
          baseGold: 34,
          runeDropChance: 76,
          attackText: 'заливает поле пепельным пламенем',
        },
      ]),
    });
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, random, telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-miniboss-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.enemy.code).toBe('ash-matron');
    expect(battle.log[0]).toContain('большой бой Пламени');
    expect(telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(player.userId, expect.objectContaining({
      actionType: 'start_next_battle',
      battleId: 'battle-miniboss-1',
      enemyCode: 'ash-matron',
    }));
  });

  it('prefers the gale school miniboss once the first gale sign is already equipped and rare rune is still missing', async () => {
    const player = createPlayer({
      victories: 4,
      locationLevel: 6,
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-gale-1',
          runeCode: 'rune-gale-1',
          archetypeCode: 'gale',
          passiveAbilityCodes: [],
          activeAbilityCodes: ['gale_step'],
          name: 'Необычная руна Бури',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 2,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-gale-miniboss-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'blue-slime',
          biomeCode: 'dark-forest',
        },
        {
          ...createMobTemplate(),
          code: 'squall-lord',
          biomeCode: 'dark-forest',
          name: 'Владыка шквала',
          kind: 'spirit',
          isElite: true,
          isBoss: true,
          baseExperience: 98,
          baseGold: 34,
          runeDropChance: 76,
          attackText: 'срывает строй шквальным ударом',
        },
      ]),
    });
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, random, telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-gale-miniboss-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.enemy.code).toBe('squall-lord');
    expect(battle.log[0]).toContain('большой бой Бури');
    expect(telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(player.userId, expect.objectContaining({
      actionType: 'start_next_battle',
      battleId: 'battle-gale-miniboss-1',
      enemyCode: 'squall-lord',
      currentGoalType: 'challenge_school_miniboss',
    }));
  });

  it('prefers the echo school miniboss once the first echo sign is already equipped and rare rune is still missing', async () => {
    const player = createPlayer({
      victories: 4,
      locationLevel: 6,
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-echo-1',
          runeCode: 'rune-echo-1',
          archetypeCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbilityCodes: [],
          name: 'Необычная руна Прорицания',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
          health: 1,
          attack: 1,
          defence: 0,
          magicDefence: 1,
          dexterity: 0,
          intelligence: 2,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-echo-miniboss-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const worldCatalog = createWorldCatalog({
      findBiomeForLocationLevel: vi.fn().mockReturnValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockReturnValue([
        {
          ...createMobTemplate(),
          code: 'blue-slime',
          biomeCode: 'dark-forest',
        },
        {
          ...createMobTemplate(),
          code: 'omen-warden',
          biomeCode: 'dark-forest',
          name: 'Хранитель предзнамений',
          kind: 'mage',
          isElite: true,
          isBoss: true,
          baseExperience: 98,
          baseGold: 34,
          runeDropChance: 76,
          attackText: 'разрывает ход предсказанным ударом',
        },
      ]),
    });
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, worldCatalog, random, telemetry);

    const battle = await useCase.execute(player.vkId, 'intent-explore-echo-miniboss-1', buildExploreLocationIntentStateKey(player), 'payload');

    expect(battle.enemy.code).toBe('omen-warden');
    expect(battle.log[0]).toContain('большой бой Прорицания');
    expect(telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(player.userId, expect.objectContaining({
      actionType: 'start_next_battle',
      battleId: 'battle-echo-miniboss-1',
      enemyCode: 'omen-warden',
      currentGoalType: 'challenge_school_miniboss',
    }));
  });

  it('resolves a stuck enemy-first battle before stale payload rejection when the same explore already created it', async () => {
    const activeBattle = createBattle({ turnOwner: 'ENEMY' });
    const recoveredBattle = createBattle({
      turnOwner: 'PLAYER',
      log: [...activeBattle.log, '👾 [Учебный огонёк] касается искрой по цели [Рунный мастер #1001] и наносит 1 урона.'],
      player: {
        ...activeBattle.player,
        currentHealth: 7,
      },
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ activeBattleId: activeBattle.id })),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      saveBattle: vi.fn().mockResolvedValue(recoveredBattle),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());

    await expect(useCase.execute(1001, 'intent-explore-retry', 'stale-state', 'payload')).resolves.toEqual(recoveredBattle);

    expect(repository.saveBattle).toHaveBeenCalled();
    expect(repository.createBattle).not.toHaveBeenCalled();
  });

  it('replays the canonical recovered battle on a duplicate explore intent after enemy-turn recovery', async () => {
    const activeBattle = createBattle({ turnOwner: 'ENEMY' });
    const recoveredBattle = createBattle({
      turnOwner: 'PLAYER',
      player: {
        ...activeBattle.player,
        currentHealth: 7,
      },
      log: [...activeBattle.log, '👾 [Учебный огонёк] касается искрой по цели [Рунный мастер #1001] и наносит 1 урона.'],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ activeBattleId: activeBattle.id })),
      getCommandIntentResult: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ status: 'APPLIED', result: recoveredBattle }),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      saveBattle: vi.fn().mockResolvedValue(recoveredBattle),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());

    await expect(useCase.execute(1001, 'intent-explore-replay', 'stale-state', 'payload')).resolves.toEqual(recoveredBattle);
    await expect(useCase.execute(1001, 'intent-explore-replay', 'stale-state', 'payload')).resolves.toEqual({ battle: recoveredBattle, replayed: true });

    expect(repository.saveBattle).toHaveBeenCalledTimes(1);
    expect(repository.getActiveBattle).toHaveBeenCalledTimes(1);
  });

  it('rejects stale payload explore commands before starting a new encounter', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());

    await expect(useCase.execute(player.vkId, 'intent-explore-2', 'stale-state', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.getActiveBattle).toHaveBeenCalledWith(player.playerId);
    expect(repository.createBattle).not.toHaveBeenCalled();
  });

  it('returns retry-pending for duplicate legacy text explore commands still being processed', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'PENDING' }),
      getActiveBattle: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createWorldCatalog(), createRandom());

    await expect(useCase.execute(player.vkId, 'legacy-text:2000000001:1001:91:исследовать', undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'command_retry_pending',
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
    expect(repository.createBattle).not.toHaveBeenCalled();
  });
});
