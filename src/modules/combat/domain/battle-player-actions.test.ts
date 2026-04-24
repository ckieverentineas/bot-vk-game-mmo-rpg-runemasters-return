import { describe, expect, it } from 'vitest';

import { getAlchemyConsumable } from '../../consumables/domain/alchemy-consumables';
import type { BattleView } from '../../../shared/types/game';
import {
  performPlayerAttack,
  performPlayerDefend,
  performRuneSkill,
  useBattleConsumable,
} from './battle-player-actions';

type BattlePlayerSnapshot = BattleView['player'];
type BattleRuneLoadoutSnapshot = NonNullable<BattlePlayerSnapshot['runeLoadout']>;

const createPlayerSnapshot = (
  overrides: Partial<BattlePlayerSnapshot> = {},
): BattlePlayerSnapshot => ({
  playerId: 1,
  name: 'Tester',
  attack: 4,
  defence: 2,
  magicDefence: 1,
  dexterity: 3,
  intelligence: 4,
  maxHealth: 20,
  currentHealth: 10,
  maxMana: 8,
  currentMana: 8,
  runeLoadout: null,
  supportRuneLoadout: null,
  guardPoints: 0,
  ...overrides,
});

const createEmberRuneLoadout = (): BattleRuneLoadoutSnapshot => ({
  runeId: 'rune-ember',
  runeName: 'Ember Rune',
  archetypeCode: 'ember',
  archetypeName: 'Ember',
  passiveAbilityCodes: [],
  activeAbility: {
    code: 'ember_pulse',
    name: 'Ember Pulse',
    manaCost: 2,
    cooldownTurns: 2,
    currentCooldown: 0,
  },
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-player-actions-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'blue-slime',
  turnOwner: 'PLAYER',
  player: createPlayerSnapshot(),
  enemy: {
    code: 'blue-slime',
    name: 'Blue Slime',
    kind: 'slime',
    isElite: false,
    isBoss: false,
    attack: 3,
    defence: 1,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 12,
    currentHealth: 12,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 10,
    goldReward: 4,
    runeDropChance: 0,
    attackText: 'hits',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['Battle started.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

describe('battle player actions', () => {
  it('resolves a basic attack and hands the turn to the enemy', () => {
    const battle = createBattle();
    const enemyHealthBeforeAction = battle.enemy.currentHealth;

    const resolved = performPlayerAttack(battle);

    expect(resolved.enemy.currentHealth).toBeLessThan(enemyHealthBeforeAction);
    expect(resolved.turnOwner).toBe('ENEMY');
    expect(resolved.log.length).toBeGreaterThan(1);
  });

  it('adds guard when the player defends', () => {
    const battle = createBattle();

    const resolved = performPlayerDefend(battle);

    expect(resolved.player.guardPoints).toBeGreaterThan(0);
    expect(resolved.turnOwner).toBe('ENEMY');
  });

  it('spends mana and starts cooldown for rune skills', () => {
    const battle = createBattle({
      player: createPlayerSnapshot({
        runeLoadout: createEmberRuneLoadout(),
      }),
    });
    const enemyHealthBeforeAction = battle.enemy.currentHealth;

    const resolved = performRuneSkill(battle, 'RUNE_SKILL_SLOT_1');

    expect(resolved.enemy.currentHealth).toBeLessThan(enemyHealthBeforeAction);
    expect(resolved.player.currentMana).toBe(6);
    expect(resolved.player.runeLoadout?.activeAbility?.currentCooldown).toBe(2);
    expect(resolved.turnOwner).toBe('ENEMY');
  });

  it('uses battle consumables without ending the player turn', () => {
    const battle = createBattle({
      player: createPlayerSnapshot({
        currentHealth: 6,
      }),
    });

    const resolved = useBattleConsumable(battle, getAlchemyConsumable('healing_pill'));

    expect(resolved.player.currentHealth).toBe(12);
    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.log.length).toBeGreaterThan(1);
  });
});
