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
  readonly peerId?: number;
  readonly id?: number;
  readonly conversationMessageId?: number;
  readonly text?: string;
  readonly command?: string;
  readonly intentId?: string;
  readonly stateKey?: string;
}

type ReplyMock = ReturnType<typeof vi.fn>;

interface FakeContext {
  readonly senderId: number;
  readonly peerId: number;
  readonly id: number;
  readonly conversationMessageId: number;
  readonly text: string;
  readonly messagePayload: { command?: string; intentId?: string; stateKey?: string } | null;
  readonly reply: ReplyMock;
}

const createFakeContext = (input: FakeContextInput): FakeContext => {
  const reply = vi.fn().mockResolvedValue(undefined);

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
    expect(getReplyCalls(ctx)[0]?.message).toContain('Дальше: нажмите «⚔️ Исследовать»');
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
    expect(replies[0]?.message).toContain('Дальше: нажмите «⚔️ Учебный бой»');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Учебный бой');
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
    expect(getReplyCalls(locationContext)[0]?.message).toContain('Обучение');
    expect(getReplyCalls(locationContext)[0]?.message).toContain('первую руну');
    expect(getReplyCalls(exploreContext)[0]?.message).toContain('⚔️ Бой');
    expect(getReplyCalls(exploreContext)[0]?.message).toContain('Доступные действия');
  });

  it('выводит server-owned legacy intent для текстового исследования', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'исследовать', id: 517, conversationMessageId: 93, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.exploreLocation.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:93:исследовать', undefined, 'legacy_text');
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
    expect(replies[0]?.message).toContain('Обучение уже пропущено');
    expect(replies[0]?.message).toContain('Сейчас открыт режим приключений');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Исследовать');
    expect(JSON.stringify(replies[0]?.keyboard)).not.toContain('Учебный бой');
  });

  it('возвращает в активный бой, если открыть локацию во время сражения', async () => {
    const services = createServices();
    vi.mocked(services.enterTutorialMode.execute).mockRejectedValueOnce(
      new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом возвращайтесь к экрану обучения.'),
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
      new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом возвращайтесь к экрану обучения.'),
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
      new AppError('stale_command_intent', 'Этот экран обучения уже устарел. Я открыл актуальный маршрут героя.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Этот экран обучения уже устарел');
    expect(replies[0]?.message).toContain('📘 Обучение');
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
    expect(replies[0]?.message).toContain('Дальше: нажмите «⚔️ Исследовать»');
    expect(replies[0]?.message).not.toContain('Учебный бой');
  });

  it('нормализует алиас возврата в мир к adventure recap', async () => {
    const services = createServices();
    vi.mocked(services.returnToAdventure.execute).mockResolvedValueOnce(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }));
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'в мир' });

    await handler.handle(ctx as never);

    expect(services.returnToAdventure.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:77:в приключения', undefined, 'legacy_text');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Дальше: нажмите «⚔️ Исследовать»');
  });

  it('проходит сценарий завершения боя', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-1', stateKey: 'state-battle-1' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'ATTACK', 'intent-battle-1', 'state-battle-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Завершённый бой');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Победа.');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🎯 Следующая цель: начните «⚔️ Новый бой»');
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
      .mockRejectedValueOnce(new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.'));
    vi.mocked(services.getPlayerProfile.execute).mockRejectedValueOnce(
      new AppError('player_not_found', 'Персонаж не найден. Нажмите «🎮 Начать», чтобы создать нового мастера.'),
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
      new AppError('stale_command_intent', 'Это подтверждение уже устарело. Я вернул вас в профиль: начните удаление заново, если всё ещё хотите удалить персонажа.'),
    );

    await handler.handle(ctx as never);

    expect(services.deletePlayer.execute).toHaveBeenCalledWith(1001, 'intent-delete-2', 'stale-delete-state', 'payload');
    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Это подтверждение уже устарело');
    expect(replies[0]?.message).toContain('👤 Профиль');
  });

  it('пробрасывает intentId для крафта руны через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'создать', intentId: 'intent-craft-1', stateKey: 'state-craft-1' });

    await handler.handle(ctx as never);

    expect(services.craftRune.execute).toHaveBeenCalledWith(1001, 'intent-craft-1', 'state-craft-1', 'payload');
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

    expect(services.equipCurrentRune.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:82:надеть', undefined, 'legacy_text');
  });

  it('выводит server-owned legacy intent для текстового снятия руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ text: 'снять', id: 507, conversationMessageId: 83, peerId: 2000000001 });

    await handler.handle(ctx as never);

    expect(services.unequipCurrentRune.execute).toHaveBeenCalledWith(1001, 'legacy-text:2000000001:1001:83:снять', undefined, 'legacy_text');
  });

  it('пробрасывает intentId для экипировки руны через transport payload', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть', intentId: 'intent-equip-1', stateKey: 'state-equip-1' });

    await handler.handle(ctx as never);

    expect(services.equipCurrentRune.execute).toHaveBeenCalledWith(1001, 'intent-equip-1', 'state-equip-1', 'payload');
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
      log: ['🌀 Импульс углей прожигает Учебный огонёк на 5 урона.'],
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce(runeSkillBattle);
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
      log: ['🛡️ Вы занимаете защитную стойку и готовите защиту на 2 урона.'],
      turnOwner: 'ENEMY',
    });
    vi.mocked(services.performBattleAction.execute).mockResolvedValueOnce(defendBattle);
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'защита', intentId: 'intent-battle-defend-1', stateKey: 'state-battle-defend-1' });

    await handler.handle(ctx as never);

    expect(services.performBattleAction.execute).toHaveBeenCalledWith(1001, 'DEFEND', 'intent-battle-defend-1', 'state-battle-defend-1', 'payload');
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
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-2', stateKey: 'state-battle-2' });

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
    const ctx = createFakeContext({ command: 'защита', intentId: 'intent-battle-3', stateKey: 'state-battle-3' });

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
    const ctx = createFakeContext({ command: 'руна слот 1', intentId: 'intent-rune-slot-1', stateKey: 'state-rune-slot-1' });

    await handler.handle(ctx as never);

    expect(services.selectRunePageSlot.execute).toHaveBeenCalledWith(1001, 0, 'intent-rune-slot-1', 'state-rune-slot-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Руны и мастерская');
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
      new AppError('rune_slot_not_found', 'На этой позиции нет руны. Выберите другой слот на странице.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('На этой позиции нет руны');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('✨ Создать');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('🗑️ Распылить');
  });

  it('восстанавливает rune hub после stale перелистывания страницы', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руны >', intentId: 'intent-rune-page-2', stateKey: 'state-rune-page-2' });

    vi.mocked(services.moveRuneCursor.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Этот экран рун уже устарел. Я открыл актуальные руны.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Этот экран рун уже устарел');
    expect(replies[0]?.message).toContain('Руны и мастерская');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('руны >');
  });

  it('восстанавливает rune hub после pending выбора слота', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'руна слот 1', intentId: 'intent-rune-slot-3', stateKey: 'state-rune-slot-3' });

    vi.mocked(services.selectRunePageSlot.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Команда уже обрабатывается');
    expect(replies[0]?.message).toContain('Руны и мастерская');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('руна слот 1');
  });

  it('оставляет игрока в боевом контексте при повторном stale нажатии атаки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'атака', intentId: 'intent-battle-4', stateKey: 'state-battle-4' });

    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Эта кнопка уже устарела');
    expect(replies[0]?.message).toContain('⚔️ Бой');
  });

  it('возвращает текущий бой при pending retry battle intent', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'защита', intentId: 'intent-battle-5', stateKey: 'state-battle-5' });

    vi.mocked(services.performBattleAction.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Команда уже обрабатывается');
    expect(replies[0]?.message).toContain('⚔️ Бой');
  });

  it('восстанавливает контекст приключения после stale explore intent', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'исследовать', intentId: 'intent-explore-1', stateKey: 'state-explore-1' });

    vi.mocked(services.getActiveBattle.execute).mockResolvedValueOnce(null);
    vi.mocked(services.exploreLocation.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Этот вход в приключение уже устарел. Я вернул актуальный контекст приключения.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Этот вход в приключение уже устарел');
    expect(replies[0]?.message).toContain('📘 Обучение');
  });

  it('восстанавливает рунный контекст после pending retry для перековки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: '~атк', intentId: 'intent-reroll-1', stateKey: 'state-reroll-1' });

    vi.mocked(services.rerollCurrentRuneStat.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Команда уже обрабатывается');
    expect(replies[0]?.message).toContain('Руны и мастерская');
    expect(replies[0]?.message).toContain('Перековка свойства');
  });

  it('восстанавливает рунный контекст после stale экипировки', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'надеть', intentId: 'intent-equip-1', stateKey: 'state-equip-1' });

    vi.mocked(services.equipCurrentRune.execute).mockRejectedValueOnce(
      new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Эта кнопка уже устарела');
    expect(replies[0]?.message).toContain('Руны и мастерская');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('intentId');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('надеть');
  });

  it('восстанавливает рунный контекст после pending retry для снятия руны', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'снять', intentId: 'intent-unequip-1', stateKey: 'state-unequip-1' });

    vi.mocked(services.unequipCurrentRune.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Команда уже обрабатывается');
    expect(replies[0]?.message).toContain('Руны и мастерская');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('снять');
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

  it('показывает return recap при возврате в приключения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения', intentId: 'intent-return-1', stateKey: 'state-return-1' });

    await handler.handle(ctx as never);

    expect(services.returnToAdventure.execute).toHaveBeenCalledWith(1001, 'intent-return-1', 'state-return-1', 'payload');
    expect(getReplyCalls(ctx)[0]?.message).toContain('🧭 Возвращение в приключения');
    expect(getReplyCalls(ctx)[0]?.message).toContain('Дальше: нажмите');
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
      new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Эта кнопка уже устарела');
    expect(replies[0]?.message).toContain('📘 Обучение');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('пропустить обучение');
  });

  it('восстанавливает текущий location контекст после pending возврата в приключения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения', intentId: 'intent-return-2', stateKey: 'state-return-2' });

    vi.mocked(services.returnToAdventure.execute).mockRejectedValueOnce(
      new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Команда уже обрабатывается');
    expect(replies[0]?.message).toContain('📘 Обучение');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('Учебный бой');
  });

  it('возвращает в активный бой, если tutorial navigation вызван во время сражения', async () => {
    const services = createServices();
    const handler = new GameHandler(services);
    const ctx = createFakeContext({ command: 'в приключения', intentId: 'intent-return-3', stateKey: 'state-return-3' });

    vi.mocked(services.returnToAdventure.execute).mockRejectedValueOnce(
      new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом меняйте маршрут приключения.'),
    );

    await handler.handle(ctx as never);

    const replies = getReplyCalls(ctx);
    expect(replies[0]?.message).toContain('Сначала завершите текущий бой');
    expect(replies[0]?.message).toContain('⚔️ Бой');
    expect(JSON.stringify(replies[0]?.keyboard)).toContain('атака');
  });
});
