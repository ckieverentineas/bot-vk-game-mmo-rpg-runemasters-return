import type { Context } from 'vk-io';

import type { ExplorePartyEventResult } from '../../../modules/party/application/use-cases/ExploreParty';
import type { PartyView, PlayerState } from '../../../shared/types/game';
import { createPartyKeyboard } from '../../keyboards';
import { renderExplorationEvent, renderParty } from '../../presenters/messages';
import { replyWithScreen, type VkReplyScreen } from './screenReply';

export interface PartyReplyState {
  readonly player: PlayerState;
  readonly party: PartyView | null;
}

const resolvePartyEventViewer = (
  result: ExplorePartyEventResult,
  viewerVkId: number,
): PlayerState => (
  result.members.find((member) => member.player.vkId === viewerVkId)?.player ?? result.player
);

export const createPartyScreen = (state: PartyReplyState): VkReplyScreen => ({
  message: renderParty(state.player, state.party),
  keyboard: createPartyKeyboard(state.party, state.player.playerId),
});

export const createPartyExplorationEventScreen = (
  result: ExplorePartyEventResult,
  viewerVkId: number,
): VkReplyScreen => {
  const viewer = resolvePartyEventViewer(result, viewerVkId);

  return {
    message: renderExplorationEvent(result.event, viewer),
    keyboard: createPartyKeyboard(result.party, viewer.playerId),
  };
};

export const replyWithParty = async (
  ctx: Context,
  state: PartyReplyState,
): Promise<void> => {
  await replyWithScreen(ctx, createPartyScreen(state));
};

export const replyWithPartyExplorationEvent = async (
  ctx: Context,
  result: ExplorePartyEventResult,
  viewerVkId: number,
): Promise<void> => {
  await replyWithScreen(ctx, createPartyExplorationEventScreen(result, viewerVkId));
};
