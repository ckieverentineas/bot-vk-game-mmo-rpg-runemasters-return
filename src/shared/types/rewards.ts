import type { BlueprintDelta, InventoryDelta } from './inventory';

export interface ResourceReward {
  readonly gold?: number;
  readonly radiance?: number;
  readonly inventoryDelta?: InventoryDelta;
  readonly blueprintDelta?: BlueprintDelta;
}
