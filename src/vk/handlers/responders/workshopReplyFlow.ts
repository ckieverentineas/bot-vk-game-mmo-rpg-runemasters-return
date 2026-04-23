import type { Context } from 'vk-io';

import type { CraftItemResultView } from '../../../modules/crafting/application/use-cases/CraftItem';
import type { CraftWorkshopItemResultView } from '../../../modules/workshop/application/use-cases/CraftWorkshopItem';
import type { EquipWorkshopItemResultView } from '../../../modules/workshop/application/use-cases/EquipWorkshopItem';
import type { RepairWorkshopItemResultView } from '../../../modules/workshop/application/use-cases/RepairWorkshopItem';
import type { UnequipWorkshopItemResultView } from '../../../modules/workshop/application/use-cases/UnequipWorkshopItem';
import type { WorkshopView } from '../../../modules/workshop/application/workshop-view';
import { createWorkshopKeyboard } from '../../keyboards';
import { renderWorkshop } from '../../presenters/messages';
import type { WorkshopScreenSummary } from '../../presenters/workshopMessages';

export type WorkshopReplyState =
  | WorkshopView
  | CraftWorkshopItemResultView
  | EquipWorkshopItemResultView
  | UnequipWorkshopItemResultView
  | RepairWorkshopItemResultView
  | {
      readonly view: WorkshopView;
      readonly acquisitionSummary: CraftItemResultView['acquisitionSummary'];
    };

const normalizeWorkshopReplyState = (
  state: WorkshopReplyState,
): { readonly view: WorkshopView; readonly acquisitionSummary: WorkshopScreenSummary | null } => {
  if ('view' in state) {
    return {
      view: state.view,
      acquisitionSummary: state.acquisitionSummary ?? null,
    };
  }

  return {
    view: state,
    acquisitionSummary: null,
  };
};

export const replyWithWorkshop = async (ctx: Context, state: WorkshopReplyState): Promise<void> => {
  const result = normalizeWorkshopReplyState(state);

  await ctx.reply(
    renderWorkshop(result.view, result.acquisitionSummary),
    { keyboard: createWorkshopKeyboard(result.view) },
  );
};
