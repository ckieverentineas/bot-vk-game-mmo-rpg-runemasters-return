import { describe, expect, it, vi } from 'vitest';

import type { BattleView, PlayerState } from '../../../../shared/types/game';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import { resolveVictoryRewardOptions } from './resolve-victory-reward-options';

const createRandom = (): GameRandom => ({
  nextInt: vi.fn().mockReturnValue(1),
  rollPercentage: vi.fn().mockReturnValue(false),
  pickOne: vi.fn((items: readonly string[]) => items[0]),
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 5,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  locationLevel: 4,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 2,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 4,
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

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 1,
  locationLevel: 4,
  biomeCode: 'dark-forest',
  enemyCode: 'ash-seer',
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
    runeLoadout: {
      runeId: 'rune-1',
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
    guardPoints: 0,
  },
  enemy: {
    code: 'ash-seer',
    name: 'Пепельная ведунья',
    kind: 'mage',
    isElite: true,
    isBoss: false,
    attack: 7,
    defence: 2,
    magicDefence: 4,
    dexterity: 5,
    intelligence: 8,
    maxHealth: 24,
    currentHealth: 0,
    maxMana: 32,
    currentMana: 32,
    experienceReward: 24,
    goldReward: 9,
    runeDropChance: 28,
    attackText: 'выпускает пепельный прорыв',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['🏆 Победа!'],
  result: 'VICTORY',
  rewards: {
    experience: 24,
    gold: 9,
    shards: {},
    droppedRune: null,
  },
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('resolveVictoryRewardOptions', () => {
  it('still forces the first tutorial rune for the training wisp', () => {
    const result = resolveVictoryRewardOptions(
      createPlayer({ tutorialState: 'ACTIVE', runes: [] }),
      createBattle({
        locationLevel: 0,
        enemy: {
          ...createBattle().enemy,
          code: 'training-wisp',
          name: 'Учебный огонёк',
          kind: 'spirit',
          isElite: false,
          attack: 1,
          experienceReward: 6,
          goldReward: 2,
          runeDropChance: 10,
          attackText: 'касается искрой',
          maxHealth: 0,
        },
      }),
      createRandom(),
    );

    expect(result.forcedRune?.archetypeCode).toBe('ember');
    expect(result.forcedRune?.rarity).toBe('UNUSUAL');
  });

  it('forces an unusual ember rune from the ash seer when ember is the current school and no better ember rune exists', () => {
    const result = resolveVictoryRewardOptions(createPlayer(), createBattle(), createRandom());

    expect(result.forcedRune?.archetypeCode).toBe('ember');
    expect(result.forcedRune?.rarity).toBe('UNUSUAL');
  });

  it('forces an unusual stone rune from the stonehorn ram when stone is the current school', () => {
    const result = resolveVictoryRewardOptions(
      createPlayer(),
      createBattle({
        enemy: {
          ...createBattle().enemy,
          code: 'stonehorn-ram',
          name: 'Камнерогий таран',
          kind: 'boar',
        },
        player: {
          ...createBattle().player,
          runeLoadout: {
            ...createBattle().player.runeLoadout!,
            runeName: 'Руна Тверди',
            archetypeCode: 'stone',
            archetypeName: 'Страж',
            schoolCode: 'stone',
            passiveAbilityCodes: ['stone_guard'],
            activeAbility: {
              code: 'stone_bastion',
              name: 'Каменный отпор',
              manaCost: 2,
              cooldownTurns: 2,
              currentCooldown: 0,
            },
          },
        },
      }),
      createRandom(),
    );

    expect(result.forcedRune?.archetypeCode).toBe('stone');
    expect(result.forcedRune?.rarity).toBe('UNUSUAL');
  });

  it('does not force a school elite reward if the player already owns an unusual rune of that school', () => {
    const result = resolveVictoryRewardOptions(
      createPlayer({
        runes: [
          {
            id: 'rune-owned-1',
            runeCode: 'rune-owned-1',
            archetypeCode: 'ember',
            passiveAbilityCodes: ['ember_heart'],
            activeAbilityCodes: ['ember_pulse'],
            name: 'Необычная руна Пламени',
            rarity: 'UNUSUAL',
            isEquipped: false,
            health: 1,
            attack: 2,
            defence: 0,
            magicDefence: 0,
            dexterity: 0,
            intelligence: 0,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      createBattle(),
      createRandom(),
    );

    expect(result.forcedRune).toBeUndefined();
  });

  it('does not force a reward if the elite school does not match the current school', () => {
    const result = resolveVictoryRewardOptions(
      createPlayer(),
      createBattle({
        player: {
          ...createBattle().player,
          runeLoadout: {
            ...createBattle().player.runeLoadout!,
            runeName: 'Руна Бури',
            archetypeCode: 'gale',
            archetypeName: 'Налётчик',
            schoolCode: 'gale',
          },
        },
      }),
      createRandom(),
    );

    expect(result.forcedRune).toBeUndefined();
  });
});
