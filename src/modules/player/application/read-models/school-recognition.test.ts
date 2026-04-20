import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../../../shared/types/game';
import { buildPlayerSchoolRecognitionView } from './school-recognition';

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
  victories: 3,
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
  schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
  runes: [
    {
      id: 'rune-1',
      runeCode: 'rune-1',
      archetypeCode: 'ember',
      passiveAbilityCodes: ['ember_heart'],
      activeAbilityCodes: ['ember_pulse'],
      name: 'Обычная руна Пламени',
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

describe('school recognition read-model', () => {
  it('shows a pending sign-equip message when the first school sign is still in reserve', () => {
    const recognition = buildPlayerSchoolRecognitionView(createPlayer({
      runes: [
        ...createPlayer().runes,
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
    }));

    expect(recognition?.title).toBe('Первый знак Пламени');
    expect(recognition?.signEquipped).toBe(false);
    expect(recognition?.statusLine).toContain('ждёт в рунах');
  });

  it('shows a recognized school message once the sign is already equipped', () => {
    const recognition = buildPlayerSchoolRecognitionView(createPlayer({
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
        },
      ],
    }));

    expect(recognition?.title).toBe('Первый знак Пламени');
    expect(recognition?.signEquipped).toBe(true);
    expect(recognition?.statusLine).toContain('школа признала вашу решимость');
  });

  it('shows a school seal message once the rare school rune is already equipped', () => {
    const recognition = buildPlayerSchoolRecognitionView(createPlayer({
      runes: [
        {
          ...createPlayer().runes[0]!,
          name: 'Редкая руна Пламени',
          rarity: 'RARE',
        },
      ],
    }));

    expect(recognition?.title).toBe('Печать Пламени');
    expect(recognition?.signEquipped).toBe(true);
    expect(recognition?.statusLine).toContain('большой бой Пламени');
  });

  it('shows an echo-specific recognition message once the first sign is already equipped', () => {
    const recognition = buildPlayerSchoolRecognitionView(createPlayer({
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbilityCodes: [],
          name: 'Необычная руна Прорицания',
          rarity: 'UNUSUAL',
        },
      ],
    }));

    expect(recognition?.title).toBe('Первый знак Прорицания');
    expect(recognition?.statusLine).toContain('читать раскрытую угрозу');
  });

  it('shows a gale-specific seal message once the rare gale rune is already equipped', () => {
    const recognition = buildPlayerSchoolRecognitionView(createPlayer({
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'gale',
          passiveAbilityCodes: [],
          activeAbilityCodes: ['gale_step'],
          name: 'Редкая руна Бури',
          rarity: 'RARE',
        },
      ],
    }));

    expect(recognition?.title).toBe('Печать Бури');
    expect(recognition?.statusLine).toContain('темпа и ответного хода');
  });

  it('shows an echo-specific seal message once the rare echo rune is already equipped', () => {
    const recognition = buildPlayerSchoolRecognitionView(createPlayer({
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0]!,
          archetypeCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbilityCodes: [],
          name: 'Редкая руна Прорицания',
          rarity: 'RARE',
        },
      ],
    }));

    expect(recognition?.title).toBe('Печать Прорицания');
    expect(recognition?.statusLine).toContain('чтения боя и точного ответа');
  });
});
