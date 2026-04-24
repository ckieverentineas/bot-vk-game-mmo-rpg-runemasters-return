import { AppError } from '../../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import type { GameRepository, SaveBattleOptions } from '../../shared/application/ports/GameRepository';
import { isBattleEncounterOffered } from '../domain/battle-encounter';
import { appendBattleLog } from '../domain/battle-utils';
import { persistBattleActionOutcome } from './battle-action-outcome';
import type { BattleActionResultView } from './battle-action-result';
import { resolveEnemyResponseIfNeeded } from './battle-enemy-response';
import { isPartyBattle, type PartyBattleView } from './party-battle-actor';
import { resolvePlayerBattleAction } from './player-battle-action';

type IdlePartyAutoAttackRepository = Pick<
  GameRepository,
  'findPlayerById' | 'finalizeBattle' | 'saveBattle'
>;

const partyAutoAttackIdleMs = 30_000;

const hasPartyTurnTimedOut = (battle: BattleView): boolean => {
  const updatedAtTime = Date.parse(battle.updatedAt);

  return Number.isFinite(updatedAtTime) && Date.now() - updatedAtTime > partyAutoAttackIdleMs;
};

const shouldAutoAttackPartyMember = (
  battle: BattleView,
  requester: PlayerState,
): battle is PartyBattleView => (
  isPartyBattle(battle)
  && battle.status === 'ACTIVE'
  && battle.turnOwner === 'PLAYER'
  && battle.party.currentTurnPlayerId !== null
  && battle.party.currentTurnPlayerId !== requester.playerId
  && !isBattleEncounterOffered(battle)
  && hasPartyTurnTimedOut(battle)
);

export const resolveIdlePartyAutoAttack = async (
  repository: IdlePartyAutoAttackRepository,
  random: GameRandom,
  battle: BattleView,
  requester: PlayerState,
): Promise<BattleActionResultView | null> => {
  if (!shouldAutoAttackPartyMember(battle, requester)) {
    return null;
  }

  const currentTurnPlayerId = battle.party.currentTurnPlayerId;
  if (currentTurnPlayerId === null) {
    return null;
  }

  const currentMember = battle.party.members.find((member) => member.playerId === currentTurnPlayerId);
  if (!currentMember || currentMember.snapshot.currentHealth <= 0) {
    return null;
  }

  const actor = await repository.findPlayerById(currentMember.playerId);
  if (!actor) {
    throw new AppError('party_member_not_found', 'Участник отряда уже не найден.');
  }

  const actorBattle = {
    ...battle,
    player: currentMember.snapshot,
    log: appendBattleLog(
      battle.log,
      `⏳ ${currentMember.name} медлит больше 30 секунд: автоатака.`,
    ),
  };
  const playerActionResolution = resolvePlayerBattleAction(actorBattle, 'ATTACK', random);
  const battlePersistenceOptions: SaveBattleOptions = {
    commandKey: 'BATTLE_ATTACK',
    actingPlayerId: actor.playerId,
    playerSkillGains: playerActionResolution.playerSkillGains,
  };
  const nextBattle = resolveEnemyResponseIfNeeded(playerActionResolution.battle, random);

  return persistBattleActionOutcome({
    repository,
    random,
    actingPlayer: actor,
    acquisitionBaselinePlayer: requester,
    battle: nextBattle,
    options: battlePersistenceOptions,
    resultPlayerId: requester.playerId,
  });
};
