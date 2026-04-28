import type {
  StatBlock,
} from '../../../shared/types/game';
import type {
  WorkshopBlueprintCode,
  WorkshopItemClass,
  WorkshopItemCode,
  WorkshopItemSlot,
  WorkshopItemStatus,
} from '../domain/workshop-catalog';
import type { WorkshopBlueprintQuality } from '../domain/workshop-blueprint-instances';

export type { WorkshopBlueprintInstanceView as PlayerBlueprintInstanceView } from '../domain/workshop-blueprint-instances';
export type { WorkshopCraftedItemOutcome } from '../domain/workshop-crafting-quality';

export type WorkshopCommandIntentKey =
  | 'GRANT_WORKSHOP_BLUEPRINT'
  | 'CRAFT_WORKSHOP_ITEM'
  | 'REPAIR_WORKSHOP_ITEM'
  | 'EQUIP_WORKSHOP_ITEM'
  | 'UNEQUIP_WORKSHOP_ITEM';

export interface WorkshopMutationOptions {
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export interface PlayerBlueprintView {
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly quantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlayerCraftedItemView {
  readonly id: string;
  readonly playerId: number;
  readonly itemCode: WorkshopItemCode;
  readonly itemClass: WorkshopItemClass;
  readonly slot: WorkshopItemSlot;
  readonly quality: WorkshopBlueprintQuality;
  readonly status: WorkshopItemStatus;
  readonly equipped: boolean;
  readonly durability: number;
  readonly maxDurability: number;
  readonly statBonus: StatBlock;
  readonly createdAt: string;
  readonly updatedAt: string;
}
