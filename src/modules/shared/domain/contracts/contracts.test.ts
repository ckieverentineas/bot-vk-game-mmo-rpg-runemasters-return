import { describe, expect, it } from 'vitest';

import type { BattleView, RuneView } from '../../../../shared/types/game';

import { buildBattleSnapshot, isBattleSnapshot } from './battle-snapshot';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from './loadout-snapshot';
import { createAppliedRewardLedgerEntry } from './reward-ledger';
import { createBattleVictoryRewardIntent } from './reward-intent';

const createRune = (): RuneView => ({
  id: 'rune-1',
  runeCode: 'rune-1',
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: 'Обычная руна Пламени',
  rarity: 'USUAL',
  isEquipped: true,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  createdAt: '2026-04-12T00:00:00.000Z',
});

const createBattle = (): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 1,
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
    runeLoadout: null,
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
    currentHealth: 0,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 4,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'бьёт',
  },
  log: ['Победа.'],
  result: 'VICTORY',
  rewards: {
    experience: 4,
    gold: 2,
    shards: { USUAL: 2 },
    droppedRune: null,
  },
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
});

describe('battle platform contracts', () => {
  it('builds a versioned loadout snapshot and projects it back into battle state', () => {
    const snapshot = buildLoadoutSnapshot(createRune());

    expect(snapshot?.schemaVersion).toBe(1);
    expect(snapshot?.activeAbility?.code).toBe('ember_pulse');

    const projected = projectBattleRuneLoadout(snapshot, 1);

    expect(projected).toMatchObject({
      runeId: 'rune-1',
      archetypeCode: 'ember',
      archetypeName: 'Штурм',
    });
    expect(projected?.activeAbility?.currentCooldown).toBe(1);
  });

  it('creates a canonical reward intent and applied ledger entry for a battle victory', () => {
    const intent = createBattleVictoryRewardIntent(1, createBattle());

    expect(intent).not.toBeNull();
    expect(intent?.schemaVersion).toBe(1);
    expect(intent?.intentId).toBe('battle-victory:battle-1');

    const ledger = createAppliedRewardLedgerEntry(intent!, '2026-04-17T00:00:00.000Z');

    expect(ledger).toMatchObject({
      schemaVersion: 1,
      ledgerKey: 'battle-victory:battle-1',
      status: 'APPLIED',
      sourceType: 'BATTLE_VICTORY',
      sourceId: 'battle-1',
      playerId: 1,
    });
  });

  it('builds a versioned battle snapshot contract for persisted battle state', () => {
    const snapshot = buildBattleSnapshot(createBattle());

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.actionRevision).toBe(1);
    expect(isBattleSnapshot(snapshot)).toBe(true);
    expect(snapshot.player.playerId).toBe(1);
    expect(snapshot.enemy.code).toBe('slime');
    expect(snapshot.rewards?.gold).toBe(2);
  });
});
