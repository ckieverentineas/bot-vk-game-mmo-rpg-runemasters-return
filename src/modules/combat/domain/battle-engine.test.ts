import { describe, expect, it, vi, afterEach } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import { BattleEngine } from './battle-engine';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'blue-slime',
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
    runeLoadout: {
      runeId: 'rune-1',
      runeName: 'Руна Пламени',
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
    guardPoints: 0,
  },
  enemy: {
    code: 'blue-slime',
    name: 'Синий слизень',
    kind: 'slime',
    isElite: false,
    isBoss: false,
    attack: 3,
    defence: 1,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 10,
    goldReward: 4,
    runeDropChance: 0,
    attackText: 'бьёт',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['Враг найден.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BattleEngine', () => {
  it('завершает бой победой, если атака добивает врага', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      enemy: {
        ...createBattle().enemy,
        currentHealth: 3,
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.status).toBe('COMPLETED');
    expect(resolved.result).toBe('VICTORY');
    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.rewards?.experience).toBe(10);
  });

  it('не даёт защите опустить урон ниже единицы', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        defence: 999,
        currentHealth: 5,
        maxHealth: 5,
      },
      enemy: {
        ...createBattle().enemy,
        attack: 1,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.player.currentHealth).toBe(4);
    expect(resolved.turnOwner).toBe('PLAYER');
  });

  it('позволяет применить рунный навык и тратит ману с откатом', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle();

    const resolved = BattleEngine.useRuneSkill(battle);

    expect(resolved.player.currentMana).toBe(1);
    expect(resolved.player.runeLoadout?.activeAbility?.currentCooldown).toBe(2);
    expect(resolved.turnOwner).toBe('ENEMY');
    expect(resolved.log.some((entry) => entry.includes('Импульс углей'))).toBe(true);
  });

  it('школа пламени усиливает базовую атаку постоянным давлением', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      enemy: {
        ...createBattle().enemy,
        currentHealth: 8,
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.enemy.currentHealth).toBe(3);
    expect(resolved.log.some((entry) => entry.includes('Школа Пламени'))).toBe(true);
  });

  it('даёт игроку универсальную защиту вместо атаки', () => {
    const battle = createBattle();

    const resolved = BattleEngine.defend(battle);

    expect(resolved.turnOwner).toBe('ENEMY');
    expect(resolved.player.guardPoints).toBeGreaterThan(0);
    expect(resolved.log.some((entry) => entry.includes('защитную стойку'))).toBe(true);
  });

  it('школа тверди усиливает защитную стойку', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          passiveAbilityCodes: ['stone_guard'],
          activeAbility: null,
        },
      },
    });

    const resolved = BattleEngine.defend(battle);

    expect(resolved.player.guardPoints).toBe(4);
  });

  it('школа тверди даёт активный отпор против опасного хода', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        defence: 5,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'stone',
          archetypeName: 'Страж',
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
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее обычной.',
          bonusAttack: 3,
        },
      },
    });

    const resolved = BattleEngine.useRuneSkill(battle);

    expect(resolved.player.currentMana).toBe(2);
    expect(resolved.player.guardPoints).toBeGreaterThanOrEqual(6);
    expect(resolved.log.some((entry) => entry.includes('Каменный отпор'))).toBe(true);
    expect(resolved.log.some((entry) => entry.includes('Школа Тверди'))).toBe(true);
  });

  it('школа прорицания превращает телеграф врага в усиленную атаку', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'echo',
          archetypeName: 'Провидец',
          passiveAbilityCodes: ['echo_mind'],
          activeAbility: null,
        },
      },
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее обычной.',
          bonusAttack: 3,
        },
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.enemy.currentHealth).toBe(3);
    expect(resolved.log.some((entry) => entry.includes('Школа Прорицания'))).toBe(true);
  });

  it('телеграфирует тяжёлый удар у подходящего врага вместо обычной атаки', () => {
    const battle = createBattle({
      turnOwner: 'ENEMY',
      enemy: {
        ...createBattle().enemy,
        kind: 'wolf',
        name: 'Лесной волк',
        currentHealth: 8,
        maxHealth: 12,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.enemy.intent?.code).toBe('HEAVY_STRIKE');
    expect(resolved.log.some((entry) => entry.includes('готовит'))).toBe(true);
  });

  it('разыгрывает тяжёлый удар после телеграфа и сбрасывает намерение', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        guardPoints: 2,
      },
      enemy: {
        ...createBattle().enemy,
        kind: 'wolf',
        name: 'Лесной волк',
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее обычной.',
          bonusAttack: 3,
        },
        hasUsedSignatureMove: false,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.enemy.intent).toBeNull();
    expect(resolved.enemy.hasUsedSignatureMove).toBe(true);
    expect(resolved.player.currentHealth).toBeLessThan(8);
    expect(resolved.turnOwner).toBe('PLAYER');
  });

  it('телеграфирует пробивающий удар у подходящего врага', () => {
    const battle = createBattle({
      turnOwner: 'ENEMY',
      enemy: {
        ...createBattle().enemy,
        kind: 'slime',
        name: 'Синий слизень',
        currentHealth: 6,
        maxHealth: 12,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.enemy.intent?.code).toBe('GUARD_BREAK');
    expect(resolved.log.some((entry) => entry.includes('сработает хуже'))).toBe(true);
  });

  it('пробивающий удар ломает защиту перед уроном', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        guardPoints: 5,
      },
      enemy: {
        ...createBattle().enemy,
        kind: 'slime',
        intent: {
          code: 'GUARD_BREAK',
          title: 'Кислотный прорыв',
          description: 'Следующий удар разобьёт защиту.',
          bonusAttack: 2,
          shattersGuard: true,
        },
        hasUsedSignatureMove: false,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.enemy.intent).toBeNull();
    expect(resolved.player.guardPoints).toBe(0);
    expect(resolved.player.currentHealth).toBeLessThan(8);
    expect(resolved.log.some((entry) => entry.includes('разбивает вашу защиту'))).toBe(true);
  });

  it('снижает откат после вражеского хода и расходует рунную защиту', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          activeAbility: {
            ...createBattle().player.runeLoadout!.activeAbility!,
            code: 'gale_step',
            name: 'Шаг шквала',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 2,
          },
        },
        guardPoints: 3,
      },
      enemy: {
        ...createBattle().enemy,
        attack: 6,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.player.guardPoints).toBe(0);
    expect(resolved.player.runeLoadout?.activeAbility?.currentCooldown).toBe(1);
    expect(resolved.player.currentHealth).toBeLessThan(8);
  });

  it('не позволяет gale step бесконечно накапливать защиту', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          activeAbility: {
            ...createBattle().player.runeLoadout!.activeAbility!,
            code: 'gale_step',
            name: 'Шаг шквала',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
        guardPoints: 99,
      },
    });

    const resolved = BattleEngine.useRuneSkill(battle);

    expect(resolved.player.guardPoints).toBeLessThanOrEqual(8);
  });
});
