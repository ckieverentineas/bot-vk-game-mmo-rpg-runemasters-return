import { describe, expect, it, vi, afterEach } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import { getAlchemyConsumable } from '../../consumables/domain/alchemy-consumables';
import { BattleEngine } from './battle-engine';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
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
  it('passes the turn through both party members before the enemy acts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const firstMember = createBattle().player;
    const secondMember = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
      attack: 3,
      currentHealth: 7,
      maxHealth: 7,
    };
    const battle = createBattle({
      battleType: 'PARTY_PVE',
      enemy: {
        ...createBattle().enemy,
        currentHealth: 30,
      },
      party: {
        id: 'party-1',
        inviteCode: 'ABC123',
        leaderPlayerId: 1,
        currentTurnPlayerId: 1,
        enemyTargetPlayerId: null,
        actedPlayerIds: [],
        members: [
          { playerId: 1, vkId: 1001, name: firstMember.name, snapshot: firstMember },
          { playerId: 2, vkId: 1002, name: secondMember.name, snapshot: secondMember },
        ],
      },
    });

    const afterFirstAction = BattleEngine.attack(battle);

    expect(afterFirstAction.status).toBe('ACTIVE');
    expect(afterFirstAction.turnOwner).toBe('PLAYER');
    expect(afterFirstAction.player.playerId).toBe(2);
    expect(afterFirstAction.party?.currentTurnPlayerId).toBe(2);
    expect(afterFirstAction.party?.actedPlayerIds).toEqual([1]);

    const afterSecondAction = BattleEngine.attack(afterFirstAction);

    expect(afterSecondAction.status).toBe('ACTIVE');
    expect(afterSecondAction.turnOwner).toBe('ENEMY');
    expect(afterSecondAction.party?.currentTurnPlayerId).toBeNull();
    expect(afterSecondAction.party?.actedPlayerIds).toEqual([1, 2]);

    const afterEnemyTurn = BattleEngine.resolveEnemyTurn(afterSecondAction);

    expect(afterEnemyTurn.status).toBe('ACTIVE');
    expect(afterEnemyTurn.turnOwner).toBe('PLAYER');
    expect(afterEnemyTurn.player.playerId).toBe(1);
    expect(afterEnemyTurn.party?.currentTurnPlayerId).toBe(1);
    expect(afterEnemyTurn.party?.actedPlayerIds).toEqual([]);
  });

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

  it('пишет в логах имена действующего и цели в квадратных скобках', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const playerAttackBattle = BattleEngine.attack(createBattle());
    const enemyAttackBattle = BattleEngine.resolveEnemyTurn(createBattle({ turnOwner: 'ENEMY' }));

    expect(playerAttackBattle.log).toContain('⚔️ [Рунный мастер #1001] наносит 5 урона [Синий слизень].');
    expect(enemyAttackBattle.log).toContain('👾 [Синий слизень] бьёт [Рунный мастер #1001] и наносит 2 урона.');
  });

  it('starts combat from an offered encounter and restores the original first turn', () => {
    const battle = createBattle({
      turnOwner: 'PLAYER',
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'ENEMY',
        canFlee: true,
        fleeChancePercent: 52,
        effectLine: 'Враг начинает с 75% HP, отступить чуть проще: +5%.',
      },
    });

    const resolved = BattleEngine.performPlayerAction(battle, 'ENGAGE');

    expect(resolved.encounter?.status).toBe('ENGAGED');
    expect(resolved.turnOwner).toBe('ENEMY');
    expect(resolved.status).toBe('ACTIVE');
    expect(resolved.log).toContain('🧭 Условие встречи: Враг начинает с 75% HP, отступить чуть проще: +5%.');
  });

  it('can finish an offered encounter as a neutral flee result before combat starts', () => {
    const battle = createBattle({
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 52,
      },
    });

    const resolved = BattleEngine.performPlayerAction(battle, 'FLEE', { fleeSucceeded: true });

    expect(resolved.status).toBe('COMPLETED');
    expect(resolved.result).toBe('FLED');
    expect(resolved.rewards).toBeNull();
    expect(resolved.encounter?.status).toBe('FLED');
  });

  it('blocks normal combat actions while the encounter choice is still pending', () => {
    const battle = createBattle({
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 52,
      },
    });

    expect(() => BattleEngine.performPlayerAction(battle, 'ATTACK')).toThrowError(
      expect.objectContaining({ code: 'battle_encounter_pending' }),
    );
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

  it('позволяет применить пилюлю восстановления без передачи хода', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        currentHealth: 2,
      },
    });

    const resolved = BattleEngine.useConsumable(battle, getAlchemyConsumable('healing_pill'));

    expect(resolved.player.currentHealth).toBe(8);
    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.log.some((entry) => entry.includes('Пилюля восстановления'))).toBe(true);
  });

  it('позволяет применить активное действие второй руны', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        supportRuneLoadout: {
          runeId: 'rune-2',
          runeName: 'Руна Бури',
          archetypeCode: 'gale',
          archetypeName: 'Скиталец',
          schoolCode: 'gale',
          schoolMasteryRank: 0,
          passiveAbilityCodes: [],
          activeAbility: {
            code: 'gale_step',
            name: 'Шаг шквала',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
    });

    const resolved = BattleEngine.performPlayerAction(battle, 'RUNE_SKILL_SLOT_2');

    expect(resolved.player.currentMana).toBe(2);
    expect(resolved.player.supportRuneLoadout?.activeAbility?.currentCooldown).toBe(2);
    expect(resolved.log.some((entry) => entry.includes('Шаг шквала'))).toBe(true);
  });

  it('активная руна получает малый бонус по раскрытому намерению врага', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      enemy: {
        ...createBattle().enemy,
        maxHealth: 8,
        currentHealth: 8,
        intent: {
          code: 'GUARD_BREAK',
          title: 'Кислотный прорыв',
          description: 'Следующий удар разобьёт защиту.',
          bonusAttack: 1,
          shattersGuard: true,
        },
      },
    });

    const resolved = BattleEngine.useRuneSkill(battle);

    expect(resolved.enemy.currentHealth).toBe(1);
    expect(resolved.log.some((entry) => entry.includes('по раскрытому замыслу'))).toBe(true);
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

  it('пламя давит guard-break базовой атакой до слома стойки', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'GUARD_BREAK',
          title: 'Кислотный прорыв',
          description: 'Следующий удар разобьёт защиту.',
          bonusAttack: 1,
          shattersGuard: true,
        },
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.enemy.currentHealth).toBe(2);
    expect(resolved.log.some((entry) => entry.includes('Пламя давит пробивающий замах'))).toBe(true);
  });

  it('печать пламени добавляет заметное давление базовой атаке', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          schoolCode: 'ember',
          schoolProgressStage: 'SEAL',
        },
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.enemy.currentHealth).toBe(2);
    expect(resolved.log.some((entry) => entry.includes('Печать Пламени'))).toBe(true);
  });

  it('мастерство пламени усиливает добивающую атаку по просевшему врагу', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          schoolCode: 'ember',
          schoolMasteryRank: 1,
        },
      },
      enemy: {
        ...createBattle().enemy,
        currentHealth: 4,
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.result).toBe('VICTORY');
    expect(resolved.log.some((entry) => entry.includes('Мастерство Пламени'))).toBe(true);
  });

  it('пламя получает starter synergy после рунной техники в окно добивания', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          schoolCode: 'ember',
          schoolMasteryRank: 1,
          activeAbility: {
            ...createBattle().player.runeLoadout!.activeAbility!,
            currentCooldown: 1,
          },
        },
      },
      enemy: {
        ...createBattle().enemy,
        maxHealth: 16,
        currentHealth: 8,
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.enemy.currentHealth).toBe(1);
    expect(resolved.log.some((entry) => entry.includes('Разогрев Пламени'))).toBe(true);
  });

  it('вторая руна пламени добавляет полное пассивное давление', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          passiveAbilityCodes: [],
          schoolCode: 'ember',
        },
        supportRuneLoadout: {
          runeId: 'rune-slot-2-1',
          runeName: 'Вторая искра',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          schoolMasteryRank: 0,
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: null,
        },
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
    expect(resolved.log.some((entry) => entry.includes('готовит защиту'))).toBe(true);
  });

  it('усиливает защиту, если игрок читает тяжёлый удар и выбирает стойку', () => {
    const battle = createBattle({
      enemy: {
        ...createBattle().enemy,
        kind: 'wolf',
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее обычной.',
          bonusAttack: 3,
        },
      },
    });

    const resolved = BattleEngine.defend(battle);

    expect(resolved.player.guardPoints).toBe(4);
    expect(resolved.log.some((entry) => entry.includes('встать плотнее обычного'))).toBe(true);
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

  it('мастерство тверди добавляет guard к защите', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          schoolCode: 'stone',
          schoolMasteryRank: 1,
          passiveAbilityCodes: ['stone_guard'],
          activeAbility: null,
        },
      },
    });

    const resolved = BattleEngine.defend(battle);

    expect(resolved.player.guardPoints).toBe(5);
    expect(resolved.log.some((entry) => entry.includes('Мастерство Тверди'))).toBe(true);
  });

  it('твердь получает дополнительную стойку против раскрытого тяжёлого удара', () => {
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
      enemy: {
        ...createBattle().enemy,
        kind: 'wolf',
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующая атака врага будет сильнее обычной.',
          bonusAttack: 3,
        },
      },
    });

    const resolved = BattleEngine.defend(battle);

    expect(resolved.player.guardPoints).toBe(7);
    expect(resolved.log.some((entry) => entry.includes('Твердь держит раскрытую угрозу'))).toBe(true);
  });

  it('печать тверди усиливает защитную стойку и показывает payoff', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          schoolCode: 'stone',
          schoolProgressStage: 'SEAL',
          passiveAbilityCodes: ['stone_guard'],
          activeAbility: null,
        },
      },
    });

    const resolved = BattleEngine.defend(battle);

    expect(resolved.player.guardPoints).toBe(5);
    expect(resolved.log.some((entry) => entry.includes('Печать Тверди'))).toBe(true);
  });

  it('вторая руна тверди даёт полный guard-бонус', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          passiveAbilityCodes: [],
          activeAbility: null,
          schoolCode: 'stone',
        },
        supportRuneLoadout: {
          runeId: 'rune-slot-2-2',
          runeName: 'Второй щит',
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          schoolCode: 'stone',
          schoolMasteryRank: 0,
          passiveAbilityCodes: ['stone_guard'],
          activeAbility: null,
        },
      },
    });

    const resolved = BattleEngine.defend(battle);

    expect(resolved.player.guardPoints).toBe(4);
    expect(resolved.log.some((entry) => entry.includes('готовит защиту'))).toBe(true);
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

  it('твердь получает starter synergy, если каменный отпор разыгран из уже собранной стойки', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        guardPoints: 2,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          schoolCode: 'stone',
          schoolMasteryRank: 1,
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
        defence: 1,
      },
    });

    const resolved = BattleEngine.useRuneSkill(battle);

    expect(resolved.enemy.currentHealth).toBe(4);
    expect(resolved.player.guardPoints).toBe(8);
    expect(resolved.log.some((entry) => entry.includes('Ответ стойки'))).toBe(true);
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
          schoolCode: 'echo',
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

  it('мастерство бури оставляет guard после атаки', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'gale',
          archetypeName: 'Налётчик',
          schoolCode: 'gale',
          schoolMasteryRank: 1,
          passiveAbilityCodes: [],
          activeAbility: null,
        },
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.player.guardPoints).toBe(1);
    expect(resolved.log.some((entry) => entry.includes('Мастерство Бури'))).toBe(true);
  });

  it('шаг шквала получает темповую защиту по раскрытому намерению', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'gale',
          archetypeName: 'Налётчик',
          passiveAbilityCodes: [],
          activeAbility: {
            code: 'gale_step',
            name: 'Шаг шквала',
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

    expect(resolved.player.guardPoints).toBe(4);
    expect(resolved.log.some((entry) => entry.includes('Буря забирает темп'))).toBe(true);
  });

  it('печать бури усиливает шаг шквала даже без раскрытого намерения', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'gale',
          archetypeName: 'Налётчик',
          schoolCode: 'gale',
          schoolProgressStage: 'SEAL',
          passiveAbilityCodes: [],
          activeAbility: {
            code: 'gale_step',
            name: 'Шаг шквала',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
    });

    const resolved = BattleEngine.useRuneSkill(battle);

    expect(resolved.player.guardPoints).toBe(4);
    expect(resolved.log.some((entry) => entry.includes('Печать Бури'))).toBe(true);
  });

  it('мастерство прорицания усиливает атаку по раскрытому намерению', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'echo',
          archetypeName: 'Провидец',
          schoolCode: 'echo',
          schoolMasteryRank: 1,
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

    expect(resolved.enemy.currentHealth).toBe(2);
    expect(resolved.log.some((entry) => entry.includes('Мастерство Прорицания'))).toBe(true);
  });

  it('прорицание называет прочитанный intent в результате атаки', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'echo',
          archetypeName: 'Провидец',
          schoolCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbility: null,
        },
      },
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'GUARD_BREAK',
          title: 'Пробивающий удар',
          description: 'Следующий удар разобьёт защиту.',
          bonusAttack: 1,
          shattersGuard: true,
        },
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.log.some((entry) => entry.includes('читает «Пробивающий удар»'))).toBe(true);
  });

  it('печать прорицания добавляет payoff к точному ответу по intent', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          archetypeCode: 'echo',
          archetypeName: 'Провидец',
          schoolCode: 'echo',
          schoolProgressStage: 'SEAL',
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

    expect(resolved.enemy.currentHealth).toBe(2);
    expect(resolved.log.some((entry) => entry.includes('Печать Прорицания'))).toBe(true);
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
    expect(resolved.log.some((entry) => entry.includes('силовой удар'))).toBe(true);
  });

  it('телеграфирует тяжёлый удар раньше, чтобы выбор появился до почти мёртвого врага', () => {
    const battle = createBattle({
      turnOwner: 'ENEMY',
      enemy: {
        ...createBattle().enemy,
        kind: 'wolf',
        name: 'Лесной волк',
        currentHealth: 9,
        maxHealth: 12,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.enemy.intent?.code).toBe('HEAVY_STRIKE');
  });

  it('телеграфирует тяжёлый удар у камнерогого тарана, чтобы школа тверди читалась по делу', () => {
    const battle = createBattle({
      turnOwner: 'ENEMY',
      enemy: {
        ...createBattle().enemy,
        code: 'stonehorn-ram',
        name: 'Камнерогий таран',
        kind: 'boar',
        isElite: true,
        currentHealth: 10,
        maxHealth: 16,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.enemy.intent?.code).toBe('HEAVY_STRIKE');
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
    expect(resolved.log.some((entry) => entry.includes('приём против стойки'))).toBe(true);
  });

  it('телеграфирует пробивающий удар раньше, чтобы защита не была автопилотом', () => {
    const battle = createBattle({
      turnOwner: 'ENEMY',
      enemy: {
        ...createBattle().enemy,
        kind: 'lich',
        name: 'Лич',
        currentHealth: 9,
        maxHealth: 12,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.enemy.intent?.code).toBe('GUARD_BREAK');
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
    expect(resolved.log.some((entry) => entry.includes('[Синий слизень] разбивает защиту [Рунный мастер #1001]'))).toBe(true);
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

  it('медленно восстанавливает ману, когда ход возвращается к игроку', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        currentMana: 1,
      },
      enemy: {
        ...createBattle().enemy,
        attack: 3,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.player.currentMana).toBe(2);
    expect(resolved.log.some((entry) => entry.includes('Рунный фокус: +1 маны'))).toBe(true);
  });

  it('не восстанавливает ману выше максимума', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        currentMana: 4,
        maxMana: 4,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.player.currentMana).toBe(4);
    expect(resolved.log.some((entry) => entry.includes('Рунный фокус'))).toBe(false);
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
