import { describe, expect, it } from 'vitest';

import type { GameRandom } from '../../../shared/domain/GameRandom';
import type { BattleView, RuneDraft } from '../../../shared/types/game';
import { RewardEngine } from './reward-engine';

const createDeterministicRandom = (values: number[]): GameRandom => {
  let index = 0;

  const nextValue = (): number => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };

  return {
    nextInt(min, max) {
      const raw = nextValue();
      const range = max - min + 1;
      return min + ((raw % range) + range) % range;
    },
    rollPercentage(chancePercent) {
      return nextValue() <= chancePercent;
    },
    pickOne(items) {
      return items[this.nextInt(0, items.length - 1)]!;
    },
  };
};

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 1,
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
    attack: 1,
    defence: 0,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 0,
    currentHealth: 0,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 6,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'касается искрой',
  },
  log: ['🏁 Победа.'],
  result: 'VICTORY',
  rewards: {
    experience: 6,
    gold: 2,
    shards: {},
    droppedRune: null,
  },
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const tutorialRune: RuneDraft = {
  name: 'Необычная руна Пламени',
  rarity: 'UNUSUAL',
  isEquipped: false,
  archetypeCode: 'ember',
  activeAbilityCodes: ['ember_pulse'],
  passiveAbilityCodes: ['ember_heart'],
  health: 2,
  attack: 3,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
};

describe('RewardEngine', () => {
  it('может принудительно выдать обучающую руну как боевую награду', () => {
    const rewarded = RewardEngine.applyVictoryRewards(createBattle(), { forcedRune: tutorialRune });

    expect(rewarded.droppedRune).toEqual(tutorialRune);
    expect(rewarded.battle.rewards?.droppedRune).toEqual(tutorialRune);
    expect(rewarded.battle.log.some((entry) => entry.includes('Необычная руна Пламени'))).toBe(true);
  });

  it('делает battle rune drop детерминированным при явном RNG port', () => {
    const rewarded = RewardEngine.applyVictoryRewards(
      createBattle({
        enemy: {
          ...createBattle().enemy,
          runeDropChance: 100,
        },
      }),
      {},
      createDeterministicRandom([0, 0, 1, 2, 3, 4]),
    );

    expect(rewarded.droppedRune).not.toBeNull();
    expect(rewarded.battle.rewards?.droppedRune).toEqual(rewarded.droppedRune);
  });
});
