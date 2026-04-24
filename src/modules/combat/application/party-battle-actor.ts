import { AppError } from '../../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../../shared/types/game';

export type PartyBattleView = BattleView & { party: NonNullable<BattleView['party']> };

export const isPartyBattle = (battle: BattleView): battle is PartyBattleView => (
  battle.battleType === 'PARTY_PVE' && battle.party !== undefined && battle.party !== null
);

export const prepareBattleForActor = (
  battle: BattleView,
  player: PlayerState,
): BattleView => {
  if (!isPartyBattle(battle)) {
    return battle;
  }

  const currentTurnPlayerId = battle.party.currentTurnPlayerId;
  if (currentTurnPlayerId !== player.playerId) {
    const currentMember = battle.party.members.find((member) => member.playerId === currentTurnPlayerId);
    const currentMemberName = currentMember?.name ?? 'другой мастер';
    throw new AppError('party_member_turn_required', `Сейчас ходит ${currentMemberName}. Дождитесь своего хода.`);
  }

  const partyMember = battle.party.members.find((member) => member.playerId === player.playerId);
  if (!partyMember) {
    throw new AppError('party_member_not_found', 'Вы уже не состоите в этом отряде.');
  }

  return {
    ...battle,
    player: partyMember.snapshot,
  };
};
