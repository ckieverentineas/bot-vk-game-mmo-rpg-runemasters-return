import type { BlueprintDelta, InventoryDelta } from './inventory';

export interface BlueprintDrop {
  readonly blueprintCode: string;
  readonly quantity?: number;
  readonly rarity?: string;
  readonly sourceType?: string;
  readonly sourceId?: string | null;
  readonly discoveryKind?: string;
  readonly quality?: string;
  readonly craftPotential?: string;
  readonly modifierSnapshot?: Readonly<Record<string, unknown>>;
}

export interface ResourceReward {
  readonly gold?: number;
  readonly radiance?: number;
  readonly inventoryDelta?: InventoryDelta;
  readonly blueprintDelta?: BlueprintDelta;
  readonly blueprintDrops?: readonly BlueprintDrop[];
}
