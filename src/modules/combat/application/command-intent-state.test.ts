import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../shared/types/game';

import { buildBattleActionIntentStateKey } from './command-intent-state';

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

describe('battle command intent state keys', () => {
  it('changes when action revision changes', () => {
    const before = createBattle({ actionRevision: 0 });
    const after = createBattle({ actionRevision: 1 });

    expect(buildBattleActionIntentStateKey(before, 'ATTACK')).not.toBe(buildBattleActionIntentStateKey(after, 'ATTACK'));
  });

  it('changes when rune skill readiness changes', () => {
    const before = createBattle({
      player: {
        ...createBattle().player,
        currentMana: 4,
      },
    });
    const after = createBattle({
      player: {
        ...createBattle().player,
        currentMana: 2,
      },
    });

    expect(buildBattleActionIntentStateKey(before, 'RUNE_SKILL')).not.toBe(buildBattleActionIntentStateKey(after, 'RUNE_SKILL'));
  });
});
