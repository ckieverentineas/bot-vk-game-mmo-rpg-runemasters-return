import type {
  BattlePartyMemberSnapshot,
  BattlePlayerSnapshot,
  BattleResult,
  BattleView,
} from '../../../shared/types/game';
import { cloneJsonValue } from '../../../shared/utils/json';
import { listBattleRuneLoadouts } from './battle-rune-loadouts';
import { resolveManaRegeneration } from './battle-tactics';
import { appendBattleLog } from './battle-utils';

type PartyBattleView = BattleView & { party: NonNullable<BattleView['party']> };

export const isPartyBattle = (battle: BattleView): battle is PartyBattleView => (
  battle.battleType === 'PARTY_PVE' && battle.party !== undefined && battle.party !== null
);

export const clonePlayerSnapshot = (snapshot: BattlePlayerSnapshot): BattlePlayerSnapshot => (
  cloneJsonValue(snapshot)
);

export const findPartyMember = (
  battle: PartyBattleView,
  playerId: number,
): BattlePartyMemberSnapshot | null => (
  battle.party.members.find((member) => member.playerId === playerId) ?? null
);

export const listLivingPartyMembers = (
  battle: PartyBattleView,
): BattlePartyMemberSnapshot[] => (
  battle.party.members.filter((member) => member.snapshot.currentHealth > 0)
);

export const finalizeBattle = (battle: BattleView, result: BattleResult): BattleView => {
  battle.status = 'COMPLETED';
  battle.result = result;
  battle.turnOwner = 'PLAYER';
  battle.rewards = result === 'VICTORY'
    ? {
        experience: battle.enemy.experienceReward,
        gold: battle.enemy.goldReward,
        shards: {},
        droppedRune: null,
      }
    : {
        experience: 0,
        gold: 0,
        shards: {},
        droppedRune: null,
      };

  return battle;
};

export const syncCurrentPartyMemberSnapshot = (battle: BattleView): void => {
  if (!isPartyBattle(battle)) {
    return;
  }

  const member = findPartyMember(battle, battle.player.playerId);
  if (!member) {
    return;
  }

  member.snapshot = clonePlayerSnapshot(battle.player);
};

const setCurrentPartyMember = (
  battle: PartyBattleView,
  member: BattlePartyMemberSnapshot,
): void => {
  battle.party.currentTurnPlayerId = member.playerId;
  battle.player = clonePlayerSnapshot(member.snapshot);
};

const addActedPartyMember = (
  battle: PartyBattleView,
  playerId: number,
): void => {
  battle.party.actedPlayerIds = [...new Set([...battle.party.actedPlayerIds, playerId])];
};

const tickRuneCooldown = (battle: BattleView): void => {
  for (const { loadout } of listBattleRuneLoadouts(battle.player)) {
    const activeAbility = loadout.activeAbility;
    if (activeAbility && activeAbility.currentCooldown > 0) {
      activeAbility.currentCooldown -= 1;
    }
  }
};

const regeneratePlayerMana = (battle: BattleView): number => {
  const manaGain = resolveManaRegeneration(battle.player);
  if (manaGain <= 0 || battle.player.currentMana >= battle.player.maxMana) {
    return 0;
  }

  const previousMana = battle.player.currentMana;
  battle.player.currentMana = Math.min(battle.player.maxMana, previousMana + manaGain);

  return battle.player.currentMana - previousMana;
};

export const refreshPlayerTurnResources = (battle: BattleView): void => {
  tickRuneCooldown(battle);

  const restoredMana = regeneratePlayerMana(battle);
  if (restoredMana <= 0) {
    return;
  }

  battle.log = appendBattleLog(
    battle.log,
    `💙 Рунный фокус: +${restoredMana} маны.`,
  );
};

export const beginPartyPlayerRound = (battle: PartyBattleView): BattleView => {
  const nextMember = listLivingPartyMembers(battle)[0];
  if (!nextMember) {
    return finalizeBattle(battle, 'DEFEAT');
  }

  battle.party.actedPlayerIds = [];
  setCurrentPartyMember(battle, nextMember);
  refreshPlayerTurnResources(battle);
  syncCurrentPartyMemberSnapshot(battle);
  battle.turnOwner = 'PLAYER';

  return battle;
};

const finishPartyPlayerAction = (battle: PartyBattleView): BattleView => {
  syncCurrentPartyMemberSnapshot(battle);

  if (battle.enemy.currentHealth === 0) {
    return finalizeBattle(battle, 'VICTORY');
  }

  addActedPartyMember(battle, battle.player.playerId);

  const nextMember = listLivingPartyMembers(battle)
    .find((member) => !battle.party.actedPlayerIds.includes(member.playerId));

  if (nextMember) {
    setCurrentPartyMember(battle, nextMember);
    battle.turnOwner = 'PLAYER';
    return battle;
  }

  battle.party.currentTurnPlayerId = null;
  battle.turnOwner = 'ENEMY';
  return battle;
};

const selectEnemyPartyTarget = (battle: PartyBattleView): BattlePartyMemberSnapshot | null => {
  const livingMembers = listLivingPartyMembers(battle);
  if (livingMembers.length === 0) {
    return null;
  }

  return livingMembers.find((member) => member.playerId === battle.party.enemyTargetPlayerId)
    ?? livingMembers[0];
};

export const preparePartyEnemyTarget = (battle: BattleView): BattleView => {
  if (!isPartyBattle(battle)) {
    return battle;
  }

  const target = selectEnemyPartyTarget(battle);
  if (!target) {
    return finalizeBattle(battle, 'DEFEAT');
  }

  battle.party.enemyTargetPlayerId = target.playerId;
  battle.player = clonePlayerSnapshot(target.snapshot);
  return battle;
};

export const finishPlayerAction = (battle: BattleView): BattleView => {
  if (isPartyBattle(battle)) {
    return finishPartyPlayerAction(battle);
  }

  if (battle.enemy.currentHealth === 0) {
    return finalizeBattle(battle, 'VICTORY');
  }

  battle.turnOwner = 'ENEMY';
  return battle;
};

export const finishEnemyAction = (battle: BattleView): BattleView => {
  if (isPartyBattle(battle)) {
    syncCurrentPartyMemberSnapshot(battle);

    if (listLivingPartyMembers(battle).length === 0) {
      return finalizeBattle(battle, 'DEFEAT');
    }

    return beginPartyPlayerRound(battle);
  }

  if (battle.player.currentHealth === 0) {
    return finalizeBattle(battle, 'DEFEAT');
  }

  refreshPlayerTurnResources(battle);
  battle.turnOwner = 'PLAYER';
  return battle;
};

export const finishEnemyPreparation = (battle: BattleView): BattleView => {
  if (isPartyBattle(battle)) {
    return beginPartyPlayerRound(battle);
  }

  refreshPlayerTurnResources(battle);
  battle.turnOwner = 'PLAYER';
  return battle;
};
