import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState } from '../../shared/types/game';
import {
  createBattleKeyboard,
  createBattleResultKeyboard,
  createDeleteConfirmationKeyboard,
  createMainMenuKeyboard,
  createProfileKeyboard,
  createRuneKeyboard,
  createTutorialKeyboard,
} from './index';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
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
  allocationPoints: {
    health: 0,
    attack: 1,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  unspentStatPoints: 2,
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
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
  runes: [
    {
      id: 'rune-1',
      runeCode: 'rune-1',
      archetypeCode: 'ember',
      passiveAbilityCodes: ['ember_heart'],
      activeAbilityCodes: ['ember_pulse'],
      name: 'Руна A',
      rarity: 'USUAL',
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
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
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
    runeLoadout: {
      archetypeCode: 'ember',
      runeName: 'Руна Пламени',
      passiveAbilities: [],
      activeAbility: {
        code: 'ember_pulse',
        name: 'Пульс Пламени',
        manaCost: 3,
        currentCooldown: 0,
        cooldownTurns: 2,
        effectDescription: 'Наносит урон.',
      },
    },
    guardPoints: 0,
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
    currentHealth: 5,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 4,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'бьёт',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['⚔️ Бой начался.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

interface SerializedButtonPayload {
  readonly command: string;
  readonly intentId?: string;
  readonly stateKey?: string;
}

const collectPayloads = (
  keyboard:
    | ReturnType<typeof createBattleKeyboard>
    | ReturnType<typeof createBattleResultKeyboard>
    | ReturnType<typeof createDeleteConfirmationKeyboard>
    | ReturnType<typeof createMainMenuKeyboard>
    | ReturnType<typeof createProfileKeyboard>
    | ReturnType<typeof createRuneKeyboard>
    | ReturnType<typeof createTutorialKeyboard>,
): SerializedButtonPayload[] => {
  const serialized = JSON.parse(JSON.stringify(keyboard)) as {
    rows: Array<Array<{ action: { payload: string } }>>;
    currentRow?: Array<{ action: { payload: string } }>;
  };

  return [...serialized.rows.flat(), ...(serialized.currentRow ?? [])]
    .map((button) => JSON.parse(button.action.payload) as SerializedButtonPayload);
};

describe('profile keyboard', () => {
  it('adds intent metadata to stat and reset buttons when player context is available', () => {
    const payloads = collectPayloads(createProfileKeyboard(createPlayer()));

    const attack = payloads.find((payload) => payload.command === '+атк');
    const reset = payloads.find((payload) => payload.command === 'сброс');
    const back = payloads.find((payload) => payload.command === 'назад');

    expect(attack?.intentId).toEqual(expect.any(String));
    expect(attack?.stateKey).toEqual(expect.any(String));
    expect(reset?.intentId).toEqual(expect.any(String));
    expect(reset?.stateKey).toEqual(expect.any(String));
    expect(back?.intentId).toBeUndefined();
    expect(back?.stateKey).toBeUndefined();
  });

  it('adds intent metadata to equip and unequip buttons when rune context is available', () => {
    const payloads = collectPayloads(createRuneKeyboard(createPlayer()));

    const equip = payloads.find((payload) => payload.command === 'надеть');
    const unequip = payloads.find((payload) => payload.command === 'снять');
    const nextPage = payloads.find((payload) => payload.command === 'руны >');
    const slotOne = payloads.find((payload) => payload.command === 'руна слот 1');

    expect(equip?.intentId).toEqual(expect.any(String));
    expect(equip?.stateKey).toEqual(expect.any(String));
    expect(unequip?.intentId).toEqual(expect.any(String));
    expect(unequip?.stateKey).toEqual(expect.any(String));
    expect(nextPage?.intentId).toEqual(expect.any(String));
    expect(nextPage?.stateKey).toEqual(expect.any(String));
    expect(slotOne?.intentId).toEqual(expect.any(String));
    expect(slotOne?.stateKey).toEqual(expect.any(String));
  });

  it('does not emit partial intent envelopes on rune keyboard without player context', () => {
    const payloads = collectPayloads(createRuneKeyboard());

    const craft = payloads.find((payload) => payload.command === 'создать');
    const destroy = payloads.find((payload) => payload.command === 'сломать');

    expect(craft?.intentId).toBeUndefined();
    expect(craft?.stateKey).toBeUndefined();
    expect(destroy?.intentId).toBeUndefined();
    expect(destroy?.stateKey).toBeUndefined();
  });

  it('adds intent metadata to delete confirmation button when player context is available', () => {
    const player = createPlayer();
    const payloads = collectPayloads(createDeleteConfirmationKeyboard(player));

    const confirm = payloads.find((payload) => payload.command === '__confirm_delete_player__');
    const cancel = payloads.find((payload) => payload.command === 'профиль');

    expect(confirm?.intentId).toEqual(expect.any(String));
    expect(confirm?.stateKey).toBe(player.updatedAt);
    expect(cancel?.intentId).toBeUndefined();
  });

  it('adds intent metadata to tutorial skip button when onboarding is active', () => {
    const payloads = collectPayloads(createTutorialKeyboard(createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 })));

    const explore = payloads.find((payload) => payload.command === 'исследовать');
    const skip = payloads.find((payload) => payload.command === 'пропустить обучение');

    expect(explore?.intentId).toEqual(expect.any(String));
    expect(explore?.stateKey).toEqual(expect.any(String));
    expect(skip?.intentId).toEqual(expect.any(String));
    expect(skip?.stateKey).toEqual(expect.any(String));
  });

  it('adds intent metadata to main-menu and battle-result explore buttons when player context is available', () => {
    const player = createPlayer();
    const mainMenuPayloads = collectPayloads(createMainMenuKeyboard(player));
    const battleResultPayloads = collectPayloads(createBattleResultKeyboard(createBattle({ status: 'COMPLETED', result: 'VICTORY', rewards: { experience: 6, gold: 2, shards: { USUAL: 1 }, droppedRune: null } }), player));

    const location = mainMenuPayloads.find((payload) => payload.command === 'локация');
    const mainExplore = mainMenuPayloads.find((payload) => payload.command === 'исследовать');
    const newBattle = battleResultPayloads.find((payload) => payload.command === 'исследовать');

    expect(location?.intentId).toEqual(expect.any(String));
    expect(location?.stateKey).toEqual(expect.any(String));
    expect(mainExplore?.intentId).toEqual(expect.any(String));
    expect(mainExplore?.stateKey).toEqual(expect.any(String));
    expect(newBattle?.intentId).toEqual(expect.any(String));
    expect(newBattle?.stateKey).toEqual(expect.any(String));
  });

  it('adds intent metadata to battle action buttons', () => {
    const payloads = collectPayloads(createBattleKeyboard(createBattle()));

    const attack = payloads.find((payload) => payload.command === 'атака');
    const defend = payloads.find((payload) => payload.command === 'защита');
    const skill = payloads.find((payload) => payload.command === 'навыки');

    expect(attack?.intentId).toEqual(expect.any(String));
    expect(attack?.stateKey).toEqual(expect.any(String));
    expect(defend?.intentId).toEqual(expect.any(String));
    expect(defend?.stateKey).toEqual(expect.any(String));
    expect(skill?.intentId).toEqual(expect.any(String));
    expect(skill?.stateKey).toEqual(expect.any(String));
  });
});
