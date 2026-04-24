import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../../shared/types/game';
import { buildBattleClarityView } from './battle-clarity';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 1,
  locationLevel: 3,
  biomeCode: 'dark-forest',
  enemyCode: 'storm-lynx',
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
      schoolCode: 'ember',
      schoolMasteryRank: 0,
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
    code: 'storm-lynx',
    name: 'Шквальная рысь',
    kind: 'wolf',
    isElite: true,
    isBoss: false,
    attack: 7,
    defence: 2,
    magicDefence: 2,
    dexterity: 9,
    intelligence: 5,
    maxHealth: 23,
    currentHealth: 12,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 24,
    goldReward: 9,
    runeDropChance: 28,
    attackText: 'срывается шквальным выпадом',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['⚔️ Бой начался.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  ...overrides,
});

const createIntent = (code: 'HEAVY_STRIKE' | 'GUARD_BREAK') => (
  code === 'HEAVY_STRIKE'
    ? {
        code,
        title: 'Тяжёлый удар',
        description: 'Следующий удар будет сильнее.',
        bonusAttack: 2,
      } as const
    : {
        code,
        title: 'Пробивающий удар',
        description: 'Следующий удар разобьёт защиту.',
        bonusAttack: 1,
        shattersGuard: true,
      } as const
);

const createReadableEnemy = (code: 'HEAVY_STRIKE' | 'GUARD_BREAK'): BattleView['enemy'] => ({
  ...createBattle().enemy,
  isElite: false,
  magicDefence: 0,
  intelligence: 1,
  knowledge: {
    isDiscovered: true,
    hasTrophyStudy: true,
    victoryCount: 1,
  },
  intent: createIntent(code),
});

describe('buildBattleClarityView', () => {
  it('builds a compact state line with guard and enemy risk', () => {
    const clarity = buildBattleClarityView(createBattle({
      player: {
        ...createBattle().player,
        guardPoints: 3,
      },
      enemy: createReadableEnemy('HEAVY_STRIKE'),
    }));

    expect(clarity.stateLine).toContain('щит 3');
    expect(clarity.stateLine).toContain('враг готовит тяжёлый удар');
    expect(clarity.choiceLine).toContain('тяжёлый удар лучше встретить защитой');
  });

  it('keeps a high-mental enemy intent vague without divination or study', () => {
    const clarity = buildBattleClarityView(createBattle({
      enemy: {
        ...createBattle().enemy,
        intent: createIntent('HEAVY_STRIKE'),
      },
    }));

    expect(clarity.stateLine).toContain('замысел врага не прочитан');
    expect(clarity.choiceLine).toContain('опасный замысел');
    expect(clarity.choiceLine).not.toContain('тяжёлый удар');
  });

  it('shows a rune window when a ready active rune can answer revealed intent', () => {
    const clarity = buildBattleClarityView(createBattle({
      enemy: createReadableEnemy('GUARD_BREAK'),
    }));

    expect(clarity.choiceLine).toContain('атакой или готовой руной');
    expect(clarity.choiceLine).toContain('чистую защиту оставьте');
  });

  it('builds an ember-specific pressure hint against guard-break', () => {
    const clarity = buildBattleClarityView(createBattle({
      enemy: createReadableEnemy('GUARD_BREAK'),
    }));

    expect(clarity.schoolHintLine).toContain('окно давления');
    expect(clarity.schoolHintLine).toContain('пробивающий удар');
  });

  it('builds a stone-specific hold hint against heavy strike', () => {
    const clarity = buildBattleClarityView(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          runeName: 'Руна Тверди',
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          schoolCode: 'stone',
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
      enemy: createReadableEnemy('HEAVY_STRIKE'),
    }));

    expect(clarity.schoolHintLine).toContain('Твердь');
    expect(clarity.schoolHintLine).toContain('держать');
  });

  it('builds a seal-specific hint once a rare school seal is equipped', () => {
    const clarity = buildBattleClarityView(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          runeName: 'Редкая руна Пламени',
          runeRarity: 'RARE',
          schoolProgressStage: 'SEAL',
          schoolCode: 'ember',
        },
      },
    }));

    expect(clarity.schoolHintLine).toContain('Печать Пламени');
    expect(clarity.schoolHintLine).toContain('давление печати');
  });

  it('builds a gale-specific hint on ready gale step', () => {
    const clarity = buildBattleClarityView(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          runeName: 'Руна Бури',
          runeRarity: 'UNUSUAL',
          schoolProgressStage: 'FIRST_SIGN',
          archetypeCode: 'gale',
          archetypeName: 'Налётчик',
          schoolCode: 'gale',
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
    }));

    expect(clarity.schoolHintLine).toContain('Первый знак Бури');
    expect(clarity.schoolHintLine).toContain('Шагом шквала');
  });

  it('builds a gale-specific tempo hint when gale step can answer intent', () => {
    const clarity = buildBattleClarityView(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          runeName: 'Руна Бури',
          archetypeCode: 'gale',
          archetypeName: 'Налётчик',
          schoolCode: 'gale',
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
      enemy: createReadableEnemy('HEAVY_STRIKE'),
    }));

    expect(clarity.schoolHintLine).toContain('окно темпа');
    expect(clarity.schoolHintLine).toContain('Шаг шквала');
  });

  it('builds an echo-specific hint around revealed intent', () => {
    const clarity = buildBattleClarityView(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          ...createBattle().player.runeLoadout!,
          runeName: 'Руна Прорицания',
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
        intent: createIntent('GUARD_BREAK'),
      },
    }));

    expect(clarity.schoolHintLine).toContain('Пробивающий удар');
    expect(clarity.schoolHintLine).toContain('прочитан');
  });
});
