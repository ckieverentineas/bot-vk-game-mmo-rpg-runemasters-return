import { describe, expect, it } from 'vitest';

import type { BattleView, RuneView } from '../../../../shared/types/game';

import { createPendingRewardSnapshot } from '../../../rewards/domain/pending-reward-snapshot';
import type { TrophyActionDefinition } from '../../../rewards/domain/trophy-actions';
import { buildBattleSnapshot, isBattleSnapshot } from './battle-snapshot';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from './loadout-snapshot';
import {
  createAppliedPendingRewardLedgerEntry,
  createAppliedRewardLedgerEntry,
  createPendingRewardLedgerEntry,
  isRewardLedgerEntry,
} from './reward-ledger';
import {
  createQuestRewardLedgerEntry,
  isQuestRewardLedgerEntry,
} from './quest-reward-ledger';
import {
  createDailyActivityLedgerEntry,
  isDailyActivityLedgerEntry,
} from './daily-activity-ledger';
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

const createTrophyActions = (): readonly TrophyActionDefinition[] => [
  {
    code: 'skin_beast',
    label: 'Skin beast',
    skillCodes: ['gathering.skinning'],
    visibleRewardFields: ['leather', 'bone'],
  },
  {
    code: 'claim_all',
    label: 'Claim all',
    skillCodes: [],
    visibleRewardFields: [],
  },
];

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
    expect(isRewardLedgerEntry(ledger)).toBe(true);
  });

  it('creates a canonical pending reward ledger entry from a pending reward snapshot', () => {
    const intent = createBattleVictoryRewardIntent(1, createBattle());
    const snapshot = createPendingRewardSnapshot(intent!, createTrophyActions(), '2026-04-22T00:00:00.000Z');

    const ledger = createPendingRewardLedgerEntry(snapshot);

    expect(ledger).toEqual({
      schemaVersion: 1,
      ledgerKey: 'battle-victory:battle-1',
      status: 'PENDING',
      sourceType: 'BATTLE_VICTORY',
      sourceId: 'battle-1',
      playerId: 1,
      pendingRewardSnapshot: snapshot,
      createdAt: '2026-04-22T00:00:00.000Z',
    });
    expect(isRewardLedgerEntry(ledger)).toBe(true);
  });

  it('creates a canonical applied ledger entry from an applied pending reward snapshot', () => {
    const intent = createBattleVictoryRewardIntent(1, createBattle());
    const snapshot = {
      ...createPendingRewardSnapshot(intent!, createTrophyActions(), '2026-04-22T00:00:00.000Z'),
      status: 'APPLIED' as const,
      selectedActionCode: 'skin_beast' as const,
      appliedResult: {
        baseRewardApplied: true,
        inventoryDelta: {
          usualShards: 2,
          leather: 1,
        },
        skillUps: [
          {
            skillCode: 'gathering.skinning' as const,
            experienceBefore: 0,
            experienceAfter: 1,
            rankBefore: 0,
            rankAfter: 0,
          },
        ],
        statUps: [],
        schoolUps: [],
      },
      updatedAt: '2026-04-22T00:01:00.000Z',
    };

    const ledger = createAppliedPendingRewardLedgerEntry(snapshot, '2026-04-22T00:01:00.000Z');

    expect(ledger).toMatchObject({
      schemaVersion: 1,
      ledgerKey: 'battle-victory:battle-1',
      status: 'APPLIED',
      sourceType: 'BATTLE_VICTORY',
      sourceId: 'battle-1',
      playerId: 1,
      pendingRewardSnapshot: snapshot,
      appliedAt: '2026-04-22T00:01:00.000Z',
    });
    expect(isRewardLedgerEntry(ledger)).toBe(true);
  });

  it('rejects pending reward ledger entries with mismatched snapshot state', () => {
    const intent = createBattleVictoryRewardIntent(1, createBattle());
    const snapshot = createPendingRewardSnapshot(intent!, createTrophyActions(), '2026-04-22T00:00:00.000Z');
    const ledger = createPendingRewardLedgerEntry(snapshot);

    expect(isRewardLedgerEntry({
      ...ledger,
      status: 'APPLIED',
    })).toBe(false);
  });

  it('creates a canonical quest reward ledger entry', () => {
    const reward = {
      gold: 15,
      inventoryDelta: {
        usualShards: 2,
        leather: 1,
      },
    };

    const ledger = createQuestRewardLedgerEntry(
      1,
      'awakening_empty_master',
      reward,
      '2026-04-22T00:00:00.000Z',
    );

    expect(ledger).toEqual({
      schemaVersion: 1,
      kind: 'QUEST_REWARD',
      status: 'APPLIED',
      playerId: 1,
      ledgerKey: 'quest_reward:1:awakening_empty_master',
      sourceType: 'QUEST_REWARD',
      sourceId: 'awakening_empty_master',
      questCode: 'awakening_empty_master',
      reward,
      appliedAt: '2026-04-22T00:00:00.000Z',
    });
    expect(isQuestRewardLedgerEntry(ledger)).toBe(true);
  });

  it('rejects quest reward ledger entries with mismatched identity', () => {
    const ledger = createQuestRewardLedgerEntry(
      1,
      'awakening_empty_master',
      { inventoryDelta: { usualShards: 2 } },
      '2026-04-22T00:00:00.000Z',
    );

    expect(isQuestRewardLedgerEntry({
      ...ledger,
      ledgerKey: 'quest_reward:1:first_sign',
    })).toBe(false);
    expect(isQuestRewardLedgerEntry({
      ...ledger,
      sourceId: 'first_sign',
    })).toBe(false);
  });

  it('creates a canonical daily activity ledger entry', () => {
    const reward = {
      gold: 6,
      inventoryDelta: {
        usualShards: 1,
        herb: 1,
      },
    };

    const ledger = createDailyActivityLedgerEntry(
      1,
      'soft_daily_trace',
      '2026-04-23',
      reward,
      '2026-04-23T00:00:00.000Z',
    );

    expect(ledger).toEqual({
      schemaVersion: 1,
      kind: 'DAILY_TRACE',
      status: 'APPLIED',
      playerId: 1,
      ledgerKey: 'daily_activity:1:soft_daily_trace:2026-04-23',
      sourceType: 'DAILY_TRACE',
      sourceId: 'soft_daily_trace:2026-04-23',
      activityCode: 'soft_daily_trace',
      gameDay: '2026-04-23',
      reward,
      appliedAt: '2026-04-23T00:00:00.000Z',
    });
    expect(isDailyActivityLedgerEntry(ledger)).toBe(true);
  });

  it('rejects daily activity ledger entries with mismatched identity', () => {
    const ledger = createDailyActivityLedgerEntry(
      1,
      'soft_daily_trace',
      '2026-04-23',
      { inventoryDelta: { usualShards: 1 } },
      '2026-04-23T00:00:00.000Z',
    );

    expect(isDailyActivityLedgerEntry({
      ...ledger,
      ledgerKey: 'daily_activity:1:soft_daily_trace:2026-04-24',
    })).toBe(false);
    expect(isDailyActivityLedgerEntry({
      ...ledger,
      sourceId: 'soft_daily_trace:2026-04-24',
    })).toBe(false);
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

  it('keeps encounter and flee state in the versioned battle snapshot', () => {
    const snapshot = buildBattleSnapshot({
      ...createBattle(),
      status: 'ACTIVE',
      result: 'FLED',
      rewards: null,
      encounter: {
        status: 'FLED',
        initialTurnOwner: 'ENEMY',
        canFlee: true,
        fleeChancePercent: 52,
        kind: 'AMBUSH',
        title: 'Засада',
        description: 'Враг вышел из укрытия.',
        effectLine: 'Враг начнёт первым.',
      },
    });

    expect(isBattleSnapshot(snapshot)).toBe(true);
    expect(snapshot.result).toBe('FLED');
    expect(snapshot.encounter).toEqual({
      status: 'FLED',
      initialTurnOwner: 'ENEMY',
      canFlee: true,
      fleeChancePercent: 52,
      kind: 'AMBUSH',
      title: 'Засада',
      description: 'Враг вышел из укрытия.',
      effectLine: 'Враг начнёт первым.',
    });
  });
});
