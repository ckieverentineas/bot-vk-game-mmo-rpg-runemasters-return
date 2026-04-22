import { describe, expect, it } from 'vitest';

import { emptyInventory } from '../../../player/domain/player-stats';
import type { PlayerState, RuneView } from '../../../../shared/types/game';
import { buildQuestBookView, type QuestStatus } from './quest-book';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 30,
    attack: 5,
    defence: 2,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  locationLevel: 0,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 2,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'ACTIVE',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-22T00:00:00.000Z',
  updatedAt: '2026-04-22T00:00:00.000Z',
  ...overrides,
});

const createRune = (overrides: Partial<RuneView> = {}): RuneView => ({
  id: 'rune-1',
  name: 'Обычная руна Пламени',
  rarity: 'USUAL',
  runeCode: 'ember',
  archetypeCode: 'ember',
  activeAbilityCodes: [],
  passiveAbilityCodes: [],
  health: 0,
  attack: 1,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  isEquipped: true,
  equippedSlot: 0,
  createdAt: '2026-04-22T00:00:00.000Z',
  ...overrides,
});

describe('buildQuestBookView', () => {
  it('marks completed and claimed quest records separately', () => {
    const player = createPlayer({
      victories: 1,
      runes: [{
        id: 'rune-1',
        name: 'Обычная руна Пламени',
        rarity: 'USUAL',
        runeCode: 'ember',
        archetypeCode: 'ember_striker',
        activeAbilityCodes: [],
        passiveAbilityCodes: [],
        health: 0,
        attack: 1,
        defence: 0,
        magicDefence: 0,
        dexterity: 0,
        intelligence: 0,
        isEquipped: true,
        equippedSlot: 0,
        createdAt: '2026-04-22T00:00:00.000Z',
      }],
    });

    const book = buildQuestBookView(player, ['awakening_empty_master']);

    expect(book.claimedCount).toBe(1);
    expect(book.readyToClaimCount).toBe(1);
    expect(book.quests.find((quest) => quest.code === 'awakening_empty_master')?.status).toBe('CLAIMED');
    expect(book.quests.find((quest) => quest.code === 'first_sign')?.status).toBe('READY_TO_CLAIM');
  });

  it('adds the first name path chapter from existing player state', () => {
    const player = createPlayer({
      locationLevel: 1,
      highestLocationLevel: 1,
      tutorialState: 'COMPLETED',
      victories: 2,
      runes: [
        {
          id: 'rune-1',
          name: 'Обычная руна Пламени',
          rarity: 'USUAL',
          runeCode: 'ember',
          archetypeCode: 'ember_striker',
          activeAbilityCodes: [],
          passiveAbilityCodes: [],
          health: 0,
          attack: 1,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          isEquipped: true,
          equippedSlot: 0,
          createdAt: '2026-04-22T00:00:00.000Z',
        },
        {
          id: 'rune-2',
          name: 'Обычная руна Тверди',
          rarity: 'USUAL',
          runeCode: 'stone',
          archetypeCode: 'stone_guardian',
          activeAbilityCodes: [],
          passiveAbilityCodes: [],
          health: 1,
          attack: 0,
          defence: 1,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          isEquipped: true,
          equippedSlot: 1,
          createdAt: '2026-04-22T00:01:00.000Z',
        },
      ],
      skills: [
        {
          skillCode: 'gathering.skinning',
          experience: 1,
          rank: 0,
        },
      ],
    });

    const book = buildQuestBookView(player, []);
    const statuses = new Map(book.quests.map((quest) => [quest.code, quest.status]));
    const firstNameChapter: Readonly<Record<string, QuestStatus>> = {
      name_on_threshold: 'READY_TO_CLAIM',
      trail_beyond_circle: 'READY_TO_CLAIM',
      second_rune_silence: 'READY_TO_CLAIM',
      first_pattern: 'READY_TO_CLAIM',
      craft_after_battle: 'READY_TO_CLAIM',
    };

    expect(book.quests.map((quest) => quest.code)).toEqual(expect.arrayContaining(Object.keys(firstNameChapter)));
    for (const [questCode, status] of Object.entries(firstNameChapter)) {
      expect(statuses.get(questCode)).toBe(status);
    }
  });

  it('keeps first name path entries in progress until the state proves them', () => {
    const book = buildQuestBookView(createPlayer(), []);
    const statuses = new Map(book.quests.map((quest) => [quest.code, quest.status]));

    expect(statuses.get('name_on_threshold')).toBe('IN_PROGRESS');
    expect(statuses.get('trail_beyond_circle')).toBe('IN_PROGRESS');
    expect(statuses.get('second_rune_silence')).toBe('IN_PROGRESS');
    expect(statuses.get('first_pattern')).toBe('IN_PROGRESS');
    expect(statuses.get('craft_after_battle')).toBe('IN_PROGRESS');
  });

  it('adds school chapters from mastery and school rune state', () => {
    const player = createPlayer({
      schoolMasteries: [
        { schoolCode: 'ember', experience: 3, rank: 1 },
        { schoolCode: 'stone', experience: 3, rank: 1 },
        { schoolCode: 'gale', experience: 3, rank: 1 },
        { schoolCode: 'echo', experience: 3, rank: 1 },
      ],
      runes: [
        createRune({
          id: 'ember-rune',
          archetypeCode: 'ember',
          rarity: 'UNUSUAL',
          name: 'Необычная руна Пламени',
          equippedSlot: 0,
        }),
        createRune({
          id: 'stone-rune',
          archetypeCode: 'stone',
          rarity: 'UNUSUAL',
          name: 'Необычная руна Тверди',
          equippedSlot: 1,
        }),
        createRune({
          id: 'gale-rune',
          archetypeCode: 'gale',
          rarity: 'UNUSUAL',
          name: 'Необычная руна Бури',
          isEquipped: false,
          equippedSlot: null,
        }),
        createRune({
          id: 'echo-rune',
          archetypeCode: 'echo',
          rarity: 'UNUSUAL',
          name: 'Необычная руна Прорицания',
          isEquipped: false,
          equippedSlot: null,
        }),
      ],
    });

    const book = buildQuestBookView(player, []);
    const statuses = new Map(book.quests.map((quest) => [quest.code, quest.status]));
    const schoolChapter: Readonly<Record<string, QuestStatus>> = {
      ember_finishing_spark: 'READY_TO_CLAIM',
      ember_light_fear: 'READY_TO_CLAIM',
      ember_ash_seal: 'READY_TO_CLAIM',
      stone_standing_ground: 'READY_TO_CLAIM',
      stone_answer: 'READY_TO_CLAIM',
      stone_wall_seal: 'READY_TO_CLAIM',
      gale_before_thunder: 'READY_TO_CLAIM',
      gale_wind_intercept: 'READY_TO_CLAIM',
      gale_dash_seal: 'READY_TO_CLAIM',
      echo_future_crack: 'READY_TO_CLAIM',
      echo_unmade_strike: 'READY_TO_CLAIM',
      echo_warning_seal: 'READY_TO_CLAIM',
    };

    expect(book.quests.map((quest) => quest.code)).toEqual(expect.arrayContaining(Object.keys(schoolChapter)));
    for (const [questCode, status] of Object.entries(schoolChapter)) {
      expect(statuses.get(questCode)).toBe(status);
    }
  });

  it('keeps school chapter entries in progress until mastery and rarity prove them', () => {
    const book = buildQuestBookView(createPlayer(), []);
    const statuses = new Map(book.quests.map((quest) => [quest.code, quest.status]));

    [
      'ember_finishing_spark',
      'ember_light_fear',
      'ember_ash_seal',
      'stone_standing_ground',
      'stone_answer',
      'stone_wall_seal',
      'gale_before_thunder',
      'gale_wind_intercept',
      'gale_dash_seal',
      'echo_future_crack',
      'echo_unmade_strike',
      'echo_warning_seal',
    ].forEach((questCode) => {
      expect(statuses.get(questCode)).toBe('IN_PROGRESS');
    });
  });
});
