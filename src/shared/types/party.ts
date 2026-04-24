export type PartyStatus = 'OPEN' | 'IN_BATTLE' | 'COMPLETED';

export interface PartyMemberView {
  playerId: number;
  vkId: number;
  name: string;
  role: 'LEADER' | 'MEMBER';
  joinedAt: string;
}

export interface PartyView {
  id: string;
  inviteCode: string;
  leaderPlayerId: number;
  status: PartyStatus;
  activeBattleId: string | null;
  maxMembers: number;
  members: PartyMemberView[];
  createdAt: string;
  updatedAt: string;
}
