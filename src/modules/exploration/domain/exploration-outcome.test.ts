import { describe, expect, it, vi } from 'vitest';

import type { BiomeView, MobTemplateView, PlayerState } from '../../../shared/types/game';
import type { WorkshopEquippedItemView } from '../../workshop/domain/workshop-catalog';
import { resolveExplorationOutcome, resolveExplorationSchoolCode } from './exploration-outcome';

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
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Первые настоящие руины.',
  minLevel: 1,
  maxLevel: 15,
});

const createRoamingBiome = (overrides: Partial<BiomeView>): BiomeView => ({
  ...createBiome(),
  ...overrides,
});

const createMobTemplate = (overrides: Partial<MobTemplateView> = {}): MobTemplateView => ({
  code: 'blue-slime',
  biomeCode: 'dark-forest',
  name: 'Синий слизень',
  kind: 'slime',
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
  attackText: 'бьёт вязким телом',
  ...overrides,
});

const createEmberRune = (rarity: 'USUAL' | 'UNUSUAL' | 'RARE') => ({
  id: `rune-ember-${rarity}`,
  runeCode: `rune-ember-${rarity}`,
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: `${rarity} руна Пламени`,
  rarity,
  isEquipped: true,
  equippedSlot: 0,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  createdAt: '2026-04-12T00:00:00.000Z',
});

const createWorkshopItem = (
  overrides: Partial<WorkshopEquippedItemView> = {},
): WorkshopEquippedItemView => ({
  id: 'item-1',
  code: 'hunter_cleaver',
  itemClass: 'L',
  slot: 'weapon',
  status: 'ACTIVE',
  equipped: true,
  durability: 14,
  maxDurability: 14,
  ...overrides,
});

describe('resolveExplorationOutcome', () => {
  it('can resolve a standalone scene before encounter generation', () => {
    const random = {
      rollPercentage: vi.fn().mockReturnValue(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 1,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('event');
    expect(outcome.kind === 'event' ? outcome.event.code : null).toBe('quiet-rest');
  });

  it('routes a low-health player into a recovery rest before rolling a battle', () => {
    const random = {
      rollPercentage: vi.fn().mockReturnValue(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer({ currentHealth: 2, currentMana: 1 }),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 4,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('event');
    expect(outcome.kind === 'event' ? outcome.event.code : null).toBe('quiet-rest');
    expect(random.rollPercentage).not.toHaveBeenCalled();
  });

  it('builds a battle plan with path episode and opening framing', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 1,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    if (outcome.kind !== 'battle') {
      return;
    }

    expect(outcome.enemy.code).toBe('blue-slime');
    expect(outcome.turnOwner).toBe('PLAYER');
    expect(outcome.openingLog[0]).toContain('Тёмный лес');
    expect(outcome.openingLog[1]).toContain('Путевой эпизод');
  });

  it('uses equipped workshop bonuses for the next battle plan', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 1,
      currentSchoolCode: null,
      workshopItems: [
        createWorkshopItem({ id: 'weapon-1' }),
        createWorkshopItem({
          id: 'armor-1',
          code: 'tracker_jacket',
          slot: 'armor',
          durability: 18,
          maxDurability: 18,
        }),
        createWorkshopItem({
          id: 'tool-1',
          code: 'skinning_kit',
          itemClass: 'UL',
          slot: 'tool',
          equipped: false,
          durability: 12,
          maxDurability: 12,
        }),
      ],
    }, random);

    expect(outcome.kind).toBe('battle');
    if (outcome.kind !== 'battle') {
      return;
    }

    expect(outcome.playerStats).toMatchObject({
      health: 11,
      attack: 6,
      defence: 4,
      dexterity: 2,
    });
  });

  it('can turn a normal route into an ambush encounter variant', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer({ victories: 4 }),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 4,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.kind : null).toBe('AMBUSH');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.initialTurnOwner : null).toBe('ENEMY');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.fleeChanceModifierPercent : null).toBe(-10);
  });

  it('can make a lower-pressure battle start against a weary enemy', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 3,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    if (outcome.kind !== 'battle') {
      return;
    }

    expect(outcome.encounterVariant?.kind).toBe('WEARY_ENEMY');
    expect(outcome.enemy.currentHealth).toBeLessThan(outcome.enemy.maxHealth);
    expect(outcome.enemy.currentHealth).toBe(Math.ceil(outcome.enemy.maxHealth * 0.75));
  });

  it('uses a safe trail variant while the player is recovering from defeat', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer({ defeatStreak: 1 }),
      biome: createBiome(),
      templates: [createMobTemplate()],
      locationLevel: 4,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.kind : null).toBe('TRAIL');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.initialTurnOwner : null).toBe('PLAYER');
  });

  it('uses the lightest normal encounter for repeated defeats after vitals recover', () => {
    const random = {
      rollPercentage: vi.fn().mockReturnValue(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer({ defeatStreak: 2, currentHealth: 8, currentMana: 4 }),
      biome: createBiome(),
      templates: [
        createMobTemplate({
          code: 'heavy-brute',
          baseStats: {
            health: 20,
            attack: 8,
            defence: 4,
            magicDefence: 1,
            dexterity: 2,
            intelligence: 1,
          },
        }),
        createMobTemplate({ code: 'thin-shade', name: 'Тонкая тень', baseStats: { health: 4, attack: 1, defence: 0, magicDefence: 0, dexterity: 1, intelligence: 1 } }),
        createMobTemplate({ code: 'hard-elite', isElite: true }),
      ],
      locationLevel: 4,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    if (outcome.kind !== 'battle') {
      return;
    }

    expect(outcome.enemy.code).toBe('thin-shade');
    expect(outcome.encounterVariant?.kind).toBe('WEARY_ENEMY');
    expect(outcome.encounterVariant?.title).toBe('Осторожная встреча');
    expect(outcome.encounterVariant?.initialTurnOwner).toBe('PLAYER');
    expect(outcome.enemy.currentHealth).toBe(Math.ceil(outcome.enemy.maxHealth * 0.6));
  });

  it('marks elite enemies as an elite trail instead of a plain random encounter', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: createBiome(),
      templates: [createMobTemplate({ isElite: true })],
      locationLevel: 4,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.kind : null).toBe('ELITE_TRAIL');
    expect(outcome.kind === 'battle' ? outcome.encounterVariant?.fleeChanceModifierPercent : null).toBe(-5);
  });

  it('keeps school miniboss preference inside the pure outcome resolver', () => {
    const player = createPlayer({
      victories: 4,
      locationLevel: 6,
      runes: [createEmberRune('UNUSUAL')],
    });
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValue(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player,
      biome: createBiome(),
      templates: [
        createMobTemplate(),
        createMobTemplate({
          code: 'ash-matron',
          name: 'Пепельная матрона',
          isElite: true,
          isBoss: true,
        }),
      ],
      locationLevel: 6,
      currentSchoolCode: 'ember',
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.enemy.code : null).toBe('ash-matron');
  });

  it('uses a normal encounter instead of a school miniboss while recovering from defeat', () => {
    const player = createPlayer({
      victories: 4,
      locationLevel: 6,
      defeats: 1,
      defeatStreak: 1,
      runes: [createEmberRune('UNUSUAL')],
    });
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValue(true),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player,
      biome: createBiome(),
      templates: [
        createMobTemplate(),
        createMobTemplate({
          code: 'ash-matron',
          name: 'Пепельная матрона',
          isElite: true,
          isBoss: true,
        }),
      ],
      locationLevel: 6,
      currentSchoolCode: 'ember',
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.enemy.code : null).toBe('blue-slime');
  });

  it('can prefer a seal target after the rare school seal is equipped', () => {
    const player = createPlayer({
      victories: 6,
      locationLevel: 6,
      schoolMasteries: [{ schoolCode: 'ember', experience: 4, rank: 1 }],
      runes: [createEmberRune('RARE')],
    });
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValue(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };

    const outcome = resolveExplorationOutcome({
      player,
      biome: createBiome(),
      templates: [
        createMobTemplate(),
        createMobTemplate({
          code: 'ash-matron',
          name: 'Пепельная матрона',
          isElite: true,
          isBoss: true,
        }),
      ],
      locationLevel: 6,
      currentSchoolCode: 'ember',
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.enemy.code : null).toBe('ash-matron');
  });

  it('can pull an old-location mob into a higher-level route as a roaming encounter', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const oldForest = createRoamingBiome({
      code: 'dark-forest',
      name: 'Тёмный лес',
      minLevel: 1,
      maxLevel: 15,
    });
    const caves = createRoamingBiome({
      code: 'forgotten-caves',
      name: 'Забытые пещеры',
      minLevel: 16,
      maxLevel: 35,
    });

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: caves,
      templates: [createMobTemplate({ code: 'cave-goblin', biomeCode: 'forgotten-caves' })],
      roamingTemplatePools: [{
        biome: oldForest,
        templates: [createMobTemplate({ code: 'forest-wolf', biomeCode: 'dark-forest', name: 'Лесной волк' })],
        chancePercent: 12,
        direction: 'LOWER_BIOME',
      }],
      locationLevel: 18,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    if (outcome.kind !== 'battle') {
      return;
    }

    expect(outcome.enemy.code).toBe('forest-wolf');
    expect(outcome.openingLog).toContain('🧭 Бродячий след: Лесной волк пришёл из места «Тёмный лес».');
  });

  it('can rarely pull a nearest higher-biome mob into the current route', () => {
    const random = {
      rollPercentage: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false),
      pickOne: vi.fn(<T>(items: readonly T[]) => items[0]!),
    };
    const forest = createRoamingBiome({
      code: 'dark-forest',
      name: 'Тёмный лес',
      minLevel: 1,
      maxLevel: 15,
    });
    const caves = createRoamingBiome({
      code: 'forgotten-caves',
      name: 'Забытые пещеры',
      minLevel: 16,
      maxLevel: 35,
    });

    const outcome = resolveExplorationOutcome({
      player: createPlayer(),
      biome: forest,
      templates: [createMobTemplate({ code: 'forest-wolf', biomeCode: 'dark-forest' })],
      roamingTemplatePools: [
        {
          biome: createRoamingBiome({ code: 'initium', name: 'Порог Инициации', minLevel: 0, maxLevel: 0 }),
          templates: [createMobTemplate({ code: 'training-wisp', biomeCode: 'initium' })],
          chancePercent: 12,
          direction: 'LOWER_BIOME',
        },
        {
          biome: caves,
          templates: [createMobTemplate({ code: 'cave-goblin', biomeCode: 'forgotten-caves', name: 'Пещерный гоблин' })],
          chancePercent: 3,
          direction: 'HIGHER_BIOME',
        },
      ],
      locationLevel: 8,
      currentSchoolCode: null,
    }, random);

    expect(outcome.kind).toBe('battle');
    expect(outcome.kind === 'battle' ? outcome.enemy.code : null).toBe('cave-goblin');
  });
});

describe('resolveExplorationSchoolCode', () => {
  it('reads the currently equipped school from the player loadout', () => {
    const player = createPlayer({ runes: [createEmberRune('USUAL')] });

    expect(resolveExplorationSchoolCode(player)).toBe('ember');
  });
});
