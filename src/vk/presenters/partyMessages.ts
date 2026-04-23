import type { PartyView, PlayerState } from '../../shared/types/game';

const renderPartyMemberLine = (member: PartyView['members'][number]): string => {
  const roleLabel = member.role === 'LEADER' ? 'лидер' : 'участник';
  return `• ${member.name} · ${roleLabel}`;
};

export const renderParty = (player: PlayerState, party: PartyView | null): string => {
  if (!party) {
    return [
      '🤝 Отряд',
      '',
      'Сейчас вы идёте один.',
      'Создайте отряд, чтобы получить код для второго мастера.',
    ].join('\n');
  }

  const isLeader = party.leaderPlayerId === player.playerId;
  const isReady = party.members.length >= party.maxMembers;

  return [
    '🤝 Отряд',
    '',
    `Код входа: ${party.inviteCode}`,
    `Состав: ${party.members.length}/${party.maxMembers}`,
    ...party.members.map(renderPartyMemberLine),
    '',
    isReady
      ? isLeader
        ? 'Отряд готов. Можно исследовать вместе.'
        : 'Отряд готов. Лидер может начать исследование.'
      : `Ждём второго мастера. Пусть отправит боту: отряд ${party.inviteCode}`,
  ].join('\n');
};
