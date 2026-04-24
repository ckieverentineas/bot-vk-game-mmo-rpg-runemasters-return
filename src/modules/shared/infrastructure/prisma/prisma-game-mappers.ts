import { Prisma } from '@prisma/client';

import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../../../shared/types/game';
import { parseJson } from '../../../../shared/utils/json';
import { isBattleSnapshot, type BattleSnapshot } from '../../domain/contracts/battle-snapshot';
import {
  buildLoadoutSnapshotFromBattle,
  isLoadoutSnapshot,
  projectBattleRuneLoadout,
  type LoadoutSnapshot,
} from '../../domain/contracts/loadout-snapshot';
import { hydratePlayerStateFromPersistence } from './player-state-hydration';

export const playerInclude = {
  user: true,
  progress: true,
  inventory: true,
  schoolMasteries: true,
  skills: true,
  runes: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.PlayerInclude;

export type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;

export type BattleRecord = {
  readonly id: string;
  readonly playerId: number;
  readonly status: string;
  readonly battleType: string;
  readonly actionRevision: number;
  readonly battleSnapshot?: string | null;
  readonly playerLoadoutSnapshot?: string | null;
  readonly locationLevel: number;
  readonly biomeCode: string;
  readonly enemyCode: string;
  readonly turnOwner: string;
  readonly playerSnapshot: string;
  readonly enemySnapshot: string;
  readonly log: string;
  readonly result: string | null;
  readonly rewardsSnapshot: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type ParsedLoadoutSnapshot = {
  readonly snapshot: LoadoutSnapshot | null;
  readonly fallbackToBattleSnapshot: boolean;
};

const defaultBattlePlayerSnapshot = (playerId: number): BattleView['player'] => ({
  playerId,
  name: 'Рунный мастер',
  attack: 0,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  maxHealth: 1,
  currentHealth: 1,
  maxMana: 0,
  currentMana: 0,
  runeLoadout: null,
  supportRuneLoadout: null,
  guardPoints: 0,
});

const defaultBattleEnemySnapshot = (enemyCode: string): BattleView['enemy'] => ({
  code: enemyCode,
  name: 'Неизвестный враг',
  kind: 'enemy',
  isElite: false,
  isBoss: false,
  attack: 1,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  maxHealth: 1,
  currentHealth: 1,
  maxMana: 0,
  currentMana: 0,
  experienceReward: 0,
  goldReward: 0,
  runeDropChance: 0,
  attackText: 'атакует',
  intent: null,
  knowledge: {
    isDiscovered: false,
    hasTrophyStudy: false,
    victoryCount: 0,
  },
  hasUsedSignatureMove: false,
});

const parsePersistedLoadoutSnapshot = (value: string | null): ParsedLoadoutSnapshot => {
  if (!value) {
    return {
      snapshot: null,
      fallbackToBattleSnapshot: false,
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      snapshot: null,
      fallbackToBattleSnapshot: true,
    };
  }

  if (!isLoadoutSnapshot(parsed)) {
    return {
      snapshot: null,
      fallbackToBattleSnapshot: true,
    };
  }

  return {
    snapshot: parsed,
    fallbackToBattleSnapshot: false,
  };
};

const parsePersistedBattleSnapshot = (value: string | null): BattleSnapshot | null => {
  if (!value) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!isBattleSnapshot(parsed)) {
    return null;
  }

  return parsed;
};

const shouldUseVersionedBattleSnapshot = (
  snapshot: BattleSnapshot | null,
  actionRevision: number,
): snapshot is BattleSnapshot => (
  snapshot !== null
  && snapshot.actionRevision === actionRevision
);

const hydrateBattlePlayerSnapshot = (
  playerId: number,
  snapshot: BattleView['player'],
  loadoutSnapshot: LoadoutSnapshot | null,
): BattleView['player'] => {
  const fallback = defaultBattlePlayerSnapshot(playerId);
  const currentCooldown = snapshot.runeLoadout?.activeAbility?.currentCooldown ?? 0;
  const normalizedLoadout = projectBattleRuneLoadout(
    loadoutSnapshot ?? buildLoadoutSnapshotFromBattle(snapshot.runeLoadout ?? null),
    currentCooldown,
  );
  const normalizedSupportLoadout = projectBattleRuneLoadout(
    buildLoadoutSnapshotFromBattle(snapshot.supportRuneLoadout ?? null),
    snapshot.supportRuneLoadout?.activeAbility?.currentCooldown ?? 0,
  );

  return {
    ...fallback,
    ...snapshot,
    runeLoadout: normalizedLoadout,
    supportRuneLoadout: normalizedSupportLoadout,
    guardPoints: snapshot.guardPoints ?? fallback.guardPoints,
  };
};

export const mapPlayerRecord = (player: PlayerRecord): PlayerState => hydratePlayerStateFromPersistence({
  userId: player.userId,
  vkId: player.user.vkId,
  playerId: player.id,
  level: player.level,
  experience: player.experience,
  gold: player.gold,
  radiance: player.radiance,
  baseStats: {
    health: player.baseHealth,
    attack: player.baseAttack,
    defence: player.baseDefence,
    magicDefence: player.baseMagicDefence,
    dexterity: player.baseDexterity,
    intelligence: player.baseIntelligence,
  },
  progress: player.progress
    ? {
        locationLevel: player.progress.locationLevel,
        currentRuneIndex: player.progress.currentRuneIndex,
        unlockedRuneSlotCount: player.progress.unlockedRuneSlotCount,
        activeBattleId: player.progress.activeBattleId,
        currentHealth: player.progress.currentHealth,
        currentMana: player.progress.currentMana,
        tutorialState: player.progress.tutorialState,
        victories: player.progress.victories,
        victoryStreak: player.progress.victoryStreak,
        defeats: player.progress.defeats,
        defeatStreak: player.progress.defeatStreak,
        mobsKilled: player.progress.mobsKilled,
        highestLocationLevel: player.progress.highestLocationLevel,
      }
    : null,
  inventory: player.inventory
    ? {
        usualShards: player.inventory.usualShards,
        unusualShards: player.inventory.unusualShards,
        rareShards: player.inventory.rareShards,
        epicShards: player.inventory.epicShards,
        legendaryShards: player.inventory.legendaryShards,
        mythicalShards: player.inventory.mythicalShards,
        leather: player.inventory.leather,
        bone: player.inventory.bone,
        herb: player.inventory.herb,
        essence: player.inventory.essence,
        metal: player.inventory.metal,
        crystal: player.inventory.crystal,
        healingPills: player.inventory.healingPills ?? 0,
        focusPills: player.inventory.focusPills ?? 0,
        guardPills: player.inventory.guardPills ?? 0,
        clarityPills: player.inventory.clarityPills ?? 0,
      }
    : null,
  schoolMasteries: player.schoolMasteries.map((entry) => ({
    schoolCode: entry.schoolCode,
    experience: entry.experience,
  })),
  skills: player.skills.map((entry) => ({
    skillCode: entry.skillCode,
    experience: entry.experience,
  })),
  runes: player.runes.map((rune) => ({
    id: rune.id,
    runeCode: rune.runeCode,
    archetypeCode: rune.archetypeCode,
    passiveAbilityCodes: rune.passiveAbilityCodes,
    activeAbilityCodes: rune.activeAbilityCodes,
    name: rune.name,
    rarity: rune.rarity,
    health: rune.health,
    attack: rune.attack,
    defence: rune.defence,
    magicDefence: rune.magicDefence,
    dexterity: rune.dexterity,
    intelligence: rune.intelligence,
    isEquipped: rune.isEquipped,
    equippedSlot: rune.equippedSlot,
    createdAt: rune.createdAt.toISOString(),
  })),
  createdAt: player.createdAt.toISOString(),
  updatedAt: player.updatedAt.toISOString(),
});

export const mapBattleRecord = (battle: BattleRecord): BattleView => {
  const persistedBattleSnapshot = parsePersistedBattleSnapshot(battle.battleSnapshot ?? null);
  const playerSnapshot = parseJson<BattleView['player']>(battle.playerSnapshot, defaultBattlePlayerSnapshot(battle.playerId));
  const enemySnapshot = parseJson<BattleView['enemy']>(battle.enemySnapshot, defaultBattleEnemySnapshot(battle.enemyCode));
  const battleLog = parseJson<BattleView['log']>(battle.log, []);
  const rewardsSnapshot = parseJson<BattleView['rewards']>(battle.rewardsSnapshot, null);
  const persistedLoadoutSnapshot = parsePersistedLoadoutSnapshot(battle.playerLoadoutSnapshot ?? null);

  const battleSnapshot = shouldUseVersionedBattleSnapshot(persistedBattleSnapshot, battle.actionRevision)
    ? persistedBattleSnapshot
    : {
        player: playerSnapshot,
        enemy: enemySnapshot,
        party: null,
        encounter: null,
        log: battleLog,
        result: battle.result as BattleView['result'],
        rewards: rewardsSnapshot,
      };

  if (persistedLoadoutSnapshot.fallbackToBattleSnapshot && !battleSnapshot.player.runeLoadout) {
    throw new AppError('loadout_snapshot_invalid', 'Рунная память боя повреждена. Ищите новую встречу.');
  }

  return {
    id: battle.id,
    playerId: battle.playerId,
    status: battle.status as BattleView['status'],
    battleType: battle.battleType as BattleView['battleType'],
    actionRevision: battle.actionRevision,
    locationLevel: battle.locationLevel,
    biomeCode: battle.biomeCode,
    enemyCode: battle.enemyCode,
    turnOwner: battle.turnOwner as BattleView['turnOwner'],
    player: hydrateBattlePlayerSnapshot(battle.playerId, battleSnapshot.player, persistedLoadoutSnapshot.snapshot),
    enemy: battleSnapshot.enemy,
    party: battleSnapshot.party ?? null,
    encounter: battleSnapshot.encounter ?? null,
    log: battleSnapshot.log,
    result: battleSnapshot.result,
    rewards: battleSnapshot.rewards,
    createdAt: battle.createdAt.toISOString(),
    updatedAt: battle.updatedAt.toISOString(),
  };
};
