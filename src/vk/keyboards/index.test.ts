import { describe, expect, it } from 'vitest';

import type { BattleView, PartyView, PlayerState } from '../../shared/types/game';
import {
  createBattleKeyboard,
  createBattleResultKeyboard,
  createAltarKeyboard,
  createDeleteConfirmationKeyboard,
  createMainMenuKeyboard,
  createPendingRewardKeyboard,
  createPartyKeyboard,
  createProfileKeyboard,
  createRuneDetailKeyboard,
  createRuneKeyboard,
  createSchoolMasteryKeyboard,
  createTutorialKeyboard,
  createWorkshopKeyboard,
} from './index';
import {
  createWorkshopAwakenCommand,
  createWorkshopCraftCommand,
  createWorkshopRepairCommand,
  createWorkshopShopCommand,
  gameCommands,
} from '../commands/catalog';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import type { PlayerBlueprintInstanceView } from '../../modules/workshop/application/workshop-persistence';
import { getWorkshopBlueprint } from '../../modules/workshop/domain/workshop-catalog';
import { getWorkshopShopOffer } from '../../modules/workshop/domain/workshop-shop';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
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
    healingPills: 0,
    focusPills: 0,
    guardPills: 0,
    clarityPills: 0,
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

const createBlueprintInstance = (
  overrides: Partial<PlayerBlueprintInstanceView> = {},
): PlayerBlueprintInstanceView => ({
  id: 'bp-skinning-kit-1',
  playerId: 1,
  blueprintCode: 'skinning_kit',
  rarity: 'COMMON',
  sourceType: 'QUEST',
  sourceId: 'test',
  discoveryKind: 'QUEST',
  quality: 'STURDY',
  craftPotential: 'default',
  modifierSnapshot: {},
  status: 'AVAILABLE',
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  discoveredAt: '2026-04-12T00:00:00.000Z',
  consumedAt: null,
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

const createPendingReward = (): PendingRewardView => ({
  ledgerKey: 'battle-victory:battle-1',
  source: {
    battleId: 'battle-1',
    enemyCode: 'forest-wolf',
    enemyName: 'Лесной волк',
    enemyKind: 'wolf',
  },
  snapshot: {
    schemaVersion: 1,
    intentId: 'battle-victory:battle-1',
    sourceType: 'BATTLE_VICTORY',
    sourceId: 'battle-1',
    playerId: 1,
    status: 'PENDING',
    baseReward: {
      experience: 14,
      gold: 5,
      shards: { USUAL: 2 },
      droppedRune: null,
    },
    trophyActions: [
      {
        code: 'skin_beast',
        label: '🔪 Свежевать',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['leather', 'bone'],
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ],
    selectedActionCode: null,
    appliedResult: null,
    createdAt: '2026-04-22T00:00:00.000Z',
  },
});

interface SerializedButtonPayload {
  readonly command: string;
  readonly intentId?: string;
  readonly stateKey?: string;
}

interface SerializedButton {
  readonly action: {
    readonly label: string;
    readonly payload: string;
  };
}

interface SerializedKeyboard {
  readonly isInline: boolean;
  readonly rows: Array<Array<SerializedButton>>;
  readonly currentRow?: Array<SerializedButton>;
}

const serializeKeyboard = (
  keyboard:
    | ReturnType<typeof createBattleKeyboard>
    | ReturnType<typeof createBattleResultKeyboard>
    | ReturnType<typeof createAltarKeyboard>
    | ReturnType<typeof createDeleteConfirmationKeyboard>
    | ReturnType<typeof createMainMenuKeyboard>
    | ReturnType<typeof createPendingRewardKeyboard>
    | ReturnType<typeof createPartyKeyboard>
    | ReturnType<typeof createProfileKeyboard>
    | ReturnType<typeof createRuneDetailKeyboard>
    | ReturnType<typeof createRuneKeyboard>
    | ReturnType<typeof createSchoolMasteryKeyboard>
    | ReturnType<typeof createTutorialKeyboard>,
): SerializedKeyboard => JSON.parse(JSON.stringify(keyboard)) as SerializedKeyboard;

const collectPayloads = (
  keyboard:
    | ReturnType<typeof createBattleKeyboard>
    | ReturnType<typeof createBattleResultKeyboard>
    | ReturnType<typeof createAltarKeyboard>
    | ReturnType<typeof createDeleteConfirmationKeyboard>
    | ReturnType<typeof createMainMenuKeyboard>
    | ReturnType<typeof createPendingRewardKeyboard>
    | ReturnType<typeof createPartyKeyboard>
    | ReturnType<typeof createProfileKeyboard>
    | ReturnType<typeof createRuneDetailKeyboard>
    | ReturnType<typeof createRuneKeyboard>
    | ReturnType<typeof createSchoolMasteryKeyboard>
    | ReturnType<typeof createTutorialKeyboard>,
): SerializedButtonPayload[] => {
  const serialized = serializeKeyboard(keyboard);

  return [...serialized.rows.flat(), ...(serialized.currentRow ?? [])]
    .map((button) => JSON.parse(button.action.payload) as SerializedButtonPayload);
};

const collectLabels = (
  keyboard:
    | ReturnType<typeof createBattleKeyboard>
    | ReturnType<typeof createBattleResultKeyboard>
    | ReturnType<typeof createAltarKeyboard>
    | ReturnType<typeof createMainMenuKeyboard>
    | ReturnType<typeof createPendingRewardKeyboard>
    | ReturnType<typeof createPartyKeyboard>
    | ReturnType<typeof createRuneDetailKeyboard>
    | ReturnType<typeof createRuneKeyboard>
    | ReturnType<typeof createSchoolMasteryKeyboard>,
): string[] => {
  const serialized = serializeKeyboard(keyboard);

  return [...serialized.rows.flat(), ...(serialized.currentRow ?? [])].map((button) => button.action.label);
};

describe('profile keyboard', () => {
  it('lets party members return to an active joint battle from the party screen', () => {
    const party: PartyView = {
      id: 'party-1',
      inviteCode: 'ABC123',
      leaderPlayerId: 1,
      status: 'IN_BATTLE',
      activeBattleId: 'battle-1',
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
    };

    const payloads = collectPayloads(createPartyKeyboard(party, 2));

    expect(payloads).toContainEqual({ command: gameCommands.exploreParty });
    expect(payloads).not.toContainEqual({ command: gameCommands.leaveParty });
  });

  it('turns pending reward actions into ledger-scoped trophy buttons', () => {
    const keyboard = createPendingRewardKeyboard(createPendingReward());
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(labels).toContain('🔪 Свежевать');
    expect(labels).toEqual(expect.arrayContaining([
      '🔮 Руны',
      '⚔️ Исследовать',
      '🤝 Пати',
    ]));
    expect(labels).not.toContain('🎒 Забрать добычу');
    expect(payloads.find((payload) => payload.command === gameCommands.skinBeastReward)?.stateKey).toBe('battle-victory:battle-1');
    expect(payloads).toContainEqual({ command: gameCommands.runeCollection });
    expect(payloads).toContainEqual({ command: gameCommands.explore });
    expect(payloads).toContainEqual({ command: gameCommands.party });
    expect(payloads.find((payload) => payload.command === gameCommands.collectAllReward)).toBeUndefined();
    expect(serializeKeyboard(keyboard).isInline).toBe(true);
    expect(serializeKeyboard(createMainMenuKeyboard(createPlayer())).isInline).toBe(false);
  });

  it('keeps the safe trophy collection button when no unique trophy action exists', () => {
    const pendingReward = createPendingReward();
    const keyboard = createPendingRewardKeyboard({
      ...pendingReward,
      snapshot: {
        ...pendingReward.snapshot,
        trophyActions: pendingReward.snapshot.trophyActions.filter((action) => action.code === 'claim_all'),
      },
    });
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(labels).toContain('🎒 Забрать добычу');
    expect(payloads.find((payload) => payload.command === gameCommands.collectAllReward)?.stateKey).toBe('battle-victory:battle-1');
  });

  it('turns ember hidden trophy actions into ledger-scoped trophy buttons', () => {
    const pendingReward = createPendingReward();
    const keyboard = createPendingRewardKeyboard({
      ...pendingReward,
      snapshot: {
        ...pendingReward.snapshot,
        trophyActions: [
          {
            code: 'draw_ember_sign',
            label: '🔥 Вытянуть знак Пламени',
            skillCodes: ['gathering.essence_extraction'],
            visibleRewardFields: ['essence'],
          },
          ...pendingReward.snapshot.trophyActions,
        ],
      },
    });
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(gameCommands.drawEmberSignReward).toBe('вытянуть знак');
    expect(labels).toContain('🔥 Вытянуть знак Пламени');
    expect(payloads.find((payload) => payload.command === gameCommands.drawEmberSignReward)?.stateKey)
      .toBe('battle-victory:battle-1');
  });

  it('turns skill-threshold trophy actions into ledger-scoped trophy buttons', () => {
    const pendingReward = createPendingReward();
    const keyboard = createPendingRewardKeyboard({
      ...pendingReward,
      snapshot: {
        ...pendingReward.snapshot,
        trophyActions: [
          {
            code: 'careful_skinning',
            label: '🔪 Аккуратно снять шкуру',
            skillCodes: ['gathering.skinning'],
            visibleRewardFields: ['leather', 'bone'],
          },
          ...pendingReward.snapshot.trophyActions,
        ],
      },
    });
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(gameCommands.carefulSkinningReward).toBe('аккуратно снять');
    expect(labels).toContain('🔪 Аккуратно снять шкуру');
    expect(payloads.find((payload) => payload.command === gameCommands.carefulSkinningReward)?.stateKey)
      .toBe('battle-victory:battle-1');
  });

  it('turns expanded trophy progression actions into ledger-scoped buttons', () => {
    const pendingReward = createPendingReward();
    const keyboard = createPendingRewardKeyboard({
      ...pendingReward,
      snapshot: {
        ...pendingReward.snapshot,
        trophyActions: [
          {
            code: 'refine_slime_core',
            label: '🧪 Отделить чистый реагент',
            skillCodes: ['gathering.reagent_gathering'],
            visibleRewardFields: ['herb', 'essence'],
          },
          {
            code: 'salvage_armor',
            label: '⚒️ Разобрать доспех',
            skillCodes: ['gathering.reagent_gathering'],
            visibleRewardFields: ['metal', 'crystal', 'leather'],
          },
          {
            code: 'unmake_phylactery',
            label: '☠️ Рассеять филактерию',
            skillCodes: ['gathering.essence_extraction'],
            visibleRewardFields: ['essence', 'crystal'],
          },
        ],
      },
    });
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(labels).toContain('🧪 Отделить чистый реагент');
    expect(labels).toContain('⚒️ Разобрать доспех');
    expect(labels).toContain('☠️ Рассеять филактерию');
    expect(payloads.find((payload) => payload.command === gameCommands.refineSlimeCoreReward)?.stateKey)
      .toBe('battle-victory:battle-1');
    expect(payloads.find((payload) => payload.command === gameCommands.salvageArmorReward)?.stateKey)
      .toBe('battle-victory:battle-1');
    expect(payloads.find((payload) => payload.command === gameCommands.unmakePhylacteryReward)?.stateKey)
      .toBe('battle-victory:battle-1');
  });

  it('keeps profile keyboard focused on navigation and delete confirmation', () => {
    const payloads = collectPayloads(createProfileKeyboard(createPlayer()));

    const back = payloads.find((payload) => payload.command === 'назад');
    const deletePlayer = payloads.find((payload) => payload.command === 'удалить персонажа');

    expect(back?.intentId).toBeUndefined();
    expect(back?.stateKey).toBeUndefined();
    expect(payloads.find((payload) => payload.command === 'удалить персонажа')).toBeDefined();
    expect(deletePlayer?.intentId).toBeUndefined();
  });

  it('adds intent metadata to rune carousel and selected-rune actions', () => {
    const listPayloads = collectPayloads(createRuneKeyboard(createPlayer()));
    const detailPayloads = collectPayloads(createRuneDetailKeyboard(createPlayer()));

    const equip = detailPayloads.find((payload) => payload.command === 'надеть');
    const unequip = detailPayloads.find((payload) => payload.command === 'снять');
    const destroy = detailPayloads.find((payload) => payload.command === 'сломать');
    const nextPage = listPayloads.find((payload) => payload.command === 'руны >');
    const slotOne = listPayloads.find((payload) => payload.command === 'руна слот 1');

    expect(equip?.intentId).toEqual(expect.any(String));
    expect(equip?.stateKey).toEqual(expect.any(String));
    expect(unequip).toBeUndefined();
    expect(destroy?.intentId).toEqual(expect.any(String));
    expect(destroy?.stateKey).toEqual(expect.any(String));
    expect(nextPage?.intentId).toEqual(expect.any(String));
    expect(nextPage?.stateKey).toEqual(expect.any(String));
    expect(slotOne?.intentId).toEqual(expect.any(String));
    expect(slotOne?.stateKey).toEqual(expect.any(String));
  });

  it('does not emit partial intent envelopes on rune keyboard without player context', () => {
    const payloads = collectPayloads(createRuneDetailKeyboard());

    const craft = payloads.find((payload) => payload.command === 'создать');
    const destroy = payloads.find((payload) => payload.command === 'сломать');

    expect(craft?.intentId).toBeUndefined();
    expect(craft?.stateKey).toBeUndefined();
    expect(destroy).toBeUndefined();
  });

  it('shows equip actions for an un-equipped selected rune', () => {
    const labels = collectLabels(createRuneDetailKeyboard(createPlayer({
      runes: [
        {
          ...createPlayer().runes[0]!,
          isEquipped: false,
        },
      ],
    })));

    expect(labels).toContain('✅ Надеть');
    expect(labels).not.toContain('✅ Слот 1');
    expect(labels).not.toContain('✅ Слот 2');
    expect(labels).toContain('🗑️ Распылить');
    expect(labels.some((label) => label.startsWith('❌ Снять'))).toBe(false);
  });

  it('auto-equips into the second slot when the first slot is occupied', () => {
    const keyboard = createRuneDetailKeyboard(createPlayer({
      runes: [
        {
          ...createPlayer().runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Руна B',
          isEquipped: false,
        },
      ],
      currentRuneIndex: 1,
    }));
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(labels).toContain('✅ Надеть');
    expect(labels).not.toContain('🔁 Слот 1');
    expect(labels).not.toContain('✅ Слот 2');
    expect(labels).not.toContain('🧩 В поддержку');
    expect(payloads.find((payload) => payload.command === 'надеть')?.intentId).toEqual(expect.any(String));
    expect(payloads.find((payload) => payload.command === 'надеть')?.stateKey).toEqual(expect.any(String));
  });

  it('adds a dominant school-test CTA when the first sign is already equipped', () => {
    const player = createPlayer({
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0],
          rarity: 'UNUSUAL',
          name: 'Первый знак Пламени',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    });

    const mainMenuLabels = collectLabels(createMainMenuKeyboard(player));
    const runeLabels = collectLabels(createRuneKeyboard(player));
    const battleResultLabels = collectLabels(createBattleResultKeyboard(createBattle({ status: 'COMPLETED', result: 'VICTORY', rewards: { experience: 6, gold: 2, shards: { USUAL: 1 }, droppedRune: null } }), player));

    expect(mainMenuLabels).toContain('⚔️ Исследовать');
    expect(runeLabels).not.toContain('⚔️ Проверить школу');
    expect(battleResultLabels).toContain('⚔️ Исследовать');
    expect(battleResultLabels).not.toContain('⚔️ Проверить школу');
  });

  it('labels the explore CTA as a seal target after a rare school seal is equipped', () => {
    const player = createPlayer({
      victories: 6,
      schoolMasteries: [{ schoolCode: 'ember', experience: 4, rank: 1 }],
      runes: [
        {
          ...createPlayer().runes[0],
          rarity: 'RARE',
          name: 'Печать Пламени',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    });

    const mainMenuLabels = collectLabels(createMainMenuKeyboard(player));

    expect(mainMenuLabels).toContain('⚔️ Цель печати');
  });

  it('labels the main explore CTA as rest while anti-stall recovery is active', () => {
    const player = createPlayer({
      currentHealth: 2,
      currentMana: 1,
      runes: [
        {
          ...createPlayer().runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    });

    const mainMenuLabels = collectLabels(createMainMenuKeyboard(player));

    expect(mainMenuLabels).toContain('🌿 Передышка');
    expect(mainMenuLabels).not.toContain('⚔️ Цель печати');
  });

  it('keeps the optional daily trace available from the main menu', () => {
    const player = createPlayer();
    const labels = collectLabels(createMainMenuKeyboard(player));
    const payloads = collectPayloads(createMainMenuKeyboard(player));

    expect(labels).toContain('✨ След дня');
    expect(labels).toContain('🏠 Трактир');
    expect(payloads).toContainEqual({ command: gameCommands.dailyTrace });
    expect(payloads).toContainEqual({ command: gameCommands.runicTavern });
  });

  it('opens school mastery from the main navigation', () => {
    const mainLabels = collectLabels(createMainMenuKeyboard(createPlayer()));
    const mainPayloads = collectPayloads(createMainMenuKeyboard(createPlayer()));
    const masteryPayloads = collectPayloads(createSchoolMasteryKeyboard(createPlayer()));

    expect(mainLabels).toContain('📜 Мастерство');
    expect(mainPayloads).toContainEqual({ command: gameCommands.mastery });
    expect(masteryPayloads).toContainEqual({ command: gameCommands.backToMenu });
    expect(masteryPayloads).toContainEqual({ command: gameCommands.profile });
  });

  it('names the rune action hub as the altar in the main menu', () => {
    const labels = collectLabels(createMainMenuKeyboard(createPlayer()));
    const payloads = collectPayloads(createMainMenuKeyboard(createPlayer()));

    expect(labels).toContain('🕯 Алтарь');
    expect(labels).toContain('🛠 Мастерская');
    expect(payloads).toContainEqual({ command: gameCommands.altar });
    expect(payloads).toContainEqual({ command: gameCommands.workshop });
  });

  it('adds pill alchemy actions to the workshop without exceeding the VK row limit', () => {
    const player = createPlayer({
      inventory: {
        ...createPlayer().inventory,
        leather: 2,
        bone: 1,
        herb: 2,
        essence: 1,
      },
    });
    const keyboard = createWorkshopKeyboard({
      player,
      blueprints: [],
      repairTools: [],
      craftedItems: [],
      shopOffers: [],
    });
    const rows = serializeKeyboard(keyboard).rows;
    const payloads = collectPayloads(keyboard);
    const labels = collectLabels(keyboard);

    expect(rows.length).toBeLessThanOrEqual(6);
    expect(payloads.map((payload) => payload.command)).toEqual(expect.arrayContaining([
      gameCommands.craftVitalCharm,
      gameCommands.craftKeenEdge,
      gameCommands.craftGuardPlate,
      gameCommands.craftRuneFocus,
    ]));
    expect(payloads.find((payload) => payload.command === gameCommands.craftVitalCharm)?.stateKey)
      .toEqual(expect.any(String));
    expect(labels).toEqual(expect.arrayContaining([
      '✅ ❤️ Сварить',
      '🧩 🧠 Ясность',
      '🧩 🛡️ Стойкость',
      '✅ 💠 Фокус',
    ]));
  });

  it('binds workshop craft buttons to owned blueprint instances', () => {
    const blueprintInstance = createBlueprintInstance();
    const keyboard = createWorkshopKeyboard({
      player: createPlayer(),
      blueprints: [
        {
          blueprint: getWorkshopBlueprint('skinning_kit'),
          instance: blueprintInstance,
          ownedQuantity: 1,
          canCraft: true,
          dustCost: 4,
          missingDust: 0,
          missingCost: {},
          canAwakenFeature: false,
          featureAwakeningRadianceCost: 0,
          missingRadiance: 0,
        },
      ],
      repairTools: [],
      craftedItems: [],
      shopOffers: [],
    });
    const payloads = collectPayloads(keyboard);
    const labels = collectLabels(keyboard);

    expect(labels).toContain('⚒ Набор свежевателя · 4 пыли');
    expect(payloads).toContainEqual(expect.objectContaining({
      command: createWorkshopCraftCommand(blueprintInstance.id),
      intentId: expect.any(String),
      stateKey: expect.any(String),
    }));
    expect(payloads).not.toContainEqual(expect.objectContaining({
      command: createWorkshopCraftCommand(blueprintInstance.blueprintCode),
    }));
  });

  it('binds workshop awakening buttons to unique blueprint instances', () => {
    const blueprintInstance = createBlueprintInstance({
      rarity: 'RARE',
      discoveryKind: 'QUEST',
    });
    const keyboard = createWorkshopKeyboard({
      player: createPlayer({ radiance: 1 }),
      blueprints: [
        {
          blueprint: getWorkshopBlueprint('hunter_cleaver'),
          instance: {
            ...blueprintInstance,
            blueprintCode: 'hunter_cleaver',
          },
          ownedQuantity: 1,
          canCraft: true,
          dustCost: 8,
          missingDust: 0,
          missingCost: {},
          canAwakenFeature: true,
          featureAwakeningRadianceCost: 1,
          missingRadiance: 0,
        },
      ],
      repairTools: [],
      craftedItems: [],
      shopOffers: [],
    });
    const payloads = collectPayloads(keyboard);

    expect(payloads).toContainEqual(expect.objectContaining({
      command: createWorkshopAwakenCommand(blueprintInstance.id),
      intentId: expect.any(String),
      stateKey: expect.any(String),
    }));
  });

  it('binds workshop repair buttons to owned repair blueprint instances', () => {
    const repairBlueprintInstance = createBlueprintInstance({
      id: 'bp-repair-1',
      blueprintCode: 'resonance_tool',
      discoveryKind: 'REPAIR',
    });
    const keyboard = createWorkshopKeyboard({
      player: createPlayer(),
      blueprints: [],
      repairTools: [
        {
          blueprint: getWorkshopBlueprint('resonance_tool'),
          instance: repairBlueprintInstance,
          ownedQuantity: 1,
          available: true,
          missingCost: {},
        },
      ],
      craftedItems: [
        {
          item: {
            id: 'crafted-tool-1',
            playerId: 1,
            itemCode: 'skinning_kit',
            itemClass: 'UL',
            slot: 'tool',
            quality: 'STURDY',
            status: 'ACTIVE',
            equipped: false,
            durability: 5,
            maxDurability: 12,
            statBonus: {
              health: 0,
              attack: 0,
              defence: 0,
              magicDefence: 0,
              dexterity: 1,
              intelligence: 0,
            },
            createdAt: '2026-04-12T00:00:00.000Z',
            updatedAt: '2026-04-12T00:00:00.000Z',
          },
          equippable: true,
          repairable: true,
          availableRepairTools: [
            {
              blueprint: getWorkshopBlueprint('resonance_tool'),
              instance: repairBlueprintInstance,
              ownedQuantity: 1,
              available: true,
              missingCost: {},
            },
          ],
        },
      ],
      shopOffers: [],
    });
    const payloads = collectPayloads(keyboard);

    expect(payloads).toContainEqual(expect.objectContaining({
      command: createWorkshopRepairCommand('crafted-tool-1', repairBlueprintInstance.id),
      intentId: expect.any(String),
      stateKey: expect.any(String),
    }));
    expect(payloads).not.toContainEqual(expect.objectContaining({
      command: createWorkshopRepairCommand('crafted-tool-1', repairBlueprintInstance.blueprintCode),
    }));
  });

  it('binds workshop shop buttons to dust purchase offers', () => {
    const offer = getWorkshopShopOffer('healing_pill');
    const keyboard = createWorkshopKeyboard({
      player: createPlayer({ gold: 20 }),
      blueprints: [],
      repairTools: [],
      craftedItems: [],
      shopOffers: [
        {
          offer,
          canBuy: true,
          missingDust: 0,
        },
      ],
    });
    const payloads = collectPayloads(keyboard);

    expect(payloads).toContainEqual(expect.objectContaining({
      command: createWorkshopShopCommand(offer.code),
      intentId: expect.any(String),
      stateKey: expect.any(String),
    }));
  });

  it('keeps the workshop keyboard within the VK row limit when shop and consumables are visible', () => {
    const player = createPlayer({
      gold: 30,
      inventory: {
        ...createPlayer().inventory,
        leather: 2,
        bone: 1,
        herb: 2,
        essence: 1,
        healingPills: 1,
        focusPills: 1,
        guardPills: 1,
        clarityPills: 1,
      },
    });
    const keyboard = createWorkshopKeyboard({
      player,
      blueprints: [],
      repairTools: [],
      craftedItems: [],
      shopOffers: [
        {
          offer: getWorkshopShopOffer('healing_pill'),
          canBuy: true,
          missingDust: 0,
        },
        {
          offer: getWorkshopShopOffer('leather_bundle'),
          canBuy: true,
          missingDust: 0,
        },
      ],
    });
    const rows = serializeKeyboard(keyboard).rows;
    const payloads = collectPayloads(keyboard);

    expect(rows.length).toBeLessThanOrEqual(6);
    expect(payloads).toContainEqual(expect.objectContaining({
      command: createWorkshopShopCommand('healing_pill'),
    }));
    expect(payloads).toContainEqual(expect.objectContaining({
      command: createWorkshopShopCommand('leather_bundle'),
    }));
    expect(payloads).toContainEqual({ command: gameCommands.backToMenu });
  });

  it('keeps defeat battle-result CTA aligned with rune review instead of school-test retry', () => {
    const player = createPlayer({
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0],
          rarity: 'UNUSUAL',
          name: 'Первый знак Пламени',
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    });

    const battleResultLabels = collectLabels(createBattleResultKeyboard(createBattle({
      status: 'COMPLETED',
      result: 'DEFEAT',
      rewards: null,
    }), player));

    expect(battleResultLabels).toContain('🔮 Руны');
    expect(battleResultLabels).toContain('⚔️ Осторожно дальше');
    expect(battleResultLabels).not.toContain('⚔️ Проверить школу');
  });

  it('routes party victory battle-result CTA to joint exploration', () => {
    const player = createPlayer();
    const firstMember = createBattle().player;
    const secondMember = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const keyboard = createBattleResultKeyboard(createBattle({
      status: 'COMPLETED',
      result: 'VICTORY',
      battleType: 'PARTY_PVE',
      party: {
        id: 'party-1',
        inviteCode: 'ABC123',
        leaderPlayerId: 1,
        currentTurnPlayerId: null,
        enemyTargetPlayerId: null,
        actedPlayerIds: [1, 2],
        members: [
          { playerId: 1, vkId: 1001, name: firstMember.name, snapshot: firstMember },
          { playerId: 2, vkId: 1002, name: secondMember.name, snapshot: secondMember },
        ],
      },
      rewards: {
        experience: 6,
        gold: 2,
        shards: { USUAL: 1 },
        droppedRune: null,
      },
    }), player);
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    const jointExplore = payloads.find((payload) => payload.command === gameCommands.exploreParty);

    expect(labels).toContain('⚔️ Исследовать вместе');
    expect(jointExplore).toBeDefined();
    expect(jointExplore?.intentId).toBeUndefined();
    expect(jointExplore?.stateKey).toBeUndefined();
    expect(payloads.find((payload) => payload.command === gameCommands.explore)).toBeUndefined();
  });

  it('keeps victory result navigation obvious for loot, runes, exploration and party', () => {
    const player = createPlayer();
    const keyboard = createBattleResultKeyboard(createBattle({
      status: 'COMPLETED',
      result: 'VICTORY',
      rewards: {
        experience: 6,
        gold: 2,
        shards: { USUAL: 1 },
        droppedRune: null,
      },
    }), player);
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(labels).toEqual(expect.arrayContaining([
      '🎒 Добыча',
      '🔮 Руны',
      '⚔️ Исследовать',
      '🤝 Пати',
    ]));
    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({ command: gameCommands.pendingReward }),
      expect.objectContaining({ command: gameCommands.runeCollection }),
      expect.objectContaining({ command: gameCommands.party }),
    ]));
    expect(payloads.find((payload) => payload.command === gameCommands.explore)?.stateKey)
      .toEqual(expect.any(String));
  });

  it('allows removing slot 1 even when slot 2 is filled', () => {
    const labels = collectLabels(createRuneDetailKeyboard(createPlayer({
      unlockedRuneSlotCount: 2,
      runes: [
        {
          ...createPlayer().runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Руна B',
          isEquipped: true,
          equippedSlot: 1,
        },
      ],
      currentRuneIndex: 0,
    })));

    expect(labels).toContain('❌ Снять со слота 1');
    expect(labels).not.toContain('🧩 В поддержку');
  });

  it('offers one automatic replacement action when all baseline slots are filled', () => {
    const labels = collectLabels(createRuneDetailKeyboard(createPlayer({
      unlockedRuneSlotCount: 2,
      runes: [
        {
          ...createPlayer().runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Руна B',
          isEquipped: true,
          equippedSlot: 1,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-3',
          runeCode: 'rune-3',
          name: 'Руна C',
          isEquipped: false,
        },
      ],
      currentRuneIndex: 2,
    })));

    expect(labels).toContain('🔁 Заменить');
    expect(labels).not.toContain('🔁 Слот 1');
    expect(labels).not.toContain('🔁 Слот 2');
    expect(labels).not.toContain('❌ Снять со слота 1');
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
    const battleResultExplore = battleResultPayloads.find((payload) => payload.command === 'исследовать');

    expect(location?.intentId).toEqual(expect.any(String));
    expect(location?.stateKey).toEqual(expect.any(String));
    expect(mainExplore?.intentId).toEqual(expect.any(String));
    expect(mainExplore?.stateKey).toEqual(expect.any(String));
    expect(battleResultExplore?.intentId).toEqual(expect.any(String));
    expect(battleResultExplore?.stateKey).toEqual(expect.any(String));
  });

  it('adds intent metadata to battle action buttons', () => {
    const payloads = collectPayloads(createBattleKeyboard(createBattle()));

    const attack = payloads.find((payload) => payload.command === 'атака');
    const defend = payloads.find((payload) => payload.command === 'защита');
    const skill = payloads.find((payload) => payload.command === 'навык 1');

    expect(attack?.intentId).toEqual(expect.any(String));
    expect(attack?.stateKey).toEqual(expect.any(String));
    expect(defend?.intentId).toEqual(expect.any(String));
    expect(defend?.stateKey).toEqual(expect.any(String));
    expect(skill?.intentId).toEqual(expect.any(String));
    expect(skill?.stateKey).toEqual(expect.any(String));
  });

  it('adds available consumables to the battle keyboard', () => {
    const player = createPlayer({
      inventory: {
        ...createPlayer().inventory,
        healingPills: 2,
        focusPills: 1,
      },
    });
    const keyboard = createBattleKeyboard(createBattle(), player);
    const labels = collectLabels(keyboard);
    const payloads = collectPayloads(keyboard);

    expect(labels).toEqual(expect.arrayContaining([
      '❤️ Пилюля x2',
      '💠 Фокус x1',
    ]));
    expect(payloads.find((payload) => payload.command === gameCommands.useHealingPill)?.stateKey)
      .toEqual(expect.any(String));
    expect(payloads.find((payload) => payload.command === gameCommands.useFocusPill)?.stateKey)
      .toEqual(expect.any(String));
  });

  it('shows only engage and flee actions while an encounter is still offered', () => {
    const battle = createBattle({
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 52,
      },
    });
    const labels = collectLabels(createBattleKeyboard(battle));
    const payloads = collectPayloads(createBattleKeyboard(battle));

    expect(labels).toEqual(['⚔️ В бой', '💨 Отступить (52%)']);
    expect(payloads.map((payload) => payload.command)).toEqual([
      gameCommands.engageBattle,
      gameCommands.fleeBattle,
    ]);
    expect(payloads.every((payload) => typeof payload.intentId === 'string')).toBe(true);
    expect(payloads.every((payload) => typeof payload.stateKey === 'string')).toBe(true);
  });

  it('keeps battle action labels aligned with the battle state block', () => {
    const labels = collectLabels(createBattleKeyboard(createBattle()));

    expect(labels).toContain('⚔️ Атака');
    expect(labels).toContain('🛡️ Защита (+2 щит)');
    expect(labels).toContain('🌀 1 Пульс Пламени · 3 маны');
  });

  it('shows the larger defend payoff when heavy strike is revealed', () => {
    const labels = collectLabels(createBattleKeyboard(createBattle({
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее.',
          bonusAttack: 2,
        },
      },
    })));

    expect(labels).toContain('🛡️ Защита (+4 щит)');
  });

  it('shows rune skill availability directly on the battle keyboard', () => {
    const cooldownLabels = collectLabels(createBattleKeyboard(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          activeAbility: {
            ...createBattle().player.runeLoadout!.activeAbility!,
            currentCooldown: 2,
          },
        },
      },
    })));
    const lowManaLabels = collectLabels(createBattleKeyboard(createBattle({
      player: {
        ...createBattle().player,
        currentMana: 1,
      },
    })));

    expect(cooldownLabels).toContain('🌀 1 Пульс Пламени · КД 2 · 3 маны');
    expect(lowManaLabels).toContain('🌀 1 Пульс Пламени · мана 1/3');
  });

  it('shows that a rune action is not available on the enemy turn', () => {
    const labels = collectLabels(createBattleKeyboard(createBattle({
      turnOwner: 'ENEMY',
    })));

    expect(labels).toContain('🌀 1 Пульс Пламени · ход врага · 3 маны');
  });

  it('does not show a dead rune action button without an active rune skill', () => {
    const labels = collectLabels(createBattleKeyboard(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          activeAbility: null,
        },
      },
    })));

    expect(labels).not.toContain('🔮 Рунное действие');
    expect(labels.some((label) => label.startsWith('🌀'))).toBe(false);
  });
});
