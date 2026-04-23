import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import { resolveBattleActionSkillGains } from './battle-action-skill-growth';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'test',
  enemyCode: 'training-target',
  turnOwner: 'PLAYER',
  player: {
    playerId: 1,
    name: 'Tester',
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 2,
    maxHealth: 10,
    currentHealth: 10,
    maxMana: 8,
    currentMana: 8,
    runeLoadout: null,
    supportRuneLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'training-target',
    name: 'Training target',
    kind: 'training',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 0,
    maxHealth: 12,
    currentHealth: 12,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 1,
    goldReward: 1,
    runeDropChance: 0,
    lootTable: {},
    attackText: 'hits',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: [],
  result: null,
  rewards: null,
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
  ...overrides,
});

describe('resolveBattleActionSkillGains', () => {
  it('grows striking from an attack that damages the enemy', () => {
    const before = createBattle();
    const afterPlayerAction = createBattle({
      enemy: {
        ...before.enemy,
        currentHealth: 8,
      },
    });

    expect(resolveBattleActionSkillGains({
      action: 'ATTACK',
      before,
      afterPlayerAction,
    })).toEqual([
      {
        skillCode: 'combat.striking',
        points: 1,
      },
    ]);
  });

  it('grows guard from a defend action that raises guard points', () => {
    const before = createBattle();
    const afterPlayerAction = createBattle({
      player: {
        ...before.player,
        guardPoints: 4,
      },
    });

    expect(resolveBattleActionSkillGains({
      action: 'DEFEND',
      before,
      afterPlayerAction,
    })).toEqual([
      {
        skillCode: 'combat.guard',
        points: 1,
      },
    ]);
  });

  it('grows guard from the state change when defend answers a revealed heavy strike', () => {
    const before = createBattle({
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Heavy strike',
          description: 'Next hit is stronger.',
          bonusAttack: 2,
        },
      },
    });
    const afterPlayerAction = createBattle({
      player: {
        ...before.player,
        guardPoints: 4,
      },
      enemy: before.enemy,
      log: [],
    });

    expect(resolveBattleActionSkillGains({
      action: 'DEFEND',
      before,
      afterPlayerAction,
    })).toEqual([
      {
        skillCode: 'combat.guard',
        points: 1,
      },
    ]);
  });

  it('grows active rune use from a rune skill that spends mana and starts cooldown', () => {
    const activeAbility = {
      code: 'ember_pulse',
      name: 'Ember pulse',
      manaCost: 2,
      cooldownTurns: 2,
      currentCooldown: 0,
    };
    const before = createBattle({
      player: {
        ...createBattle().player,
        supportRuneLoadout: {
          runeId: 'rune-2',
          runeName: 'Support rune',
          archetypeCode: 'ember',
          archetypeName: 'Ember',
          passiveAbilityCodes: [],
          activeAbility,
        },
      },
    });
    const afterPlayerAction = createBattle({
      player: {
        ...before.player,
        currentMana: 6,
        supportRuneLoadout: {
          ...before.player.supportRuneLoadout!,
          activeAbility: {
            ...activeAbility,
            currentCooldown: 2,
          },
        },
      },
    });

    expect(resolveBattleActionSkillGains({
      action: 'RUNE_SKILL_SLOT_2',
      before,
      afterPlayerAction,
    })).toEqual([
      {
        skillCode: 'rune.active_use',
        points: 1,
      },
    ]);
  });

  it('grows active rune use from resource facts when a rune answers revealed intent', () => {
    const activeAbility = {
      code: 'ember_pulse',
      name: 'Ember pulse',
      manaCost: 2,
      cooldownTurns: 2,
      currentCooldown: 0,
    };
    const before = createBattle({
      player: {
        ...createBattle().player,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Primary rune',
          archetypeCode: 'ember',
          archetypeName: 'Ember',
          passiveAbilityCodes: [],
          activeAbility,
        },
      },
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'GUARD_BREAK',
          title: 'Guard break',
          description: 'Breaks guard.',
          bonusAttack: 1,
          shattersGuard: true,
        },
      },
    });
    const afterPlayerAction = createBattle({
      player: {
        ...before.player,
        currentMana: 6,
        runeLoadout: {
          ...before.player.runeLoadout!,
          activeAbility: {
            ...activeAbility,
            currentCooldown: 2,
          },
        },
      },
      enemy: {
        ...before.enemy,
        currentHealth: 7,
      },
      log: [],
    });

    expect(resolveBattleActionSkillGains({
      action: 'RUNE_SKILL_SLOT_1',
      before,
      afterPlayerAction,
    })).toEqual([
      {
        skillCode: 'rune.active_use',
        points: 1,
      },
    ]);
  });

  it('does not infer growth from log-only changes', () => {
    const before = createBattle();
    const afterPlayerAction = createBattle({
      log: ['The log claims a hit, but state did not change.'],
    });

    expect(resolveBattleActionSkillGains({
      action: 'ATTACK',
      before,
      afterPlayerAction,
    })).toEqual([]);
  });

  it('does not grow skills for encounter actions', () => {
    const before = createBattle();
    const afterPlayerAction = createBattle({
      encounter: {
        status: 'ENGAGED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 50,
      },
    });

    expect(resolveBattleActionSkillGains({
      action: 'ENGAGE',
      before,
      afterPlayerAction,
    })).toEqual([]);
  });
});
