import { describe, expect, it, vi } from 'vitest';

import type { BattleView, BiomeView, MobTemplateView, PlayerState } from '../../../../../shared/types/game';
import type { GameTelemetry } from '../../../../shared/application/ports/GameTelemetry';
import type { GameRandom } from '../../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
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

const createBiome = (): BiomeView => ({
  id: 1,
  code: 'initium',
  name: 'Порог Инициации',
  description: 'Стартовая зона.',
  minLevel: 0,
  maxLevel: 10,
});

const createMobTemplate = (): MobTemplateView => ({
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

const createRandom = (): GameRandom => ({
  nextInt: vi.fn().mockReturnValue(1),
  rollPercentage: vi.fn().mockReturnValue(false),
  pickOne: vi.fn((items: readonly string[]) => items[0]),
});

const createTelemetry = (): GameTelemetry => ({
  onboardingStarted: vi.fn().mockResolvedValue(undefined),
  loadoutChanged: vi.fn().mockResolvedValue(undefined),
  schoolNoviceEliteEncounterStarted: vi.fn().mockResolvedValue(undefined),
  schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
  returnRecapShown: vi.fn().mockResolvedValue(undefined),
  postSessionNextGoalShown: vi.fn().mockResolvedValue(undefined),
});

describe('ExploreLocation', () => {
  it('passes guarded createBattle options when payload intent metadata is present', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      findBiomeForLocationLevel: vi.fn().mockResolvedValue(createBiome()),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([createMobTemplate()]),
      createBattle: vi.fn().mockResolvedValue(createBattle()),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());
    const stateKey = buildExploreLocationIntentStateKey(player);

    await useCase.execute(player.vkId, 'intent-explore-1', stateKey, 'payload');

    expect(repository.createBattle).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        status: 'ACTIVE',
        battleType: 'PVE',
        locationLevel: resolveEncounterLocationLevel(player),
      }),
      expect.objectContaining({
        commandKey: 'EXPLORE_LOCATION',
        intentId: 'intent-explore-1',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
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
      findBiomeForLocationLevel: vi.fn(),
      listMobTemplatesForBiome: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:91:исследовать', undefined, 'legacy_text')).resolves.toEqual(replayedBattle);

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
    expect(repository.createBattle).not.toHaveBeenCalled();
  });

  it('uses the current exploration state key for a fresh legacy-text explore command', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(null),
      findBiomeForLocationLevel: vi.fn().mockResolvedValue(createBiome()),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([createMobTemplate()]),
      createBattle: vi.fn().mockResolvedValue(createBattle()),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());
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
      findBiomeForLocationLevel: vi.fn().mockResolvedValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([
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
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-school-hook',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, random, telemetry);

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
      findBiomeForLocationLevel: vi.fn().mockResolvedValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([
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
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-echo-hook',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, random, telemetry);

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
      findBiomeForLocationLevel: vi.fn().mockResolvedValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([
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
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-gale-hook',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, random, telemetry);

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
      findBiomeForLocationLevel: vi.fn().mockResolvedValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([
        {
          ...createMobTemplate(),
          code: 'blue-slime',
          biomeCode: 'dark-forest',
        },
      ]),
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-follow-up-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, createRandom(), telemetry);

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
      findBiomeForLocationLevel: vi.fn().mockResolvedValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([
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
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-miniboss-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, random, telemetry);

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
      findBiomeForLocationLevel: vi.fn().mockResolvedValue({ ...createBiome(), code: 'dark-forest', name: 'Тёмный лес' }),
      listMobTemplatesForBiome: vi.fn().mockResolvedValue([
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
      createBattle: vi.fn().mockImplementation(async (_playerId: number, battle: Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>) => ({
        id: 'battle-gale-miniboss-1',
        playerId: player.playerId,
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        ...battle,
      })),
    } as unknown as GameRepository;
    const random: GameRandom = {
      nextInt: vi.fn().mockReturnValue(1),
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn((items: readonly MobTemplateView[]) => items[0]),
    };
    const telemetry = createTelemetry();
    const useCase = new ExploreLocation(repository, random, telemetry);

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

  it('resolves a stuck enemy-first battle before stale payload rejection when the same explore already created it', async () => {
    const activeBattle = createBattle({ turnOwner: 'ENEMY' });
    const recoveredBattle = createBattle({
      turnOwner: 'PLAYER',
      log: [...activeBattle.log, '👾 Учебный огонёк касается искрой и наносит 1 урона.'],
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
      findBiomeForLocationLevel: vi.fn(),
      listMobTemplatesForBiome: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());

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
      log: [...activeBattle.log, '👾 Учебный огонёк касается искрой и наносит 1 урона.'],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ activeBattleId: activeBattle.id })),
      getCommandIntentResult: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ status: 'APPLIED', result: recoveredBattle }),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      saveBattle: vi.fn().mockResolvedValue(recoveredBattle),
      findBiomeForLocationLevel: vi.fn(),
      listMobTemplatesForBiome: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());

    await expect(useCase.execute(1001, 'intent-explore-replay', 'stale-state', 'payload')).resolves.toEqual(recoveredBattle);
    await expect(useCase.execute(1001, 'intent-explore-replay', 'stale-state', 'payload')).resolves.toEqual(recoveredBattle);

    expect(repository.saveBattle).toHaveBeenCalledTimes(1);
    expect(repository.getActiveBattle).toHaveBeenCalledTimes(1);
  });

  it('rejects stale payload explore commands before starting a new encounter', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn(),
      findBiomeForLocationLevel: vi.fn(),
      listMobTemplatesForBiome: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());

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
      findBiomeForLocationLevel: vi.fn(),
      listMobTemplatesForBiome: vi.fn(),
      createBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new ExploreLocation(repository, createRandom());

    await expect(useCase.execute(player.vkId, 'legacy-text:2000000001:1001:91:исследовать', undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'command_retry_pending',
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
    expect(repository.createBattle).not.toHaveBeenCalled();
  });
});
