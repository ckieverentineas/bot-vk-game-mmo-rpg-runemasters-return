import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState } from '../../../../shared/types/game';
import {
  buildBattleResultNextGoalView,
  buildPlayerNextGoalView,
  resolveNextGoalRuneFocusIndex,
} from './next-goal';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 3, intelligence: 1 },
  locationLevel: 1,
  currentRuneIndex: 0,
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
  schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
  runes: [
    {
      id: 'rune-1',
      runeCode: 'rune-1',
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
    dexterity: 3,
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
    dexterity: 2,
    intelligence: 1,
    maxHealth: 6,
    currentHealth: 0,
    maxMana: 4,
    currentMana: 4,
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
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('next goal read-model', () => {
  it('builds a school novice path goal before the first unusual rune of the school is earned', () => {
    const goal = buildPlayerNextGoalView(createPlayer({ victories: 3 }));

    expect(goal.goalType).toBe('hunt_school_elite');
    expect(goal.objectiveText).toContain('разыщите Пепельную ведунью');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Пепельная ведунья');
    expect(goal.milestoneBenefitText).toContain('первую необычную руну школы Пламени');
  });

  it('keeps active-skill guidance for gale before the first victory, even though the novice path exists later', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 0,
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'gale',
          passiveAbilityCodes: ['gale_mark'],
          activeAbilityCodes: ['gale_step'],
          name: 'Руна Бури',
        },
      ],
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
    }));

    expect(goal.goalType).toBe('use_active_rune_skill');
    expect(goal.objectiveText).toContain('примените активное действие');
  });

  it('builds a gale novice path goal once the first gale battle is already behind the player', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 1,
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'gale',
          passiveAbilityCodes: [],
          activeAbilityCodes: ['gale_step'],
          name: 'Руна Бури',
        },
      ],
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
    }));

    expect(goal.goalType).toBe('hunt_school_elite');
    expect(goal.objectiveText).toContain('разыщите Шквальную рысь');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Шквальная рысь');
  });

  it('builds an echo novice path goal even without an active rune skill', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 1,
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbilityCodes: [],
          name: 'Руна Прорицания',
        },
      ],
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
    }));

    expect(goal.goalType).toBe('hunt_school_elite');
    expect(goal.objectiveText).toContain('разыщите Слепого авгура');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Слепой авгур');
  });

  it('keeps the school miniboss ahead of generic mastery after the first sign', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 3,
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
        },
        {
          ...createPlayer().runes[0]!,
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Запасная необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
          createdAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    }));

    expect(goal.goalType).toBe('challenge_school_miniboss');
    expect(goal.objectiveText).toContain('разыщите Пепельную матрону');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Пепельная матрона');
  });

  it('opens a seal target goal after the rare school seal is equipped', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 6,
      schoolMasteries: [{ schoolCode: 'ember', experience: 4, rank: 1 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Редкая руна Пламени',
          rarity: 'RARE',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    }));

    expect(goal.goalType).toBe('prove_school_seal');
    expect(goal.primaryActionLabel).toBe('⚔️ Цель печати');
    expect(goal.objectiveText).toContain('проверьте печать школы Пламени');
    expect(goal.objectiveText).toContain('ещё 3 победы');
    expect(goal.whyText).toContain('+1 к давлению базовой атаки');
    expect(goal.milestoneProgressText).toBe('4/7 до «Печать давления»');
  });

  it('guides the player to equip the first school sign after novice completion if it is still in reserve', () => {
    const player = createPlayer({
      victories: 3,
      runes: [
        createPlayer().runes[0]!,
        {
          ...createPlayer().runes[0]!,
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
          createdAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    const goal = buildPlayerNextGoalView(player);

    expect(goal.goalType).toBe('equip_school_sign');
    expect(goal.primaryActionLabel).toBe('🔮 Руны');
    expect(goal.objectiveText).toContain('наденьте первый знак школы Пламени');
    expect(goal.milestoneProgressText).toContain('«Необычная руна Пламени»');
    expect(resolveNextGoalRuneFocusIndex(player)).toBe(1);
  });

  it('guides the player to equip the school seal after the miniboss reward if the rare rune is still in reserve', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 5,
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...createPlayer().runes[0]!,
          id: 'rune-3',
          runeCode: 'rune-3',
          name: 'Редкая руна Пламени',
          rarity: 'RARE',
          isEquipped: false,
          equippedSlot: null,
          createdAt: '2026-04-14T00:00:00.000Z',
        },
      ],
    }));

    expect(goal.goalType).toBe('equip_school_sign');
    expect(goal.objectiveText).toContain('наденьте печать школы Пламени');
    expect(goal.whyText).toContain('большой бой школы Пламени');
    expect(goal.milestoneTitle).toBe('Печать школы Пламени');
  });

  it('guides the player to the school miniboss once the first sign is already equipped', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 4,
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    }));

    expect(goal.goalType).toBe('challenge_school_miniboss');
    expect(goal.objectiveText).toContain('разыщите Пепельную матрону');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Пепельная матрона');
    expect(goal.milestoneBenefitText).toContain('первую редкую руну школы Пламени');
  });

  it('treats a first school sign in slot 2 as equipped for the miniboss goal', () => {
    const baseRune = createPlayer().runes[0]!;
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 4,
      runes: [
        {
          ...baseRune,
          name: 'Обычная руна Пламени',
          rarity: 'USUAL',
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...baseRune,
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 1,
        },
      ],
    }));

    expect(goal.goalType).toBe('challenge_school_miniboss');
    expect(goal.primaryActionLabel).toBe('⚔️ Исследовать');
  });

  it('guides gale to its school miniboss once the first sign is already equipped', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 4,
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'gale',
          passiveAbilityCodes: [],
          activeAbilityCodes: ['gale_step'],
          name: 'Необычная руна Бури',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    }));

    expect(goal.goalType).toBe('challenge_school_miniboss');
    expect(goal.objectiveText).toContain('разыщите Владыку шквала');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Владыка шквала');
    expect(goal.milestoneBenefitText).toContain('первую редкую руну школы Бури');
  });

  it('guides echo to its school miniboss once the first sign is already equipped', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 4,
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbilityCodes: [],
          name: 'Необычная руна Прорицания',
          rarity: 'UNUSUAL',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    }));

    expect(goal.goalType).toBe('challenge_school_miniboss');
    expect(goal.objectiveText).toContain('разыщите Хранителя предзнамений');
    expect(goal.milestoneProgressText).toBe('Тёмный лес · Хранитель предзнамений');
    expect(goal.milestoneBenefitText).toContain('первую редкую руну школы Прорицания');
  });

  it('asks the player to fill the baseline second rune slot', () => {
    const goal = buildPlayerNextGoalView(createPlayer({
      victories: 4,
      schoolMasteries: [{ schoolCode: 'ember', experience: 7, rank: 2 }],
      unlockedRuneSlotCount: 2,
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Редкая руна Пламени',
          rarity: 'RARE',
        },
      ],
    }));

    expect(goal.goalType).toBe('fill_rune_slot');
    expect(goal.primaryActionLabel).toBe('🔮 Руны');
    expect(goal.milestoneProgressText).toBe('Второй слот рун уже открыт.');
  });

  it('keeps battle-result guidance aligned with the current player goal when no rune drops', () => {
    const goal = buildBattleResultNextGoalView(createBattle(), createPlayer({ victories: 3 }));

    expect(goal?.goalType).toBe('hunt_school_elite');
    expect(goal?.primaryActionLabel).toBe('⚔️ Исследовать');
    expect(goal?.objectiveText).toContain('разыщите Пепельную ведунью');
  });

  it('falls through to the seal target goal after a completed miniboss reward', () => {
    const goal = buildBattleResultNextGoalView(createBattle(), createPlayer({
      victories: 6,
      schoolMasteries: [{ schoolCode: 'ember', experience: 4, rank: 1 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Редкая руна Пламени',
          rarity: 'RARE',
        },
      ],
    }));

    expect(goal?.goalType).toBe('prove_school_seal');
    expect(goal?.primaryActionLabel).toBe('⚔️ Цель печати');
    expect(goal?.objectiveText).toContain('проверьте печать школы Пламени');
  });

  it('prioritizes equipping a dropped rune after victory', () => {
    const goal = buildBattleResultNextGoalView(createBattle({
      rewards: {
        ...createBattle().rewards!,
        droppedRune: {
          runeCode: 'drop-1',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Новая руна Пламени',
          rarity: 'USUAL',
          isEquipped: false,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
        },
      },
    }), createPlayer());

    expect(goal?.goalType).toBe('equip_dropped_rune');
    expect(goal?.primaryActionLabel).toBe('🔮 Руны');
  });

  it('turns an aligned novice reward drop into the school-sign equip goal', () => {
    const player = createPlayer({
      victories: 3,
      runes: [
        createPlayer().runes[0]!,
        {
          ...createPlayer().runes[0]!,
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Первый знак Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
          createdAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    const goal = buildBattleResultNextGoalView(createBattle({
      enemy: {
        ...createBattle().enemy,
        code: 'ash-seer',
        name: 'Пепельная ведунья',
        kind: 'mage',
        isElite: true,
      },
      rewards: {
        ...createBattle().rewards!,
        droppedRune: {
          runeCode: 'drop-school-sign-1',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Первый знак Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          health: 2,
          attack: 3,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
        },
      },
    }), player);

    expect(goal?.goalType).toBe('equip_school_sign');
    expect(goal?.objectiveText).toContain('наденьте первый знак школы Пламени');
  });

  it('guides defeat recovery through runes and an осторожная встреча', () => {
    const goal = buildBattleResultNextGoalView(createBattle({
      result: 'DEFEAT',
      rewards: null,
      log: ['💥 Поражение.'],
    }), createPlayer({ defeats: 1, defeatStreak: 1 }));

    expect(goal?.goalType).toBe('review_runes_after_defeat');
    expect(goal?.primaryActionLabel).toBe('🔮 Руны');
    expect(goal?.objectiveText).toContain('проверьте «🔮 Руны», затем вернитесь через осторожную встречу');
    expect(goal?.whyText).toContain('руны и прогресс остаются');
  });
});
