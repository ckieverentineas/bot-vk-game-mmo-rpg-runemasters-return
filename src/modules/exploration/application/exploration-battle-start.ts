import type {
  BattlePartyMemberSnapshot,
  BattlePlayerSnapshot,
  BattleView,
  CreateBattleInput,
  PartyView,
  PlayerState,
  StatBlock,
  TurnOwner,
} from '../../../shared/types/game';
import { AppError } from '../../../shared/domain/AppError';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import type { GameRepository, SaveBattleOptions } from '../../shared/application/ports/GameRepository';
import { createBattleEncounter, isBattleEncounterOffered } from '../../combat/domain/battle-encounter';
import { buildBattlePlayerSnapshot } from '../../combat/domain/build-battle-player-snapshot';
import { resolveEnemyTurnWithSignatureReaction } from '../../combat/application/resolve-enemy-turn';
import type { WorkshopEquippedItemView } from '../../workshop/domain/workshop-catalog';
import type { ExplorationBattleOutcome } from '../domain/exploration-outcome';

type StartedBattleRepository = Pick<GameRepository, 'finalizeBattle' | 'saveBattle'>;

export interface SoloExplorationBattleStart {
  readonly input: CreateBattleInput;
  readonly playerSnapshot: BattlePlayerSnapshot;
}

export interface PartyExplorationBattleMemberContext {
  readonly player: PlayerState;
  readonly stats: StatBlock;
  readonly workshopItems: readonly WorkshopEquippedItemView[];
}

export interface PartyExplorationBattleStart {
  readonly input: CreateBattleInput;
  readonly leaderSnapshot: BattlePlayerSnapshot;
  readonly partyMembers: readonly BattlePartyMemberSnapshot[];
}

interface SoloExplorationBattleStartContext {
  readonly player: PlayerState;
  readonly playerVkId: number;
  readonly outcome: ExplorationBattleOutcome;
  readonly enemy: BattleView['enemy'];
  readonly workshopItems: readonly WorkshopEquippedItemView[];
  readonly offerEncounterChoice: boolean;
}

interface PartyExplorationBattleStartContext {
  readonly party: PartyView;
  readonly leader: PlayerState;
  readonly outcome: ExplorationBattleOutcome;
  readonly enemy: BattleView['enemy'];
  readonly members: readonly PartyExplorationBattleMemberContext[];
  readonly offerEncounterChoice: boolean;
}

interface ResolveStartedExplorationBattleEnemyTurnContext {
  readonly repository: StartedBattleRepository;
  readonly random: GameRandom;
  readonly battle: BattleView;
  readonly playerId: number;
  readonly options?: SaveBattleOptions;
  readonly finalizeOptions?: SaveBattleOptions;
  readonly saveOptions?: SaveBattleOptions;
}

const resolveBattleStartTurnOwner = (
  outcomeTurnOwner: TurnOwner,
  hasEncounterChoice: boolean,
): TurnOwner => (
  hasEncounterChoice ? 'PLAYER' : outcomeTurnOwner
);

const buildPartyMemberSnapshot = ({
  player,
  stats,
  workshopItems,
}: PartyExplorationBattleMemberContext): BattlePartyMemberSnapshot => {
  const snapshot = buildBattlePlayerSnapshot(
    player.playerId,
    player.vkId,
    stats,
    player,
    workshopItems,
    { applyWorkshopStatBonus: false },
  );

  return {
    playerId: player.playerId,
    vkId: player.vkId,
    name: snapshot.name,
    snapshot,
  };
};

export const buildSoloExplorationBattleStart = ({
  player,
  playerVkId,
  outcome,
  enemy,
  workshopItems,
  offerEncounterChoice,
}: SoloExplorationBattleStartContext): SoloExplorationBattleStart => {
  const playerSnapshot = buildBattlePlayerSnapshot(
    player.playerId,
    playerVkId,
    outcome.playerStats,
    player,
    workshopItems,
    { applyWorkshopStatBonus: false },
  );
  const encounter = offerEncounterChoice
    ? createBattleEncounter(playerSnapshot, enemy, outcome.turnOwner, outcome.encounterVariant)
    : null;
  const turnOwner = resolveBattleStartTurnOwner(outcome.turnOwner, encounter !== null);

  return {
    playerSnapshot,
    input: {
      status: 'ACTIVE',
      battleType: 'PVE',
      actionRevision: 0,
      locationLevel: outcome.locationLevel,
      biomeCode: outcome.biome.code,
      enemyCode: outcome.template.code,
      turnOwner,
      player: playerSnapshot,
      enemy,
      encounter,
      log: outcome.openingLog,
      result: null,
      rewards: null,
    },
  };
};

export const buildPartyExplorationBattleStart = ({
  party,
  leader,
  outcome,
  enemy,
  members,
  offerEncounterChoice,
}: PartyExplorationBattleStartContext): PartyExplorationBattleStart => {
  const partyMembers = members.map(buildPartyMemberSnapshot);
  const leaderSnapshot = partyMembers.find((member) => member.playerId === leader.playerId)?.snapshot;
  if (!leaderSnapshot) {
    throw new AppError('party_member_not_found', 'Лидер не найден в боевой группе.');
  }

  const encounter = offerEncounterChoice
    ? createBattleEncounter(leaderSnapshot, enemy, outcome.turnOwner, outcome.encounterVariant)
    : null;
  const turnOwner = resolveBattleStartTurnOwner(outcome.turnOwner, encounter !== null);

  return {
    leaderSnapshot,
    partyMembers,
    input: {
      status: 'ACTIVE',
      battleType: 'PARTY_PVE',
      actionRevision: 0,
      locationLevel: outcome.locationLevel,
      biomeCode: outcome.biome.code,
      enemyCode: outcome.template.code,
      turnOwner,
      player: leaderSnapshot,
      enemy,
      party: {
        id: party.id,
        inviteCode: party.inviteCode,
        leaderPlayerId: leader.playerId,
        currentTurnPlayerId: turnOwner === 'PLAYER' ? leader.playerId : null,
        enemyTargetPlayerId: null,
        actedPlayerIds: [],
        members: partyMembers,
      },
      encounter,
      log: outcome.openingLog,
      result: null,
      rewards: null,
    },
  };
};

export const resolveStartedExplorationBattleEnemyTurn = async ({
  repository,
  random,
  battle,
  playerId,
  options,
  finalizeOptions,
  saveOptions,
}: ResolveStartedExplorationBattleEnemyTurnContext): Promise<BattleView> => {
  if (isBattleEncounterOffered(battle) || battle.turnOwner !== 'ENEMY') {
    return battle;
  }

  const resolved = resolveEnemyTurnWithSignatureReaction(battle, random);
  if (resolved.status === 'COMPLETED') {
    const finalized = await repository.finalizeBattle(playerId, resolved, finalizeOptions ?? options);
    return finalized.battle;
  }

  return repository.saveBattle(resolved, saveOptions ?? options);
};
