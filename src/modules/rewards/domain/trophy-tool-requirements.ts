import type { WorkshopItemCode } from '../../workshop/domain/workshop-catalog';
import type { TrophyActionCode } from './trophy-actions';

const trophyToolItemCodesByActionCode: Readonly<Partial<Record<TrophyActionCode, readonly WorkshopItemCode[]>>> = {
  skin_beast: ['skinning_kit'],
  careful_skinning: ['skinning_kit'],
  harvest_dragon_scale: ['skinning_kit'],
};

export const resolveTrophyToolItemCodes = (actionCode: TrophyActionCode): readonly WorkshopItemCode[] => (
  trophyToolItemCodesByActionCode[actionCode] ?? []
);
