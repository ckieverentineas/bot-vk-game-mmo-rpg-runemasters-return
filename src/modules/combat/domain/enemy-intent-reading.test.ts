import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import { resolveEnemyIntentReading } from './enemy-intent-reading';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 4,
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
    runeLoadout: null,
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
    maxMana: 20,
    currentMana: 20,
    experienceReward: 24,
    goldReward: 9,
    runeDropChance: 28,
    attackText: 'срывается шквальным выпадом',
    intent: {
      code: 'HEAVY_STRIKE',
      title: 'Тяжёлый удар',
      description: 'Следующая атака врага будет сильнее обычной.',
      bonusAttack: 2,
    },
    hasUsedSignatureMove: false,
  },
  log: ['⚔️ Бой начался.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  ...overrides,
});

describe('resolveEnemyIntentReading', () => {
  it('keeps high-mental enemies vague without divination or trophy study', () => {
    const reading = resolveEnemyIntentReading(createBattle());

    expect(reading).toMatchObject({
      precision: 'warning',
      source: 'instinct',
    });
  });

  it('lets Echo mastery pierce the enemy mental guard exactly', () => {
    const reading = resolveEnemyIntentReading(createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          runeId: 'echo-1',
          runeName: 'Руна Прорицания',
          archetypeCode: 'echo',
          archetypeName: 'Провидец',
          schoolCode: 'echo',
          schoolMasteryRank: 1,
          passiveAbilityCodes: ['echo_mind'],
          activeAbility: null,
        },
      },
    }));

    expect(reading).toMatchObject({
      precision: 'exact',
      source: 'divination',
    });
  });

  it('turns repeated trophy study into exact analysis against a familiar enemy', () => {
    const reading = resolveEnemyIntentReading(createBattle({
      enemy: {
        ...createBattle().enemy,
        isElite: false,
        magicDefence: 0,
        intelligence: 1,
        knowledge: {
          isDiscovered: true,
          hasTrophyStudy: true,
          victoryCount: 5,
        },
      },
    }));

    expect(reading).toMatchObject({
      precision: 'exact',
      source: 'trophy_study',
    });
  });
});
