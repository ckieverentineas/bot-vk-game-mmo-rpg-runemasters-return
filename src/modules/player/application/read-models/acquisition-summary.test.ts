import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState, RuneView } from '../../../../shared/types/game';
import { buildBattleAcquisitionSummary, buildCraftAcquisitionSummary } from './acquisition-summary';

const createRune = (overrides: Partial<RuneView> = {}): RuneView => ({
  id: 'rune-1',
  runeCode: 'rune-1',
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: 'Руна Пламени',
  rarity: 'USUAL',
  isEquipped: false,
  equippedSlot: null,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  createdAt: '2026-04-20T00:00:00.000Z',
  ...overrides,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  locationLevel: 1,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 1,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 25,
    unusualShards: 10,
    rareShards: 3,
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
  schoolMasteries: [{ schoolCode: 'ember', experience: 0, rank: 0 }],
  runes: [],
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 1,
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
    runeLoadout: {
      runeId: 'rune-1',
      runeName: 'Руна Пламени',
      archetypeCode: 'ember',
      archetypeName: 'Штурм',
      schoolCode: 'ember',
      schoolMasteryRank: 0,
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
    code: 'training-wisp',
    name: 'Учебный огонёк',
    kind: 'spirit',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 0,
    maxHealth: 6,
    currentHealth: 0,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 6,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'касается искрой',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['🏆 Победа!'],
  result: 'VICTORY',
  rewards: {
    experience: 6,
    gold: 2,
    shards: { USUAL: 2 },
    droppedRune: null,
  },
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  ...overrides,
});

describe('acquisition summary read-model', () => {
  it('explains the first rune as opening the first school', () => {
    const before = createPlayer({ runes: [], schoolMasteries: [] });
    const after = createPlayer({ runes: [createRune()] });

    const summary = buildCraftAcquisitionSummary(before, after);

    expect(summary?.kind).toBe('new_rune');
    expect(summary?.title).toContain('Первая руна');
    expect(summary?.changeLine).toContain('открывает школу Пламени');
    expect(summary?.nextStepLine).toContain('экипируйте');
  });

  it('calls out a newly unlocked rarity on a new rune', () => {
    const before = createPlayer({ runes: [createRune()] });
    const after = createPlayer({
      runes: [
        createRune(),
        createRune({ id: 'rune-2', runeCode: 'rune-2', rarity: 'RARE', name: 'Редкая руна Пламени' }),
      ],
    });

    const summary = buildCraftAcquisitionSummary(before, after);

    expect(summary?.title).toContain('Новая руна: Редкая руна Пламени');
    expect(summary?.changeLine).toContain('первая редкая руна');
  });

  it('explains a mastery unlock after battle even without a rune drop', () => {
    const before = createPlayer({
      runes: [createRune({ isEquipped: true, equippedSlot: 0 })],
      schoolMasteries: [{ schoolCode: 'ember', experience: 2, rank: 0 }],
      unlockedRuneSlotCount: 2,
    });
    const after = createPlayer({
      runes: [createRune({ isEquipped: true, equippedSlot: 0 })],
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      unlockedRuneSlotCount: 2,
    });

    const summary = buildBattleAcquisitionSummary(before, after, createBattle());

    expect(summary?.kind).toBe('mastery_unlock');
    expect(summary?.title).toContain('Разогрев дожима');
    expect(summary?.changeLine).toContain('Пламя');
  });

  it('turns the first aligned unusual novice reward into a school trial completion summary', () => {
    const before = createPlayer({
      runes: [createRune({ isEquipped: true, equippedSlot: 0 })],
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      unlockedRuneSlotCount: 1,
    });
    const after = createPlayer({
      runes: [
        createRune({ isEquipped: true, equippedSlot: 0 }),
        createRune({
          id: 'rune-2',
          runeCode: 'rune-2',
          rarity: 'UNUSUAL',
          name: 'Необычная руна Пламени',
        }),
      ],
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      unlockedRuneSlotCount: 1,
    });

    const summary = buildBattleAcquisitionSummary(before, after, createBattle({
      enemy: {
        ...createBattle().enemy,
        code: 'ash-seer',
        name: 'Пепельная ведунья',
        kind: 'mage',
        isElite: true,
      },
    }));

    expect(summary?.kind).toBe('school_trial_completed');
    expect(summary?.title).toBe('Испытание школы пройдено');
    expect(summary?.changeLine).toContain('Пламя признало вашу решимость');
  });

  it('prioritizes support slot unlock when mastery opens build breadth', () => {
    const before = createPlayer({
      runes: [createRune({ isEquipped: true, equippedSlot: 0 })],
      schoolMasteries: [{ schoolCode: 'ember', experience: 2, rank: 0 }],
      unlockedRuneSlotCount: 1,
    });
    const after = createPlayer({
      runes: [createRune({ isEquipped: true, equippedSlot: 0 })],
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      unlockedRuneSlotCount: 2,
    });

    const summary = buildBattleAcquisitionSummary(before, after, createBattle());

    expect(summary?.kind).toBe('slot_unlock');
    expect(summary?.title).toBe('Открыт слот поддержки');
    expect(summary?.nextStepLine).toContain('поставьте руну поддержки');
  });

  it('returns null when battle gives no new build-impacting gain', () => {
    const player = createPlayer({ runes: [createRune({ isEquipped: true, equippedSlot: 0 })] });

    expect(buildBattleAcquisitionSummary(player, player, createBattle())).toBeNull();
  });
});
