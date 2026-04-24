import { describe, expect, it, vi } from 'vitest';

import { createAppServices, type AppServices } from '../../app/composition-root';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../modules/shared/application/ports/GameTelemetry';
import { AppError } from '../../shared/domain/AppError';
import {
  createTestBattle,
  createTestBattleEnemySnapshot,
  createTestBattlePlayerSnapshot,
  createTestInventory,
  createTestPlayer,
} from '../../shared/testing/game-factories';
import type { BattleView, PlayerState } from '../../shared/types/game';
import {
  createBestiaryEnemyCommand,
  createBestiaryEnemyRewardCommand,
  createBestiaryLocationCommand,
  createBestiaryLocationRewardCommand,
  createWorkshopCraftCommand,
  createWorkshopRepairCommand,
  gameCommands,
} from '../commands/catalog';
import { createRuneKeyboard } from '../keyboards';
import { GameHandler } from './gameHandler';

interface ReplyCall {
  readonly message: string;
  readonly keyboard: unknown;
}

interface DirectMessageCall {
  readonly userId: number | null;
  readonly message: string;
  readonly keyboard: unknown;
}

interface SerializedKeyboard {
  readonly isInline: boolean;
  readonly rows: unknown[];
  readonly currentRow?: unknown[];
}

interface FakeContextInput {
  readonly senderId?: number;
  readonly peerId?: number;
  readonly id?: number;
  readonly conversationMessageId?: number;
  readonly text?: string;
  readonly command?: string;
  readonly intentId?: string;
  readonly stateKey?: string;
}

type ReplyMock = ReturnType<typeof vi.fn>;
type SendMessageMock = ReturnType<typeof vi.fn>;

interface FakeContext {
  readonly senderId: number;
  readonly peerId: number;
  readonly id: number;
  readonly conversationMessageId: number;
  readonly text: string;
  readonly messagePayload: { command?: string; intentId?: string; stateKey?: string } | null;
  readonly reply: ReplyMock;
  readonly api: {
    readonly messages: {
      readonly send: SendMessageMock;
    };
  };
}

const createFakeContext = (input: FakeContextInput): FakeContext => {
  const reply = vi.fn().mockResolvedValue(undefined);
  const send = vi.fn().mockResolvedValue(1);

  return {
    senderId: input.senderId ?? 1001,
    peerId: input.peerId ?? 2000000001,
    id: input.id ?? 501,
    conversationMessageId: input.conversationMessageId ?? 77,
    text: input.text ?? '',
    messagePayload: input.command
      ? {
          command: input.command,
          ...(input.intentId ? { intentId: input.intentId } : {}),
          ...(input.stateKey ? { stateKey: input.stateKey } : {}),
        }
      : null,
    reply,
    api: {
      messages: {
        send,
      },
    },
  };
};

const getReplyCalls = (ctx: FakeContext): ReplyCall[] => (
  ctx.reply.mock.calls.map(([message, options]) => ({
    message,
    keyboard: options?.keyboard ?? null,
  }))
);

const getDirectMessageCalls = (ctx: FakeContext): DirectMessageCall[] => (
  ctx.api.messages.send.mock.calls.map(([options]) => ({
    userId: typeof options?.user_id === 'number' ? options.user_id : null,
    message: typeof options?.message === 'string' ? options.message : '',
    keyboard: options?.keyboard ?? null,
  }))
);

const serializeKeyboard = (keyboard: unknown): SerializedKeyboard => (
  JSON.parse(JSON.stringify(keyboard)) as SerializedKeyboard
);

const countKeyboardButtons = (keyboard: unknown): number => {
  const serialized = serializeKeyboard(keyboard);
  const rowButtonCount = serialized.rows.reduce((total, row) => total + row.length, 0);
  return rowButtonCount + (serialized.currentRow?.length ?? 0);
};

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => createTestPlayer({
  inventory: createTestInventory({
    usualShards: 25,
    unusualShards: 10,
    rareShards: 3,
  }),
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => createTestBattle({
  player: createTestBattlePlayerSnapshot({ name: 'Рунный мастер #1001' }),
  enemy: createTestBattleEnemySnapshot({
    name: 'Учебный огонёк',
    attackText: 'касается искрой',
    lootTable: undefined,
  }),
  log: ['🗺️ Порог Инициации: на вас выходит обычный враг Учебный огонёк.'],
  ...overrides,
});

const createPartyBattle = (overrides: Partial<BattleView> = {}): BattleView => {
  const leader = createBattle().player;
  const ally = {
    ...createBattle().player,
    playerId: 2,
    name: 'Рунный мастер #1002',
  };

  return createBattle({
    battleType: 'PARTY_PVE',
    status: 'ACTIVE',
    result: null,
    rewards: null,
    turnOwner: 'PLAYER',
    player: leader,
    party: {
      id: 'party-1',
      inviteCode: 'ABC123',
      leaderPlayerId: 1,
      currentTurnPlayerId: 1,
      enemyTargetPlayerId: null,
      actedPlayerIds: [],
      members: [
        { playerId: 1, vkId: 1001, name: leader.name, snapshot: leader },
        { playerId: 2, vkId: 1002, name: ally.name, snapshot: ally },
      ],
    },
    ...overrides,
  });
};

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
        reward: {
          inventoryDelta: { leather: 2, bone: 1 },
          skillPoints: [{ skillCode: 'gathering.skinning', points: 1 }],
        },
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
        reward: {
          inventoryDelta: { leather: 2, bone: 1 },
          skillPoints: [],
        },
      },
    ],
    selectedActionCode: null,
    appliedResult: null,
    createdAt: '2026-04-22T00:00:00.000Z',
  },
});

const createServices = (): AppServices => {
  const basePlayer = createPlayer();
  const tutorialPlayer = createPlayer({ locationLevel: 0, tutorialState: 'ACTIVE' });
  const adventurePlayer = createPlayer({ locationLevel: 1, tutorialState: 'SKIPPED' });
  const runePlayer = createPlayer({
    tutorialState: 'SKIPPED',
    locationLevel: 1,
    runes: [
      {
        id: 'rune-1',
        runeCode: 'rune-1',
        archetypeCode: 'ember',
        passiveAbilityCodes: ['ember_heart'],
        activeAbilityCodes: ['ember_pulse'],
        name: 'Эпическая руна Пламени',
        rarity: 'EPIC',
        isEquipped: false,
        health: 5,
        attack: 9,
        defence: 1,
        magicDefence: 0,
        dexterity: 2,
        intelligence: 1,
        createdAt: '2026-04-12T00:00:00.000Z',
      },
    ],
    inventory: {
      ...basePlayer.inventory,
      epicShards: 12,
    },
  });
  const completedBattle = createBattle({
    status: 'COMPLETED',
    result: 'VICTORY',
    rewards: {
      experience: 6,
      gold: 2,
      shards: { USUAL: 2 },
      droppedRune: null,
    },
    enemy: {
      ...createBattle().enemy,
      currentHealth: 0,
    },
    log: [
      '🏆 Победа! Награда: 6 опыта, 2 пыли, обычных осколков: 2.',
      '⚔️ [Рунный мастер #1001] наносит 6 урона [Учебный огонёк].',
    ],
  });
  const readyQuest = {
    code: 'awakening_empty_master',
    icon: '🌑',
    title: 'Пробуждение Пустого мастера',
    story: 'Мир ещё не знает твоего имени, но первый бой заставляет землю запомнить шаг.',
    objective: 'Выстоять в первой схватке.',
    reward: { gold: 5, inventoryDelta: { usualShards: 1 } },
    progress: { current: 1, required: 1, completed: true },
    status: 'READY_TO_CLAIM',
  } as const;
  const questBook = {
    player: basePlayer,
    quests: [readyQuest],
    readyToClaimCount: 1,
    inProgressCount: 0,
    claimedCount: 0,
  };
  const bestiary = {
    pageNumber: 1,
    totalPages: 1,
    totalLocations: 1,
    locations: [
      {
        biome: {
          id: 1,
          code: 'initium',
          name: 'Порог Инициации',
          description: 'Нулевая зона.',
          minLevel: 0,
          maxLevel: 0,
        },
        isUnlocked: true,
        unlockLocationLevel: 0,
        discoveryReward: {
          reward: { radiance: 1 },
          isClaimed: true,
          claimedNow: true,
        },
        discoveredEnemyCount: 1,
        revealedDropCount: 0,
        totalEnemyCount: 1,
      },
    ],
  };
  const bestiaryLocation = {
    location: bestiary.locations[0],
    locationPageNumber: 1,
    enemyPageNumber: 1,
    totalEnemyPages: 1,
    totalEnemies: 1,
    enemies: [
      {
        isDiscovered: true,
        isDropRevealed: false,
        tacticalProfile: {
          code: 'BASIC_PRESSURE',
          habitLine: 'держит простой натиск',
          answerLine: 'сбейте темп атакой',
        },
        victoryCount: 1,
        killMilestones: [
          { threshold: 1, reward: { radiance: 1 }, isCompleted: true, isClaimed: true, claimedNow: true },
          { threshold: 5, reward: { radiance: 1 }, isCompleted: false, isClaimed: false, claimedNow: false },
        ],
        template: {
          code: 'training-wisp',
          biomeCode: 'initium',
          name: 'Учебный огонёк',
          kind: 'spirit',
          isElite: false,
          isBoss: false,
          baseStats: {
            health: 8,
            attack: 1,
            defence: 0,
            magicDefence: 0,
            dexterity: 2,
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
          runeDropChance: 10,
          lootTable: { essence: 1 },
          attackText: 'касается искрой',
        },
      },
    ],
  };
  const bestiaryEnemy = {
    location: bestiary.locations[0],
    locationPageNumber: 1,
    enemyPageNumber: 1,
    enemyIndex: 0,
    totalEnemies: 1,
    enemy: bestiaryLocation.enemies[0],
  };
  const workshopView = {
    player: basePlayer,
    blueprints: [],
    repairTools: [],
    craftedItems: [],
  };
  const partyView = {
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
  };

  return {
    telemetry: {
      onboardingStarted: vi.fn().mockResolvedValue(undefined),
      tutorialPathChosen: vi.fn().mockResolvedValue(undefined),
      loadoutChanged: vi.fn().mockResolvedValue(undefined),
      schoolNoviceEliteEncounterStarted: vi.fn().mockResolvedValue(undefined),
      firstSchoolPresented: vi.fn().mockResolvedValue(undefined),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
      returnRecapShown: vi.fn().mockResolvedValue(undefined),
      postSessionNextGoalShown: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry,
    recoverPendingRewardsOnStart: {
      execute: vi.fn().mockResolvedValue({
        scanned: 0,
        recovered: 0,
        skipped: 0,
      }),
    } as unknown as AppServices['recoverPendingRewardsOnStart'],
    getPendingReward: {
      execute: vi.fn().mockResolvedValue({
        player: basePlayer,
        pendingReward: null,
      }),
    } as unknown as AppServices['getPendingReward'],
    collectPendingReward: {
      execute: vi.fn(),
    } as unknown as AppServices['collectPendingReward'],
    registerPlayer: {
      execute: vi.fn().mockResolvedValue({
        player: tutorialPlayer,
        created: true,
      }),
    } as unknown as AppServices['registerPlayer'],
    deletePlayer: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as AppServices['deletePlayer'],
    getPlayerProfile: {
      execute: vi.fn().mockResolvedValue(basePlayer),
    } as unknown as AppServices['getPlayerProfile'],
    getParty: {
      execute: vi.fn().mockResolvedValue({
        player: basePlayer,
        party: partyView,
      }),
    } as unknown as AppServices['getParty'],
    createParty: {
      execute: vi.fn().mockResolvedValue({
        player: basePlayer,
        party: partyView,
      }),
    } as unknown as AppServices['createParty'],
    joinParty: {
      execute: vi.fn().mockResolvedValue({
        player: createPlayer({ vkId: 1002, playerId: 2 }),
        party: partyView,
      }),
    } as unknown as AppServices['joinParty'],
    leaveParty: {
      execute: vi.fn().mockResolvedValue({
        player: createPlayer({ vkId: 1002, playerId: 2 }),
        party: null,
      }),
    } as unknown as AppServices['leaveParty'],
    disbandParty: {
      execute: vi.fn().mockResolvedValue({
        player: basePlayer,
        party: null,
      }),
    } as unknown as AppServices['disbandParty'],
    exploreParty: {
      execute: vi.fn().mockResolvedValue(createPartyBattle()),
    } as unknown as AppServices['exploreParty'],
    getQuestBook: {
      execute: vi.fn().mockResolvedValue(questBook),
    } as unknown as AppServices['getQuestBook'],
    getBestiary: {
      execute: vi.fn().mockResolvedValue(bestiary),
      executeLocation: vi.fn().mockResolvedValue(bestiaryLocation),
      executeEnemy: vi.fn().mockResolvedValue(bestiaryEnemy),
      claimLocationReward: vi.fn().mockResolvedValue(bestiaryLocation),
      claimEnemyReward: vi.fn().mockResolvedValue(bestiaryEnemy),
    } as unknown as AppServices['getBestiary'],
    claimQuestReward: {
      execute: vi.fn().mockResolvedValue({
        book: {
          ...questBook,
          readyToClaimCount: 0,
          claimedCount: 1,
          quests: [{ ...readyQuest, status: 'CLAIMED' }],
        },
        quest: { ...readyQuest, status: 'CLAIMED' },
        claimedNow: true,
      }),
    } as unknown as AppServices['claimQuestReward'],
    claimDailyTrace: {
      execute: vi.fn().mockResolvedValue({
        player: basePlayer,
        claimedNow: true,
        trace: {
          activityCode: 'soft_daily_trace',
          gameDay: '2026-04-23',
          title: 'Заметка на старой карте',
          description: 'На полях карты проступает тихая пометка.',
          reward: { gold: 6, inventoryDelta: { usualShards: 1, leather: 1 } },
        },
      }),
    } as unknown as AppServices['claimDailyTrace'],
    enterTutorialMode: {
      execute: vi.fn().mockResolvedValue(tutorialPlayer),
    } as unknown as AppServices['enterTutorialMode'],
    returnToAdventure: {
      execute: vi.fn().mockResolvedValue(adventurePlayer),
    } as unknown as AppServices['returnToAdventure'],
    skipTutorial: {
      execute: vi.fn().mockResolvedValue(adventurePlayer),
    } as unknown as AppServices['skipTutorial'],
    exploreLocation: {
      execute: vi.fn().mockResolvedValue(createBattle()),
    } as unknown as AppServices['exploreLocation'],
    getActiveBattle: {
      execute: vi.fn().mockResolvedValue(createBattle()),
    } as unknown as AppServices['getActiveBattle'],
    performBattleAction: {
      execute: vi.fn().mockResolvedValue({
        battle: completedBattle,
        player: null,
        acquisitionSummary: null,
      }),
    } as unknown as AppServices['performBattleAction'],
    getRuneCollection: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['getRuneCollection'],
    moveRuneCursor: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['moveRuneCursor'],
    selectRunePageSlot: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['selectRunePageSlot'],
    equipCurrentRune: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['equipCurrentRune'],
    unequipCurrentRune: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['unequipCurrentRune'],
    craftItem: {
      execute: vi.fn().mockResolvedValue({
        player: runePlayer,
        acquisitionSummary: null,
      }),
    } as unknown as AppServices['craftItem'],
    useConsumable: {
      execute: vi.fn().mockResolvedValue({
        player: basePlayer,
        acquisitionSummary: null,
      }),
    } as unknown as AppServices['useConsumable'],
    craftRune: {
      execute: vi.fn().mockResolvedValue({
        player: runePlayer,
        acquisitionSummary: null,
      }),
    } as unknown as AppServices['craftRune'],
    rerollCurrentRuneStat: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['rerollCurrentRuneStat'],
    destroyCurrentRune: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['destroyCurrentRune'],
    getWorkshop: {
      execute: vi.fn().mockResolvedValue(workshopView),
    } as unknown as AppServices['getWorkshop'],
    craftWorkshopItem: {
      execute: vi.fn().mockResolvedValue({
        view: workshopView,
        craftedItem: {
          id: 'crafted-test-1',
          playerId: basePlayer.playerId,
          itemCode: 'skinning_kit',
          itemClass: 'UL',
          slot: 'tool',
          status: 'ACTIVE',
          equipped: false,
          durability: 12,
          maxDurability: 12,
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
        acquisitionSummary: {
          kind: 'crafted_workshop_item',
          blueprintCode: 'skinning_kit',
          itemId: 'crafted-test-1',
          title: 'Предмет создан',
          changeLine: 'Создан предмет мастерской.',
        },
        message: 'Создан предмет мастерской.',
      }),
    } as unknown as AppServices['craftWorkshopItem'],
    repairWorkshopItem: {
      execute: vi.fn().mockResolvedValue({
        view: workshopView,
        repairedItem: {
          id: 'crafted-test-1',
          playerId: basePlayer.playerId,
          itemCode: 'skinning_kit',
          itemClass: 'UL',
          slot: 'tool',
          status: 'ACTIVE',
          equipped: false,
          durability: 12,
          maxDurability: 12,
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
        acquisitionSummary: {
          kind: 'repaired_workshop_item',
          repairBlueprintCode: 'resonance_tool',
          itemId: 'crafted-test-1',
          title: 'Предмет отремонтирован',
          changeLine: 'Предмет восстановлен.',
        },
        message: 'Предмет восстановлен.',
      }),
    } as unknown as AppServices['repairWorkshopItem'],
    equipWorkshopItem: {
      execute: vi.fn().mockResolvedValue({
        view: workshopView,
        equippedItem: {
          id: 'crafted-test-1',
          playerId: basePlayer.playerId,
          itemCode: 'skinning_kit',
          itemClass: 'UL',
          slot: 'tool',
          status: 'ACTIVE',
          equipped: true,
          durability: 12,
          maxDurability: 12,
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
        acquisitionSummary: {
          kind: 'equipped_workshop_item',
          itemId: 'crafted-test-1',
          title: 'Предмет экипирован',
          changeLine: 'Предмет надет.',
        },
        message: 'Предмет надет.',
      }),
    } as unknown as AppServices['equipWorkshopItem'],
    unequipWorkshopItem: {
      execute: vi.fn().mockResolvedValue({
        view: workshopView,
        unequippedItem: {
          id: 'crafted-test-1',
          playerId: basePlayer.playerId,
          itemCode: 'skinning_kit',
          itemClass: 'UL',
          slot: 'tool',
          status: 'ACTIVE',
          equipped: false,
          durability: 12,
          maxDurability: 12,
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
        acquisitionSummary: {
          kind: 'unequipped_workshop_item',
          itemId: 'crafted-test-1',
          title: 'Предмет снят',
          changeLine: 'Предмет снят.',
        },
        message: 'Предмет снят.',
      }),
    } as unknown as AppServices['unequipWorkshopItem'],
  };
};

describe('GameHandler smoke', () => {
  it('проходит стартовый сценарий регистрации игрока', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'начать' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);

    expect(services.registerPlayer.execute).toHaveBeenCalledWith(1001);
    expect(replies[0]?.message).toContain('🎮 Runemasters Return');
    expect(replies[0]?.message).toContain('Учебный огонёк');
    expect(replies[0]?.message).toContain('Маршрут: удар -> первая руна -> школа -> стиль боя.');
  });

  it('показывает return recap для уже существующего игрока по команде start', async () => {
    const services = createServices();
    vi.mocked(services.registerPlayer.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      created: false,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'начать' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('🧭 Возвращение');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Дальше: «⚔️ Исследовать»');
    expect(services.telemetry.returnRecapShown).toHaveBeenCalledWith(1, expect.objectContaining({
      entrySurface: 'start_existing',
      nextStepType: 'get_first_rune',
    }));
  });

  it('возвращает существующего игрока к несобранной добыче по команде start', async () => {
    const services = createServices();
    const pendingReward = createPendingReward();
    vi.mocked(services.registerPlayer.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      created: false,
    });
    vi.mocked(services.getPendingReward.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      pendingReward,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'начать' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    const keyboardClear = serializeKeyboard(replies[0]?.keyboard);

    expect(keyboardClear.isInline).toBe(false);
    expect(keyboardClear.rows).toEqual([]);
    expect(replies[1]?.message).toContain('🏁 Трофеи победы');
    expect(replies[1]?.message).toContain('Лесной волк повержен');
    expect(services.telemetry.returnRecapShown).not.toHaveBeenCalled();
  });

  it('открывает книгу путей отдельной кнопкой', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'книга путей' });

    await handler.handle(ctx as never);

    const message = getReplyCalls(ctx)[0]?.message ?? '';
    expect(services.getQuestBook.execute).toHaveBeenCalledWith(1001);
    expect(message).toContain('📜 Книга путей');
    expect(message).toContain('📌 🎁 1');
    expect(message).toContain('Пробуждение Пустого мастера');
  });

  it('открывает бестиарий отдельной кнопкой', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'бестиарий' });

    await handler.handle(ctx as never);

    const message = getReplyCalls(ctx)[0]?.message ?? '';
    expect(services.getBestiary.execute).toHaveBeenCalledWith(1001, 1);
    expect(message).toContain('📖 Бестиарий');
    expect(message).toContain('Порог Инициации');
    expect(message).toContain('🏁 +1 сияния');
    expect(message).not.toContain('Учебный огонёк');
  });

  it('перелистывает бестиарий через payload страницы', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'бестиарий страница 2' });

    await handler.handle(ctx as never);

    expect(services.getBestiary.execute).toHaveBeenCalledWith(1001, 2);
    expect(getReplyCalls(ctx)[0]?.message).toContain('📖 Бестиарий');
  });

  it('открывает мобов выбранной локации бестиария', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: createBestiaryLocationCommand('initium') });

    await handler.handle(ctx as never);

    const message = getReplyCalls(ctx)[0]?.message ?? '';
    expect(services.getBestiary.executeLocation).toHaveBeenCalledWith(1001, 'initium', 1);
    expect(message).toContain('Учебный огонёк');
    expect(message).toContain('🏆 1');
  });

  it('открывает карточку моба бестиария через payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: createBestiaryEnemyCommand('initium', 'training-wisp') });

    await handler.handle(ctx as never);

    const message = getReplyCalls(ctx)[0]?.message ?? '';
    expect(services.getBestiary.executeEnemy).toHaveBeenCalledWith(1001, 'initium', 'training-wisp');
    expect(message).toContain('🐾 1/1');
    expect(message).toContain('Учебный огонёк');
  });

  it('собирает награду бестиария через динамическую кнопку', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const locationCtx = createFakeContext({ command: createBestiaryLocationRewardCommand('initium') });
    const enemyCtx = createFakeContext({ command: createBestiaryEnemyRewardCommand('initium', 'training-wisp') });

    await handler.handle(locationCtx as never);
    await handler.handle(enemyCtx as never);

    expect(services.getBestiary.claimLocationReward).toHaveBeenCalledWith(1001, 'initium');
    expect(services.getBestiary.claimEnemyReward).toHaveBeenCalledWith(1001, 'initium', 'training-wisp');
  });

  it('показывает отдельный экран мастерства школы', async () => {
    const services = createServices();
    vi.mocked(services.getPlayerProfile.execute).mockResolvedValueOnce(createPlayer({
      tutorialState: 'SKIPPED',
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      runes: [{
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
      }],
    }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: gameCommands.mastery });

    await handler.handle(ctx as never);

    const message = getReplyCalls(ctx)[0]?.message ?? '';
    expect(services.getPlayerProfile.execute).toHaveBeenCalledWith(1001);
    expect(message).toContain('📜 Мастерство');
    expect(message).toContain('Пламя · в фокусе');
    expect(message).toContain('Разогрев дожима');
  });

  it('открывает мастерскую отдельной кнопкой', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'мастерская' });

    await handler.handle(ctx as never);

    expect(services.getWorkshop.execute).toHaveBeenCalledWith(1001);
    expect(getReplyCalls(ctx)[0]?.message).toContain('Мастерская');
  });

  it('забирает награду квеста из inline-кнопки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      command: 'забрать награду',
      stateKey: 'awakening_empty_master',
    });

    await handler.handle(ctx as never);

    const message = getReplyCalls(ctx)[0]?.message ?? '';
    expect(services.claimQuestReward.execute).toHaveBeenCalledWith(1001, 'awakening_empty_master');
    expect(message).toContain('📜 Запись закрыта');
    expect(message).toContain('В сумке: +5 пыли · +1 обычный осколок.');
  });

  it('передает legacy text intent для текстового получения награды квеста', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      text: 'забрать награду',
      id: 519,
      conversationMessageId: 95,
      peerId: 2000000001,
    });

    await handler.handle(ctx as never);

    expect(services.claimQuestReward.execute).toHaveBeenCalledWith(1001, {
      intentId: 'legacy-text:2000000001:1001:95:забрать награду',
      intentSource: 'legacy_text',
    });
  });

  it('оставляет tutorial keyboard для вернувшегося игрока с активным обучением', async () => {
    const services = createServices();
    vi.mocked(services.registerPlayer.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 }),
      created: false,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'начать' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('🧭 Возвращение');
    expect(replies[0]?.message).toContain('Дальше: «⚔️ Учебный бой»');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Учебный бой');
    expect(services.telemetry.returnRecapShown).toHaveBeenCalledWith(1, expect.objectContaining({
      entrySurface: 'start_existing',
      nextStepType: 'complete_tutorial_battle',
    }));
  });

  it('логирует открытие рун как follow-up после первого school trial, если знак ещё не надет', async () => {
    const services = createServices();
    vi.mocked(services.getRuneCollection.execute).mockResolvedValueOnce(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
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
        {
          id: 'rune-2',
          runeCode: 'rune-2',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
          health: 2,
          attack: 3,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна' });

    await handler.handle(ctx as never);

    expect(services.telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(1, {
      schoolCode: 'ember',
      currentGoalType: 'equip_school_sign',
      actionType: 'open_runes',
      signEquipped: false,
      usedSchoolSign: false,
      battleId: null,
      enemyCode: null,
    });
  });

  it('логирует показ post-session next goal после завершённого боя', async () => {
    const services = createServices();
    vi.mocked(services.getPlayerProfile.execute).mockResolvedValueOnce(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
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
    }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака' });

    await handler.handle(ctx as never);

    expect(services.telemetry.postSessionNextGoalShown).toHaveBeenCalledWith(1, expect.objectContaining({
      battleOutcome: 'VICTORY',
      suggestedGoalType: 'hunt_school_elite',
      enemyCode: 'training-wisp',
      isSchoolNoviceElite: false,
    }));
  });

  it('логирует post-session goal и при переходе победы в pending trophy card', async () => {
    const services = createServices();
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          id: 'rune-ember-usual',
          runeCode: 'rune-ember-usual',
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
        {
          id: 'rune-ember-unusual',
          runeCode: 'rune-ember-unusual',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Первый знак Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
          health: 2,
          attack: 3,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: createBattle({
        id: 'battle-school-pending-1',
        status: 'COMPLETED',
        result: 'VICTORY',
        locationLevel: 3,
        player: {
          ...createBattle().player,
          runeLoadout: {
            runeId: 'rune-ember-usual',
            runeName: 'Обычная руна Пламени',
            runeRarity: 'USUAL',
            schoolProgressStage: null,
            archetypeCode: 'ember',
            archetypeName: 'Штурм',
            schoolCode: 'ember',
            passiveAbilityCodes: ['ember_heart'],
            activeAbility: null,
          },
        },
        enemy: {
          ...createBattle().enemy,
          code: 'ash-seer',
          name: 'Пепельная ведунья',
          kind: 'mage',
          isElite: true,
          currentHealth: 0,
        },
        rewards: {
          experience: 14,
          gold: 5,
          shards: { UNUSUAL: 1 },
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
      }),
      player,
      acquisitionSummary: {
        kind: 'school_trial_completed',
        title: 'Испытание школы пройдено',
        changeLine: 'Пламя признало вашу решимость.',
        nextStepLine: 'Откройте «🔮 Руны», наденьте первый знак школы и закрепите стиль в следующем бою.',
      },
    });
    vi.mocked(services.getPendingReward.execute).mockResolvedValueOnce({
      player,
      pendingReward: createPendingReward({
        source: {
          battleId: 'battle-school-pending-1',
          enemyCode: 'ash-seer',
          enemyName: 'Пепельная ведунья',
          enemyKind: 'mage',
        },
      }),
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    const keyboardClear = serializeKeyboard(replies[0]?.keyboard);

    expect(keyboardClear.isInline).toBe(false);
    expect(keyboardClear.rows).toEqual([]);
    expect(replies[1]?.message).toContain('🏁 Трофеи победы');
    expect(replies[1]?.message).toContain('💡 Откройте «🔮 Руны», наденьте первый знак школы');
    expect(services.telemetry.postSessionNextGoalShown).toHaveBeenCalledWith(1, expect.objectContaining({
      battleOutcome: 'VICTORY',
      suggestedGoalType: 'equip_school_sign',
      enemyCode: 'ash-seer',
      battleSchoolCode: 'ember',
      isSchoolNoviceElite: true,
    }));
  });

  it('проходит сценарий обучения и входа в бой', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const locationContext = createFakeContext({ command: 'локация', intentId: 'intent-location-1', stateKey: 'state-location-1' });
    const exploreContext = createFakeContext({ command: 'исследовать' });

    await handler.handle(locationContext as never);
    await handler.handle(exploreContext as never);

    expect(services.enterTutorialMode.execute).toHaveBeenCalledWith(1001, 'intent-location-1', 'state-location-1', 'payload');
    expect(services.exploreLocation.execute).toHaveBeenCalledWith(1001, undefined, undefined, 'payload');
    expect(getReplyCalls(locationContext)[0]?.message).toContain('Учебный круг');
    expect(getReplyCalls(locationContext)[0]?.message).toContain('Награда: первая руна');
    expect(getReplyCalls(exploreContext)[0]?.message).toContain('⚔️ Бой');
    expect(getReplyCalls(exploreContext)[0]?.message).toContain('Ответ мастера:');
  });

  it('выводит server-owned legacy intent для текстового исследования', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'исследовать', id: 517, conversationMessageId: 93, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.exploreLocation.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:93:исследовать', undefined, 'legacy_text');
  });

  it('возвращает к несобранной добыче вместо нового исследования', async () => {
    const services = createServices();
    const pendingReward = createPendingReward();
    vi.mocked(services.getPendingReward.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      pendingReward,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'исследовать' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    const keyboardClear = serializeKeyboard(replies[0]?.keyboard);

    expect(keyboardClear.isInline).toBe(false);
    expect(keyboardClear.rows).toEqual([]);
    expect(replies[1]?.message).toContain('🏁 Трофеи победы');
    expect(services.exploreLocation.execute).not.toHaveBeenCalled();
  });

  it('показывает отдельное событие исследования без боевой клавиатуры', async () => {
    const services = createServices();
    vi.mocked(services.exploreLocation.execute).mockResolvedValueOnce({
      event: {
        code: 'quiet-rest',
        kind: 'rest',
        kindLabel: 'передышка',
        title: '🌿 Тихая передышка',
        directorLine: '🎲 Наставник Совета рун отмечает передышку: пауза помогает прочитать маршрут, но не меняет правила и темп приключения.',
        description: 'Вы находите сухой уступ под корнями.',
        outcomeLine: 'Боя нет: экспедиция получает паузу без скрытого давления.',
        nextStepLine: 'Когда будете готовы, можно снова двинуться глубже.',
        effect: { kind: 'none' },
      },
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
    } as never);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'исследовать', intentId: 'intent-scene-1', stateKey: 'state-scene-1' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('🧭 Исследование');
    expect(replies[0]?.message).toContain('Тихая передышка');
    expect(replies[0]?.message).toContain('🏷️ передышка');
    expect(replies[0]?.message).toContain('экспедиция получает паузу');
    expect(replies[0]?.message).not.toContain('Ответ мастера:');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Исследовать');
  });

  it('выводит server-owned legacy intent для текстового входа в обучение', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'обучение', id: 518, conversationMessageId: 94, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.enterTutorialMode.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:94:локация', undefined, 'legacy_text');
  });

  it('не возвращает пропустившего игрока в учебный бой через старую команду локации', async () => {
    const services = createServices();
    vi.mocked(services.enterTutorialMode.execute).mockResolvedValueOnce(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 0 }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'локация' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('📘 Обучение пропущено.');
    expect(replies[0]?.message).toContain('Дальше: обычное исследование.');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Исследовать');
    expect(JSON.stringify(replies[0]?.keyboard)).not.toContain('Учебный бой');
  });

  it('возвращает в активный бой, если открыть локацию во время сражения', async () => {
    const services = createServices();
    vi.mocked(services.enterTutorialMode.execute).mockRejectedValueOnce(
      new AppError('battle_in_progress', 'Сначала завершите текущий бой, потом возвращайтесь к учебному кругу.'),
    );
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'локация' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Сначала завершите текущий бой');
    expect(replies[0]?.message).toContain('⚔️ Бой');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('атака');
  });

  it('нормализует алиас обучения к тому же battle-safe recovery', async () => {
    const services = createServices();
    vi.mocked(services.enterTutorialMode.execute).mockRejectedValueOnce(
      new AppError('battle_in_progress', 'Сначала завершите текущий бой, потом возвращайтесь к учебному кругу.'),
    );
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'обучение' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('⚔️ Бой');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('атака');
  });

  it('восстанавливает актуальный tutorial/adventure контекст после stale входа в обучение', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'локация', intentId: 'intent-location-2', stateKey: 'state-location-2' });

    vi.mocked(services.enterTutorialMode.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Учебная тропа сменилась. Вот нынешний путь героя.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Учебная тропа сменилась');
    expect(replies[0]?.message).toContain('📘 Учебный круг');
  });

  it('выводит adventure recap для активного игрока по команде возврата в приключения', async () => {
    const services = createServices();
    vi.mocked(services.returnToAdventure.execute).mockResolvedValueOnce(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения' });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(services.returnToAdventure.execute).toHaveBeenCalledWith(1001, undefined, undefined, 'payload');
    expect(replies[0]?.message).toContain('🧭 Возвращение в приключения');
    expect(replies[0]?.message).toContain('Дальше: «⚔️ Исследовать»');
    expect(replies[0]?.message).not.toContain('Учебный бой');
  });

  it('нормализует алиас возврата в мир к adventure recap', async () => {
    const services = createServices();
    vi.mocked(services.returnToAdventure.execute).mockResolvedValueOnce(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'в мир' });

    await handler.handle(ctx as never);

    expect(services.returnToAdventure.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:77:в приключения', undefined, 'legacy_text');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Дальше: «⚔️ Исследовать»');
  });

  it('проходит сценарий завершения боя', async () => {
    const services = createServices();
    vi.mocked(services.getPlayerProfile.execute).mockResolvedValueOnce(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
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
    }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-1', stateKey: 'state-battle-1' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'ATTACK', 'intent-battle-1', 'state-battle-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🏁 Победа');
    expect(getReplyCalls(ctx)[0]?.message).toContain('💡 След: разыщите Пепельную ведунью');
  });

  it('после победы показывает карточку несобранной добычи', async () => {
    const services = createServices();
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const pendingReward = createPendingReward();
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: createBattle({
        status: 'COMPLETED',
        result: 'VICTORY',
        rewards: {
          experience: 14,
          gold: 5,
          shards: { USUAL: 2 },
          droppedRune: null,
        },
        enemy: {
          ...createBattle().enemy,
          currentHealth: 0,
        },
      }),
      player,
      acquisitionSummary: {
        kind: 'slot_unlock',
        title: 'Открыт новый слот рун',
        changeLine: 'Сборка стала шире.',
        nextStepLine: 'Откройте «🔮 Руны» и выберите слот.',
      },
    });
    vi.mocked(services.getPendingReward.execute).mockResolvedValueOnce({
      player,
      pendingReward,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-loot-1', stateKey: 'state-battle-loot-1' });

    await handler.handle(ctx as never);

    expect(services.getPendingReward.execute).toHaveBeenCalledWith(1001);
    const replies = getReplyCalls(ctx);
    const keyboardClear = serializeKeyboard(replies[0]?.keyboard);

    expect(keyboardClear.isInline).toBe(false);
    expect(keyboardClear.rows).toEqual([]);
    expect(replies[1]?.message).toContain('🏁 Трофеи победы');
    expect(replies[1]?.message).toContain('Лесной волк повержен');
    expect(replies[1]?.message).toContain('✨ Открыт новый слот рун.');
    expect(replies[1]?.message).toContain('🔪 Свежевать');
  });

  it('обрабатывает выбранное действие трофея', async () => {
    const services = createServices();
    const pendingReward = createPendingReward();
    vi.mocked(services.collectPendingReward.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      playerBeforeCollect: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      pendingReward,
      ledgerKey: 'battle-victory:battle-1',
      selectedActionCode: 'skin_beast',
      appliedResult: {
        baseRewardApplied: true,
        inventoryDelta: {
          leather: 2,
          bone: 1,
        },
        skillUps: [
          {
            skillCode: 'gathering.skinning',
            experienceBefore: 0,
            experienceAfter: 1,
            rankBefore: 0,
            rankAfter: 0,
          },
        ],
        statUps: [],
        schoolUps: [],
      },
    } satisfies CollectPendingRewardView);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'свежевать', intentId: 'intent-trophy-1', stateKey: 'battle-victory:battle-1' });

    await handler.handle(ctx as never);

    expect(services.collectPendingReward.execute).toHaveBeenCalledWith(1001, 'skin_beast', 'battle-victory:battle-1');
    expect(services.getParty.execute).toHaveBeenCalledWith(1001);
    expect(getReplyCalls(ctx)[0]?.message).toContain('🔪 Свежевать');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🎒 +2 кожи · +1 кость.');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Свежевание: Ученик свежевания · рука стала вернее');
    expect(getReplyCalls(ctx)[0]?.message).not.toContain('Свежевание: 0 → 1');

    const keyboard = serializeKeyboard(getReplyCalls(ctx)[0]?.keyboard) as {
      readonly rows: ReadonlyArray<ReadonlyArray<{ readonly action: { readonly label: string } }>>;
      readonly currentRow?: ReadonlyArray<{ readonly action: { readonly label: string } }>;
    };
    const labels = [...keyboard.rows.flat(), ...(keyboard.currentRow ?? [])].map((button) => button.action.label);

    expect(labels).toContain('⚔️ Исследовать отрядом');
  });

  it('показывает impact recap в результате боя, если награда реально меняет сборку', async () => {
    const services = createServices();
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: createBattle({
        status: 'COMPLETED',
        result: 'VICTORY',
        rewards: {
          experience: 6,
          gold: 2,
          shards: { USUAL: 2 },
          droppedRune: null,
        },
        enemy: {
          ...createBattle().enemy,
          currentHealth: 0,
        },
      }),
      player: createPlayer({
        tutorialState: 'SKIPPED',
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
      }),
      acquisitionSummary: {
        kind: 'slot_unlock',
        title: 'Открыт новый слот рун',
        changeLine: 'Сборка стала шире: теперь можно надеть ещё одну полноценную руну.',
        nextStepLine: 'Откройте «🔮 Руны» и выберите, какой слот занять новой руной.',
      },
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-impact-1', stateKey: 'state-battle-impact-1' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('✨ Открыт новый слот рун.');
    expect(getReplyCalls(ctx)[0]?.message).toContain('💡 Откройте «🔮 Руны» и выберите, какой слот занять новой руной.');
  });

  it('логирует первое school reveal после battle result с school trial completion', async () => {
    const services = createServices();
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: createBattle({
        id: 'battle-school-reveal-1',
        status: 'COMPLETED',
        result: 'VICTORY',
        rewards: {
          experience: 8,
          gold: 3,
          shards: { UNUSUAL: 1 },
          droppedRune: null,
        },
        enemy: {
          ...createBattle().enemy,
          code: 'ember_witch',
          name: 'Пепельная ведунья',
          isElite: true,
          currentHealth: 0,
        },
      }),
      player: createPlayer({
        tutorialState: 'SKIPPED',
        victories: 3,
        schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
        runes: [
          {
            id: 'rune-ember-usual',
            runeCode: 'rune-ember-usual',
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
          {
            id: 'rune-ember-unusual',
            runeCode: 'rune-ember-unusual',
            archetypeCode: 'ember',
            passiveAbilityCodes: ['ember_heart'],
            activeAbilityCodes: ['ember_pulse'],
            name: 'Первый знак Пламени',
            rarity: 'UNUSUAL',
            isEquipped: false,
            equippedSlot: null,
            health: 2,
            attack: 3,
            defence: 0,
            magicDefence: 0,
            dexterity: 0,
            intelligence: 0,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      acquisitionSummary: {
        kind: 'school_trial_completed',
        title: 'Испытание школы пройдено',
        changeLine: 'Пламя признало вашу решимость.',
        nextStepLine: 'Откройте «🔮 Руны», наденьте первый знак школы и закрепите стиль в следующем бою.',
      },
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-school-reveal-1', stateKey: 'state-school-reveal-1' });

    await handler.handle(ctx as never);

    expect(services.telemetry.firstSchoolPresented).toHaveBeenCalledWith(1, {
      schoolCode: 'ember',
      presentationSurface: 'battle_result',
      presentationReason: 'school_trial_completed',
    });
  });

  it('логирует first school reveal и для tutorial reward с первой руной', async () => {
    const services = createServices();
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: createBattle({
        id: 'battle-first-rune-1',
        status: 'COMPLETED',
        result: 'VICTORY',
        locationLevel: 0,
        rewards: {
          experience: 6,
          gold: 2,
          shards: { USUAL: 1 },
          droppedRune: null,
        },
      }),
      player: createPlayer({
        tutorialState: 'COMPLETED',
        locationLevel: 1,
        victories: 1,
        runes: [
          {
            id: 'rune-first-1',
            runeCode: 'rune-first-1',
            archetypeCode: 'gale',
            passiveAbilityCodes: ['gale_mark'],
            activeAbilityCodes: ['gale_step'],
            name: 'Искра Бури',
            rarity: 'USUAL',
            isEquipped: false,
            equippedSlot: null,
            health: 1,
            attack: 2,
            defence: 0,
            magicDefence: 0,
            dexterity: 2,
            intelligence: 1,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      acquisitionSummary: {
        kind: 'new_rune',
        title: 'Первая руна: Искра Бури',
        changeLine: 'Она открывает школу Бури и новый стиль боя.',
        nextStepLine: 'Откройте «🔮 Руны», экипируйте её и зайдите в бой.',
      },
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-first-rune-1', stateKey: 'state-first-rune-1' });

    await handler.handle(ctx as never);

    expect(services.telemetry.firstSchoolPresented).toHaveBeenCalledWith(1, {
      schoolCode: 'gale',
      presentationSurface: 'battle_result',
      presentationReason: 'first_rune_reward',
    });
  });

  it('логирует transport telemetry и для replayed battle result, если экран реально отправлен', async () => {
    const services = createServices();
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      replayed: true,
      battle: createBattle({
        status: 'COMPLETED',
        result: 'VICTORY',
        enemy: {
          ...createBattle().enemy,
          code: 'ember_witch',
          name: 'Пепельная ведунья',
          isElite: true,
          currentHealth: 0,
        },
      }),
      player: createPlayer({
        tutorialState: 'SKIPPED',
        victories: 3,
        schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
        runes: [
          {
            id: 'rune-ember-usual',
            runeCode: 'rune-ember-usual',
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
          {
            id: 'rune-ember-unusual',
            runeCode: 'rune-ember-unusual',
            archetypeCode: 'ember',
            passiveAbilityCodes: ['ember_heart'],
            activeAbilityCodes: ['ember_pulse'],
            name: 'Первый знак Пламени',
            rarity: 'UNUSUAL',
            isEquipped: false,
            equippedSlot: null,
            health: 2,
            attack: 3,
            defence: 0,
            magicDefence: 0,
            dexterity: 0,
            intelligence: 0,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      acquisitionSummary: {
        kind: 'school_trial_completed',
        title: 'Испытание школы пройдено',
        changeLine: 'Пламя признало вашу решимость.',
        nextStepLine: 'Откройте «🔮 Руны», наденьте первый знак школы и закрепите стиль в следующем бою.',
      },
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-school-reveal-replay-1', stateKey: 'state-school-reveal-replay-1' });

    await handler.handle(ctx as never);

    expect(services.telemetry.firstSchoolPresented).toHaveBeenCalledWith(1, {
      schoolCode: 'ember',
      presentationSurface: 'battle_result',
      presentationReason: 'school_trial_completed',
    });
    expect(services.telemetry.postSessionNextGoalShown).toHaveBeenCalledWith(1, expect.objectContaining({
      suggestedGoalType: 'equip_school_sign',
    }));
  });

  it('выводит server-owned legacy intent для текстовой атаки в бою', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'атака', id: 513, conversationMessageId: 89, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'ATTACK', 'legacy-text:2000000001:1001:89:атака', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстового блока в бою', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'блок', id: 514, conversationMessageId: 90, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'DEFEND', 'legacy-text:2000000001:1001:90:защита', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстового рунного действия', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'спелл', id: 515, conversationMessageId: 91, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'RUNE_SKILL', 'legacy-text:2000000001:1001:91:спелл', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстовых навыков в бою', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'навыки', id: 516, conversationMessageId: 92, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'RUNE_SKILL', 'legacy-text:2000000001:1001:92:навыки', undefined, 'legacy_text');
  });

  it('не удаляет персонажа без явного подтверждения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'удалить персонажа' });

    await handler.handle(ctx as never);

    expect(services.deletePlayer.execute).not.toHaveBeenCalled();
    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('⚠️ Удаление персонажа');
    expect(replies[0]?.message).toContain('необратимо');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('__confirm_delete_player__');
  });

  it('удаляет персонажа только после подтверждения из актуального экрана', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const player = createPlayer();
    const ctx = createFakeContext({ command: '__confirm_delete_player__', intentId: 'intent-delete-1', stateKey: player.updatedAt });

    await handler.handle(ctx as never);

    expect(services.deletePlayer.execute).toHaveBeenCalledWith(1001, 'intent-delete-1', player.updatedAt, 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Персонаж удалён');
  });

  it('повторяет одинаковый success-ack для дубликата подтверждения удаления', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const player = createPlayer();
    const first = createFakeContext({ command: '__confirm_delete_player__', intentId: 'intent-delete-3', stateKey: player.updatedAt });
    const second = createFakeContext({ command: '__confirm_delete_player__', intentId: 'intent-delete-3', stateKey: player.updatedAt });

    await handler.handle(first as never);
    await handler.handle(second as never);

    expect(services.deletePlayer.execute).toHaveBeenNthCalledWith(1, 1001, 'intent-delete-3', player.updatedAt, 'payload');
    expect(services.deletePlayer.execute).toHaveBeenNthCalledWith(2, 1001, 'intent-delete-3', player.updatedAt, 'payload');
    expect(getReplyCalls(first)[0]?.message).toContain('Персонаж удалён');
    expect(getReplyCalls(second)[0]?.message).toContain('Персонаж удалён');
  });

  it('восстанавливает канонический delete success после retry-pending дубля, если первый delete уже закоммитился', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const player = createPlayer();
    const first = createFakeContext({ command: '__confirm_delete_player__', intentId: 'intent-delete-4', stateKey: player.updatedAt });
    const second = createFakeContext({ command: '__confirm_delete_player__', intentId: 'intent-delete-4', stateKey: player.updatedAt });

    vi.mocked(services.deletePlayer.execute)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new AppError('command_retry_pending', 'Прошлый жест ещё в пути. Дождитесь ответа.'));
    vi.mocked(services.getPlayerProfile.execute).mockRejectedValueOnce(
      new AppError('player_not_found', 'Персонаж не найден. «🎮 Начать» создаст нового мастера.'),
    );

    await handler.handle(first as never);
    await handler.handle(second as never);

    expect(getReplyCalls(second)[0]?.message).toContain('Персонаж удалён');
    expect(JSON.stringify(getReplyCalls(second)[0]?.keyboard)).toContain('начать');
  });

  it('возвращает игрока в профиль при устаревшем подтверждении удаления', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: '__confirm_delete_player__', intentId: 'intent-delete-2', stateKey: 'stale-delete-state' });

    vi.mocked(services.deletePlayer.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Старое подтверждение больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.'),
    );

    await handler.handle(ctx as never);

    expect(services.deletePlayer.execute).toHaveBeenCalledWith(1001, 'intent-delete-2', 'stale-delete-state', 'payload');
    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Старое подтверждение больше не действует');
    expect(replies[0]?.message).toContain('👤 Профиль');
  });

  it('пробрасывает intentId для крафта руны через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'создать', intentId: 'intent-craft-1', stateKey: 'state-craft-1' });

    await handler.handle(ctx as never);

    expect(services.craftRune.execute).toHaveBeenCalledWith(1001, 'intent-craft-1', 'state-craft-1', 'payload');
  });

  it('пробрасывает intentId для алхимии пилюли через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'пилюля восстановления', intentId: 'intent-pill-1', stateKey: 'state-pill-1' });

    await handler.handle(ctx as never);

    expect(services.craftItem.execute).toHaveBeenCalledWith(
      1001,
      'vital_charm',
      'intent-pill-1',
      'state-pill-1',
      'payload',
    );
  });

  it('пробрасывает intentId для применения пилюли вне боя через transport payload', async () => {
    const services = createServices();
    vi.mocked(services.getActiveBattle.execute).mockResolvedValueOnce(null);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      command: gameCommands.useHealingPill,
      intentId: 'intent-use-pill-1',
      stateKey: 'state-use-pill-1',
    });

    await handler.handle(ctx as never);

    expect(services.useConsumable.execute).toHaveBeenCalledWith(
      1001,
      'healing_pill',
      'intent-use-pill-1',
      'state-use-pill-1',
      'payload',
    );
    expect(services.performBattleAction.execute).not.toHaveBeenCalled();
  });

  it('направляет применение пилюли в активном бою через боевое действие', async () => {
    const services = createServices();
    vi.mocked(services.getActiveBattle.execute).mockResolvedValueOnce(createBattle());
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      command: gameCommands.useHealingPill,
      intentId: 'intent-battle-pill-1',
      stateKey: 'state-battle-pill-1',
    });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(
      1001,
      'USE_HEALING_PILL',
      'intent-battle-pill-1',
      'state-battle-pill-1',
      'payload',
    );
    expect(services.useConsumable.execute).not.toHaveBeenCalled();
  });

  it('пробрасывает intentId для создания предмета мастерской через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      command: createWorkshopCraftCommand('skinning_kit'),
      intentId: 'intent-workshop-craft-1',
      stateKey: 'state-workshop-craft-1',
    });

    await handler.handle(ctx as never);

    expect(services.craftWorkshopItem.execute).toHaveBeenCalledWith(
      1001,
      'skinning_kit',
      'intent-workshop-craft-1',
      'state-workshop-craft-1',
      'payload',
    );
  });

  it('пробрасывает intentId для ремонта предмета мастерской через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      command: createWorkshopRepairCommand('crafted-test-1', 'resonance_tool'),
      intentId: 'intent-workshop-repair-1',
      stateKey: 'state-workshop-repair-1',
    });

    await handler.handle(ctx as never);

    expect(services.repairWorkshopItem.execute).toHaveBeenCalledWith(
      1001,
      'crafted-test-1',
      'resonance_tool',
      'intent-workshop-repair-1',
      'state-workshop-repair-1',
      'payload',
    );
  });

  it('показывает impact recap после создания руны', async () => {
    const services = createServices();
    vi.mocked(services.craftRune.execute).mockResolvedValueOnce({
      player: createPlayer({
        tutorialState: 'SKIPPED',
        locationLevel: 1,
        runes: [
          {
            id: 'rune-new-1',
            runeCode: 'rune-new-1',
            archetypeCode: 'gale',
            passiveAbilityCodes: ['gale_mark'],
            activeAbilityCodes: ['gale_step'],
            name: 'Искра Бури',
            rarity: 'RARE',
            isEquipped: false,
            health: 1,
            attack: 2,
            defence: 0,
            magicDefence: 0,
            dexterity: 2,
            intelligence: 1,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      acquisitionSummary: {
        kind: 'new_rune',
        title: 'Новая руна: Искра Бури',
        changeLine: 'Даёт школе Бури новый темповый ответ после базовой атаки.',
        nextStepLine: 'Откройте «🔮 Руны» и примерьте её в сборке.',
      },
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'создать', intentId: 'intent-craft-impact-1', stateKey: 'state-craft-impact-1' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('✨ Новая руна: Искра Бури.');
    expect(getReplyCalls(ctx)[0]?.message).toContain('💡 Откройте «🔮 Руны» и примерьте её в сборке.');
  });

  it('пробрасывает intentId для перековки руны через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: '~атк', intentId: 'intent-reroll-1', stateKey: 'state-reroll-1' });

    await handler.handle(ctx as never);

    expect(services.rerollCurrentRuneStat.execute).toHaveBeenCalledWith(1001, 'attack', 'intent-reroll-1', 'state-reroll-1', 'payload');
  });

  it('выводит server-owned legacy intent для текстового создания руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'создать', id: 501, conversationMessageId: 77, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.craftRune.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:77:создать', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстовой перековки руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: '~атк', id: 502, conversationMessageId: 78, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.rerollCurrentRuneStat.execute).toHaveBeenCalledWith(1001, 'attack', 'legacy-text:2000000001:1001:78:~атк', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстового распыления руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'сломать', id: 503, conversationMessageId: 79, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.destroyCurrentRune.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:79:сломать', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстовой экипировки руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'надеть', id: 506, conversationMessageId: 82, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.equipCurrentRune.execute).toHaveBeenCalledWith(1001, null, 'legacy-text:2000000001:1001:82:надеть', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстового снятия руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'снять', id: 507, conversationMessageId: 83, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.unequipCurrentRune.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:83:снять', undefined, 'legacy_text');
  });

  it('старые stat-команды теперь идут в unknown command вместо скрытой profile-ветки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: '+атк', id: 504, conversationMessageId: 80, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('Такого пути мастер не знает');
  });

  it('пробрасывает intentId для экипировки руны через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть', intentId: 'intent-equip-1', stateKey: 'state-equip-1' });

    await handler.handle(ctx as never);

    expect(services.equipCurrentRune.execute).toHaveBeenCalledWith(1001, null, 'intent-equip-1', 'state-equip-1', 'payload');
  });

  it('показывает payoff recap после установки первого знака школы', async () => {
    const services = createServices();
    vi.mocked(services.equipCurrentRune.execute).mockResolvedValueOnce({
      player: createPlayer({
        tutorialState: 'SKIPPED',
        victories: 3,
        schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
        runes: [
          {
            id: 'rune-ember-sign',
            runeCode: 'rune-ember-sign',
            archetypeCode: 'ember',
            passiveAbilityCodes: ['ember_heart'],
            activeAbilityCodes: ['ember_pulse'],
            name: 'Первый знак Пламени',
            rarity: 'UNUSUAL',
            isEquipped: true,
            equippedSlot: 0,
            health: 2,
            attack: 3,
            defence: 0,
            magicDefence: 0,
            dexterity: 0,
            intelligence: 0,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      acquisitionSummary: {
        kind: 'school_style_committed',
        title: 'Стиль Пламени закреплён',
        changeLine: 'Первый знак Пламени теперь в основе: школа перестала быть наградой в запасе и стала вашей реальной боевой сборкой.',
        nextStepLine: 'Следующий бой: держите давление и добивайте просевшую цель, чтобы сразу почувствовать стиль школы.',
      },
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть', intentId: 'intent-equip-style-1', stateKey: 'state-equip-style-1' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('✨ Стиль Пламени закреплён.');
    expect(getReplyCalls(ctx)[0]?.message).toContain('💡 Следующий бой: держите давление');
    expect(JSON.stringify(getReplyCalls(ctx)[0]?.keyboard)).not.toContain('Проверить школу');
    expect(JSON.stringify(getReplyCalls(ctx)[0]?.keyboard)).toContain('К списку рун');
  });

  it('пробрасывает intentId для экипировки во второй слот через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть в поддержку', intentId: 'intent-slot-2-1', stateKey: 'state-slot-2-1' });

    await handler.handle(ctx as never);

    expect(services.equipCurrentRune.execute).toHaveBeenCalledWith(1001, 1, 'intent-slot-2-1', 'state-slot-2-1', 'payload');
  });

  it('не поднимает first-sign payoff recap на replayed экипировку во второй слот', async () => {
    const services = createServices();
    vi.mocked(services.equipCurrentRune.execute).mockResolvedValueOnce({
      player: createPlayer({
        tutorialState: 'SKIPPED',
        victories: 3,
        schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
        unlockedRuneSlotCount: 2,
        runes: [
          {
            id: 'rune-ember-sign',
            runeCode: 'rune-ember-sign',
            archetypeCode: 'ember',
            passiveAbilityCodes: ['ember_heart'],
            activeAbilityCodes: ['ember_pulse'],
            name: 'Первый знак Пламени',
            rarity: 'UNUSUAL',
            isEquipped: true,
            equippedSlot: 0,
            health: 2,
            attack: 3,
            defence: 0,
            magicDefence: 0,
            dexterity: 0,
            intelligence: 0,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
          {
            id: 'rune-slot-2-1',
            runeCode: 'rune-slot-2-1',
            archetypeCode: 'stone',
            passiveAbilityCodes: ['stone_skin'],
            activeAbilityCodes: ['stone_counter'],
            name: 'Каменный отклик',
            rarity: 'USUAL',
            isEquipped: true,
            equippedSlot: 1,
            health: 1,
            attack: 0,
            defence: 2,
            magicDefence: 0,
            dexterity: 0,
            intelligence: 0,
            createdAt: '2026-04-12T00:00:00.000Z',
          },
        ],
      }),
      acquisitionSummary: null,
      replayed: true,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть в поддержку', intentId: 'intent-slot-2-replay-1', stateKey: 'state-slot-2-replay-1' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).not.toContain('Стиль Пламени закреплён');
  });

  it('пробрасывает intentId для снятия руны через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'снять', intentId: 'intent-unequip-1', stateKey: 'state-unequip-1' });

    await handler.handle(ctx as never);

    expect(services.unequipCurrentRune.execute).toHaveBeenCalledWith(1001, 'intent-unequip-1', 'state-unequip-1', 'payload');
  });

  it('использует рунное действие в бою', async () => {
    const services = createServices();
    const runeSkillBattle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Эпическая руна Пламени',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'ember_pulse',
            name: 'Импульс углей',
            manaCost: 3,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
      log: ['🌀 [Рунный мастер #1001] применяет «Импульс углей» против [Учебный огонёк]: 5 урона.'],
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: runeSkillBattle,
      player: null,
      acquisitionSummary: null,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'навыки', intentId: 'intent-battle-skill-1', stateKey: 'state-battle-skill-1' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'RUNE_SKILL', 'intent-battle-skill-1', 'state-battle-skill-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Импульс углей');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🌀');
  });

  it('использует универсальную защиту в бою', async () => {
    const services = createServices();
    const defendBattle = createBattle({
      player: {
        ...createBattle().player,
        guardPoints: 2,
      },
      log: ['🛡️ [Рунный мастер #1001] готовит защиту на 2 урона.'],
      turnOwner: 'ENEMY',
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: defendBattle,
      player: null,
      acquisitionSummary: null,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'защита', intentId: 'intent-battle-defend-1', stateKey: 'state-battle-defend-1' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'DEFEND', 'intent-battle-defend-1', 'state-battle-defend-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('готовит защиту');
  });

  it('показывает телеграф тяжёлого удара врага', async () => {
    const services = createServices();
    vi.mocked(services.getActiveBattle.execute).mockResolvedValueOnce(createBattle({
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее обычной. Защита поможет пережить этот ход.',
          bonusAttack: 3,
        },
      },
    }));
    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('enemy_turn', 'Сейчас ход противника.'),
    );
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-2', stateKey: 'state-battle-2' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('👁️ Чтение: силовой удар');
    expect(getReplyCalls(ctx)[0]?.message).toContain('тяжёлый удар лучше встретить защитой');
  });

  it('показывает телеграф пробивающего удара врага', async () => {
    const services = createServices();
    vi.mocked(services.getActiveBattle.execute).mockResolvedValueOnce(createBattle({
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'GUARD_BREAK',
          title: 'Кислотный прорыв',
          description: 'Следующий удар разобьёт защиту. Лучше давить уроном сейчас, а не тратить ход на защиту.',
          bonusAttack: 2,
          shattersGuard: true,
        },
      },
    }));
    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('enemy_turn', 'Сейчас ход противника.'),
    );
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'защита', intentId: 'intent-battle-3', stateKey: 'state-battle-3' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('👁️ Чтение: приём против стойки');
    expect(getReplyCalls(ctx)[0]?.message).toContain('чистая защита рискованна');
  });

  it('проходит сценарий рун и алтаря без прямой правки transport-описаний', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const runeContext = createFakeContext({ command: 'руна' });
    const altarContext = createFakeContext({ command: 'алтарь' });

    await handler.handle(runeContext as never);
    await handler.handle(altarContext as never);

    expect(services.getRuneCollection.execute).toHaveBeenCalledTimes(2);
    expect(getReplyCalls(runeContext)[0]?.message).toContain('🔮 Руны');
    expect(getReplyCalls(runeContext)[0]?.message).toContain('🧩 Рун надето');
    expect(getReplyCalls(runeContext)[0]?.message).toContain('1. 🔥 Эпическая руна Пламени');
    expect(getReplyCalls(runeContext)[0]?.message).toContain('Страница 1 из 1');
    expect(getReplyCalls(runeContext)[0]?.message).not.toContain('Список рун');
    expect(getReplyCalls(runeContext)[0]?.message).not.toContain('⭐ Эпическая руна · Пламя');
    expect(getReplyCalls(altarContext)[0]?.message).toContain('🕯 Алтарь рун');
    expect(getReplyCalls(altarContext)[0]?.message).toContain('⭐ Эпическая руна · Пламя');
    expect(getReplyCalls(altarContext)[0]?.message).toContain('💡 Пламя любит давление: бейте чаще');
    expect(getReplyCalls(altarContext)[0]?.message).toContain('Импульс углей');
  });

  it('выбирает руну через слот на странице', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна слот 1', intentId: 'intent-rune-slot-1', stateKey: 'state-rune-slot-1' });

    await handler.handle(ctx as never);

    expect(services.selectRunePageSlot.execute).toHaveBeenCalledWith(1001, 0, 'intent-rune-slot-1', 'state-rune-slot-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🔮 Руна');
    expect(getReplyCalls(ctx)[0]?.message).toContain('⭐ Эпическая руна · Пламя');
  });

  it('перелистывает страницу рун через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руны >', intentId: 'intent-rune-page-1', stateKey: 'state-rune-page-1' });

    await handler.handle(ctx as never);

    expect(services.moveRuneCursor.execute).toHaveBeenCalledWith(1001, 5, 'intent-rune-page-1', 'state-rune-page-1', 'payload');
  });

  it('выводит server-owned legacy intent для текстовой навигации по рунам и её алиаса', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const nextPage = createFakeContext({ text: 'руны >', id: 519, conversationMessageId: 95, peerId: 2000000001 });
    const nextAlias = createFakeContext({ text: '>>руна', id: 520, conversationMessageId: 96, peerId: 2000000001 });
    const slot = createFakeContext({ text: 'руна слот 1', id: 521, conversationMessageId: 97, peerId: 2000000001 });

    await handler.handle(nextPage as never);
    await handler.handle(nextAlias as never);
    await handler.handle(slot as never);

    expect(services.moveRuneCursor.execute).toHaveBeenNthCalledWith(1, 1001, 5, 'legacy-text:2000000001:1001:95:руны >', undefined, 'legacy_text');
    expect(services.moveRuneCursor.execute).toHaveBeenNthCalledWith(2, 1001, 5, 'legacy-text:2000000001:1001:96:руны >', undefined, 'legacy_text');
    expect(services.selectRunePageSlot.execute).toHaveBeenCalledWith(1001, 0, 'legacy-text:2000000001:1001:97:руна слот 1', undefined, 'legacy_text');
  });

  it('возвращает rune hub keyboard при выборе пустого слота', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна слот 4', intentId: 'intent-rune-slot-2', stateKey: 'state-rune-slot-2' });

    vi.mocked(services.selectRunePageSlot.execute).mockRejectedValueOnce(
      new AppError('rune_slot_not_found', 'На этой позиции пусто. Возьмите другой знак со страницы.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('На этой позиции пусто');
    expect(JSON.stringify(replies[0]?.keyboard)).not.toContain('✨ Создать');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('руна слот 1');
  });

  it('восстанавливает rune hub после stale перелистывания страницы', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руны >', intentId: 'intent-rune-page-2', stateKey: 'state-rune-page-2' });

    vi.mocked(services.moveRuneCursor.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Рунная страница сменилась. Вот нынешние знаки.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Рунная страница сменилась');
    expect(replies[0]?.message).toContain('🔮 Руны');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('руны >');
  });

  it('восстанавливает rune hub после pending выбора слота', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна слот 1', intentId: 'intent-rune-slot-3', stateKey: 'state-rune-slot-3' });

    vi.mocked(services.selectRunePageSlot.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Рунный жест ещё в пути. Дождитесь ответа.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Рунный жест ещё в пути');
    expect(replies[0]?.message).toContain('🔮 Руны');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('руна слот 1');
  });

  it('оставляет игрока в боевом контексте при повторном stale нажатии атаки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-4', stateKey: 'state-battle-4' });

    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Этот боевой жест уже выцвел. Вернитесь к свежей развилке боя.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Этот боевой жест уже выцвел');
    expect(replies[0]?.message).toContain('⚔️ Бой');
  });

  it('возвращает текущий бой при pending retry battle intent', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'защита', intentId: 'intent-battle-5', stateKey: 'state-battle-5' });

    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Боевой жест ещё в пути. Дождитесь ответа.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Боевой жест ещё в пути');
    expect(replies[0]?.message).toContain('⚔️ Бой');
  });

  it('восстанавливает контекст приключения после stale explore intent', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'исследовать', intentId: 'intent-explore-1', stateKey: 'state-explore-1' });

    vi.mocked(services.getActiveBattle.execute).mockResolvedValueOnce(null);
    vi.mocked(services.exploreLocation.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'След приключения сместился. Вот нынешний путь.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('След приключения сместился');
    expect(replies[0]?.message).toContain('📘 Учебный круг');
  });

  it('восстанавливает рунный контекст после pending retry для перековки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: '~атк', intentId: 'intent-reroll-1', stateKey: 'state-reroll-1' });

    vi.mocked(services.rerollCurrentRuneStat.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Рунный жест ещё в пути. Дождитесь ответа.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Рунный жест ещё в пути');
    expect(replies[0]?.message).toContain('🕯 Алтарь рун');
    expect(replies[0]?.message).toContain('⭐ Эпическая руна · Пламя');
  });

  it('восстанавливает рунный контекст после stale экипировки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть', intentId: 'intent-equip-1', stateKey: 'state-equip-1' });

    vi.mocked(services.equipCurrentRune.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Этот рунный жест уже выцвел. Вернитесь к свежей руне.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Этот рунный жест уже выцвел');
    expect(replies[0]?.message).toContain('🕯 Алтарь рун');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('intentId');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('надеть');
  });

  it('восстанавливает рунный контекст после pending retry для снятия руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'снять', intentId: 'intent-unequip-1', stateKey: 'state-unequip-1' });

    vi.mocked(services.unequipCurrentRune.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Рунный жест ещё в пути. Дождитесь ответа.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Рунный жест ещё в пути');
    expect(replies[0]?.message).toContain('🕯 Алтарь рун');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('надеть');
  });

  it('проходит сценарий пропуска обучения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'пропустить обучение', intentId: 'intent-skip-1', stateKey: 'state-skip-1' });

    await handler.handle(ctx as never);

    expect(services.skipTutorial.execute).toHaveBeenCalledWith(1001, 'intent-skip-1', 'state-skip-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🧭 Возвращение в приключения');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Исследовать');
  });

  it('логирует return recap telemetry и для replayed skip result, если экран реально отправлен', async () => {
    const services = createServices();
    vi.mocked(services.skipTutorial.execute).mockResolvedValueOnce({
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      replayed: true,
    } as never);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'пропустить обучение', intentId: 'intent-skip-replay-1', stateKey: 'state-skip-replay-1' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('🧭 Возвращение в приключения');
    expect(services.telemetry.returnRecapShown).toHaveBeenCalledWith(1, expect.objectContaining({
      entrySurface: 'skip_tutorial',
    }));
  });

  it('показывает return recap при возврате в приключения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения', intentId: 'intent-return-1', stateKey: 'state-return-1' });

    await handler.handle(ctx as never);

    expect(services.returnToAdventure.execute).toHaveBeenCalledWith(1001, 'intent-return-1', 'state-return-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🧭 Возвращение в приключения');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Дальше: «');
  });

  it('выводит server-owned legacy intent для текстового пропуска обучения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'пропустить обучение', id: 510, conversationMessageId: 86, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.skipTutorial.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:86:пропустить обучение', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для алиаса возврата в мир', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'в мир', id: 511, conversationMessageId: 87, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.returnToAdventure.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:87:в приключения', undefined, 'legacy_text');
  });

  it('восстанавливает tutorial/adventure контекст после stale пропуска обучения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'пропустить обучение', intentId: 'intent-skip-2', stateKey: 'state-skip-2' });

    vi.mocked(services.skipTutorial.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Этот след уже выцвел');
    expect(replies[0]?.message).toContain('📘 Учебный круг');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('пропустить обучение');
  });

  it('восстанавливает текущий location контекст после pending возврата в приключения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения', intentId: 'intent-return-2', stateKey: 'state-return-2' });

    vi.mocked(services.returnToAdventure.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Прошлый жест ещё в пути. Дождитесь ответа.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Прошлый жест ещё в пути');
    expect(replies[0]?.message).toContain('📘 Учебный круг');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Учебный бой');
  });

  it('возвращает в активный бой, если tutorial navigation вызван во время сражения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения', intentId: 'intent-return-3', stateKey: 'state-return-3' });

    vi.mocked(services.returnToAdventure.execute).mockRejectedValueOnce(
      new AppError('battle_in_progress', 'Сначала завершите текущий бой, потом меняйте путь приключения.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Сначала завершите текущий бой');
    expect(replies[0]?.message).toContain('⚔️ Бой');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('атака');
  });

  it('досылает союзнику состояние отрядного боя при старте выхода', async () => {
    const services = createServices();
    vi.mocked(services.getPlayerProfile.execute).mockResolvedValueOnce(createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 1,
      activeBattleId: null,
    }));
    vi.mocked(services.exploreParty.execute).mockResolvedValueOnce(createPartyBattle());
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: gameCommands.exploreParty });

    await handler.handle(ctx as never);

    const directMessages = getDirectMessageCalls(ctx);
    expect(directMessages).toHaveLength(1);
    expect(directMessages[0]?.userId).toBe(1002);
    expect(directMessages[0]?.message).toContain('👤 Вы: Рунный мастер #1002');
    expect(directMessages[0]?.message).toContain('👤 Товарищ: Рунный мастер #1001');
  });

  it('досылает союзнику совместное событие исследования без старта боя', async () => {
    const services = createServices();
    const leader = createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 2,
      activeBattleId: null,
    });
    const ally = createPlayer({
      userId: 2,
      vkId: 1002,
      playerId: 2,
      tutorialState: 'SKIPPED',
      locationLevel: 2,
      activeBattleId: null,
    });
    const party = {
      id: 'party-1',
      inviteCode: 'ABC123',
      leaderPlayerId: leader.playerId,
      status: 'OPEN' as const,
      activeBattleId: null,
      maxMembers: 2,
      members: [
        {
          playerId: leader.playerId,
          vkId: leader.vkId,
          name: 'Рунный мастер #1001',
          role: 'LEADER' as const,
          joinedAt: '2026-04-12T00:00:00.000Z',
        },
        {
          playerId: ally.playerId,
          vkId: ally.vkId,
          name: 'Рунный мастер #1002',
          role: 'MEMBER' as const,
          joinedAt: '2026-04-12T00:01:00.000Z',
        },
      ],
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:01:00.000Z',
    };
    vi.mocked(services.getPlayerProfile.execute).mockResolvedValueOnce(leader);
    vi.mocked(services.exploreParty.execute).mockResolvedValueOnce({
      event: {
        code: 'abandoned-camp',
        kind: 'resource_find',
        kindLabel: 'находка',
        title: '🎒 Брошенный привал',
        directorLine: '🎲 Мастер снабжения отмечает находку: полезно, но без гонки за дневной выгодой.',
        description: 'Под навесом из корней лежат следы чужой экспедиции.',
        outcomeLine: 'Боя нет: отряд забирает малый запас трав.',
        nextStepLine: 'Дальше можно снова двинуться глубже.',
        effect: { kind: 'inventory_delta', delta: { herb: 1 }, line: 'Найдено: трава +1.' },
      },
      player: leader,
      party,
      members: [
        { player: leader },
        { player: ally },
      ],
    } as never);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: gameCommands.exploreParty });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    const directMessages = getDirectMessageCalls(ctx);
    expect(replies[0]?.message).toContain('🧭 Исследование');
    expect(replies[0]?.message).toContain('Брошенный привал');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Исследовать отрядом');
    expect(directMessages).toHaveLength(1);
    expect(directMessages[0]?.userId).toBe(1002);
    expect(directMessages[0]?.message).toContain('Брошенный привал');
    expect(directMessages[0]?.message).toContain('Найдено: трава +1.');
    expect(JSON.stringify(directMessages[0]?.keyboard)).not.toContain('атака');
  });

  it('передает ход союзнику отдельным сообщением и убирает боевые кнопки у уже сходившего игрока', async () => {
    const services = createServices();
    const allySnapshot = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const handedOffBattle = createPartyBattle({
      player: allySnapshot,
      party: {
        ...createPartyBattle().party!,
        currentTurnPlayerId: 2,
        members: [
          createPartyBattle().party!.members[0],
          { playerId: 2, vkId: 1002, name: allySnapshot.name, snapshot: allySnapshot },
        ],
      },
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: handedOffBattle,
      player: null,
      acquisitionSummary: null,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      command: gameCommands.attack,
      intentId: 'intent-party-battle-1',
      stateKey: 'state-party-battle-1',
    });

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    const directMessages = getDirectMessageCalls(ctx);
    expect(serializeKeyboard(replies[0]?.keyboard).rows).toEqual([]);
    expect(directMessages).toHaveLength(1);
    expect(directMessages[0]?.userId).toBe(1002);
    expect(countKeyboardButtons(directMessages[0]?.keyboard)).toBeGreaterThan(0);
  });

  it('возвращает ход капитану отдельным сообщением после действия союзника', async () => {
    const services = createServices();
    const leaderSnapshot = createBattle().player;
    const allySnapshot = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const handedBackBattle = createPartyBattle({
      playerId: 1,
      player: leaderSnapshot,
      party: {
        ...createPartyBattle().party!,
        currentTurnPlayerId: 1,
        members: [
          { playerId: 1, vkId: 1001, name: leaderSnapshot.name, snapshot: leaderSnapshot },
          { playerId: 2, vkId: 1002, name: allySnapshot.name, snapshot: allySnapshot },
        ],
      },
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce({
      battle: handedBackBattle,
      player: null,
      acquisitionSummary: null,
    });
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      senderId: 1002,
      command: gameCommands.attack,
      intentId: 'intent-party-battle-2',
      stateKey: 'state-party-battle-2',
    });

    await handler.handle(ctx as never);

    const directMessages = getDirectMessageCalls(ctx);
    expect(directMessages).toHaveLength(1);
    expect(directMessages[0]?.userId).toBe(1001);
    expect(countKeyboardButtons(directMessages[0]?.keyboard)).toBeGreaterThan(0);
  });

  it('распускает отряд по команде лидера и возвращает экран без активного отряда', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: gameCommands.disbandParty });

    await handler.handle(ctx as never);

    expect(services.disbandParty.execute).toHaveBeenCalledWith(1001);
    expect(getReplyCalls(ctx)[0]?.message).toContain('👤 Сейчас соло.');
  });

  it('позволяет участнику выйти из отряда без расформирования лидера', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({
      senderId: 1002,
      command: gameCommands.leaveParty,
    });

    await handler.handle(ctx as never);

    expect(services.leaveParty.execute).toHaveBeenCalledWith(1002);
    expect(getReplyCalls(ctx)[0]?.message).toContain('👤 Сейчас соло.');
  });
});
