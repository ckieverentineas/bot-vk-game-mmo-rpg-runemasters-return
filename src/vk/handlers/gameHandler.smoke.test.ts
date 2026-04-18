import { describe, expect, it, vi } from 'vitest';

import { createAppServices, type AppServices } from '../../app/composition-root';
import { AppError } from '../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../shared/types/game';
import { createRuneKeyboard } from '../keyboards';
import { GameHandler } from './gameHandler';

interface ReplyCall {
  readonly message: string;
  readonly keyboard: unknown;
}

interface FakeContextInput {
  readonly senderId?: number;
  readonly text?: string;
  readonly command?: string;
}

type ReplyMock = ReturnType<typeof vi.fn>;

interface FakeContext {
  readonly senderId: number;
  readonly text: string;
  readonly messagePayload: { command?: string } | null;
  readonly reply: ReplyMock;
}

const createFakeContext = (input: FakeContextInput): FakeContext => {
  const reply = vi.fn().mockResolvedValue(undefined);

  return {
    senderId: input.senderId ?? 1001,
    text: input.text ?? '',
    messagePayload: input.command ? { command: input.command } : null,
    reply,
  };
};

const getReplyCalls = (ctx: FakeContext): ReplyCall[] => (
  ctx.reply.mock.calls.map(([message, options]) => ({
    message,
    keyboard: options?.keyboard ?? null,
  }))
);

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
    dexterity: 3,
    intelligence: 1,
  },
  allocationPoints: {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  unspentStatPoints: 1,
  locationLevel: 0,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'ACTIVE',
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
  runes: [],
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
  locationLevel: 0,
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
      '⚔️ Вы наносите 6 урона врагу Учебный огонёк.',
    ],
  });

  return {
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
    allocateStatPoint: {
      execute: vi.fn().mockResolvedValue(basePlayer),
    } as unknown as AppServices['allocateStatPoint'],
    resetAllocatedStats: {
      execute: vi.fn().mockResolvedValue(basePlayer),
    } as unknown as AppServices['resetAllocatedStats'],
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
      execute: vi.fn().mockResolvedValue(completedBattle),
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
    craftRune: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['craftRune'],
    rerollCurrentRuneStat: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['rerollCurrentRuneStat'],
    destroyCurrentRune: {
      execute: vi.fn().mockResolvedValue(runePlayer),
    } as unknown as AppServices['destroyCurrentRune'],
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
    expect(replies[0]?.message).toContain('Добро пожаловать');
    expect(replies[0]?.message).toContain('Учебный бой');
    expect(replies[0]?.message).toContain('школа рун');
  });

  it('проходит сценарий обучения и входа в бой', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const locationContext = createFakeContext({ command: 'локация' });
    const exploreContext = createFakeContext({ command: 'исследовать' });

    await handler.handle(locationContext as never);
    await handler.handle(exploreContext as never);

    expect(services.enterTutorialMode.execute).toHaveBeenCalledWith(1001);
    expect(services.exploreLocation.execute).toHaveBeenCalledWith(1001);
    expect(getReplyCalls(locationContext)[0]?.message).toContain('Обучение');
    expect(getReplyCalls(locationContext)[0]?.message).toContain('первую руну');
    expect(getReplyCalls(exploreContext)[0]?.message).toContain('⚔️ Бой');
    expect(getReplyCalls(exploreContext)[0]?.message).toContain('Доступные действия');
  });

  it('проходит сценарий завершения боя', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'ATTACK');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Завершённый бой');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Победа.');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🎯 Следующая цель: начните «⚔️ Новый бой»');
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
      log: ['🌀 Импульс углей прожигает Учебный огонёк на 5 урона.'],
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce(runeSkillBattle);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'навыки' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'RUNE_SKILL');
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
      log: ['🛡️ Вы занимаете защитную стойку и готовите защиту на 2 урона.'],
      turnOwner: 'ENEMY',
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce(defendBattle);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'защита' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'DEFEND');
    expect(getReplyCalls(ctx)[0]?.message).toContain('защитную стойку');
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
    const ctx = createFakeContext({ command: 'атака' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('Намерение врага');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Тяжёлый удар');
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
    const ctx = createFakeContext({ command: 'защита' });

    await handler.handle(ctx as never);

    expect(getReplyCalls(ctx)[0]?.message).toContain('Кислотный прорыв');
    expect(getReplyCalls(ctx)[0]?.message).toContain('тратить ход на защиту');
  });

  it('проходит сценарий рун и алтаря без прямой правки transport-описаний', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const runeContext = createFakeContext({ command: 'руна' });
    const altarContext = createFakeContext({ command: 'алтарь' });

    await handler.handle(runeContext as never);
    await handler.handle(altarContext as never);

    expect(services.getRuneCollection.execute).toHaveBeenCalledTimes(2);
    expect(getReplyCalls(runeContext)[0]?.message).toContain('Руны и мастерская');
    expect(getReplyCalls(runeContext)[0]?.message).toContain('Школа: Пламя');
    expect(getReplyCalls(runeContext)[0]?.message).toContain('Роль: Штурм');
    expect(getReplyCalls(runeContext)[0]?.message).toContain('Импульс углей');
    expect(getReplyCalls(altarContext)[0]?.message).toContain('Руны и мастерская');
  });

  it('выбирает руну через слот на странице', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна слот 1' });

    await handler.handle(ctx as never);

    expect(services.selectRunePageSlot.execute).toHaveBeenCalledWith(1001, 0);
    expect(getReplyCalls(ctx)[0]?.message).toContain('Руны и мастерская');
  });

  it('возвращает rune hub keyboard при выборе пустого слота', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна слот 4' });

    vi.mocked(services.selectRunePageSlot.execute).mockRejectedValueOnce(
      new AppError('rune_slot_not_found', 'На этой позиции нет руны. Выберите другой слот на странице.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('На этой позиции нет руны');
    expect(JSON.stringify(replies[0]?.keyboard)).toBe(JSON.stringify(createRuneKeyboard()));
  });

  it('оставляет игрока в боевом контексте при повторном stale нажатии атаки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака' });

    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('enemy_turn', 'Сейчас ход противника.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Сейчас ход противника');
    expect(replies[0]?.message).toContain('⚔️ Бой');
  });

  it('проходит сценарий пропуска обучения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'пропустить обучение' });

    await handler.handle(ctx as never);

    expect(services.skipTutorial.execute).toHaveBeenCalledWith(1001);
    expect(getReplyCalls(ctx)[0]?.message).toContain('Рекомендуемый уровень угрозы');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Исследовать');
  });
});
