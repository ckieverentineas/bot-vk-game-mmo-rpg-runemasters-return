import type { PartyView, PlayerState } from '../../shared/types/game';

const renderPartyMemberPerspective = (
  viewerPlayerId: number,
  member: PartyView['members'][number],
): string => (member.playerId === viewerPlayerId ? 'вы' : 'союзник');

const renderPartyMemberRole = (member: PartyView['members'][number]): string | null => (
  member.role === 'LEADER' ? '👑 лидер' : null
);

const renderPartyMemberLine = (
  viewerPlayerId: number,
  member: PartyView['members'][number],
): string => {
  const parts = [
    member.name,
    renderPartyMemberPerspective(viewerPlayerId, member),
    renderPartyMemberRole(member),
  ].filter((part): part is string => part !== null);

  return `👤 ${parts.join(' · ')}`;
};

export const renderParty = (player: PlayerState, party: PartyView | null): string => {
  if (!party) {
    return [
      '🤝 Отряд',
      '',
      '👤 Сейчас соло.',
      '➕ Создайте отряд: получите код для союзника.',
    ].join('\n');
  }

  const isLeader = party.leaderPlayerId === player.playerId;
  const isReady = party.members.length >= party.maxMembers;
  const partyBattleActive = party.activeBattleId !== null;

  return [
    '🤝 Отряд',
    '',
    `🔑 Код: ${party.inviteCode}`,
    `👥 Состав: ${party.members.length}/${party.maxMembers}`,
    ...party.members.map((member) => renderPartyMemberLine(player.playerId, member)),
    '',
    partyBattleActive
      ? '⚔️ Уже в бою.'
      : isReady
      ? isLeader
        ? '✅ Готово: можно исследовать вместе.'
        : '✅ Готово: лидер начинает выход.'
      : isLeader
        ? `⏳ Ждём союзника: отряд ${party.inviteCode}.`
        : '⏳ Ждите лидера или выйдите.',
  ].join('\n');
};
