export type ShardField =
  | 'usualShards'
  | 'unusualShards'
  | 'rareShards'
  | 'epicShards'
  | 'legendaryShards'
  | 'mythicalShards';

export type MaterialField = 'leather' | 'bone' | 'herb' | 'essence' | 'metal' | 'crystal';
export type ConsumableField = 'healingPills' | 'focusPills' | 'guardPills' | 'clarityPills';
export type InventoryField = ShardField | MaterialField | ConsumableField;

export interface InventoryView {
  usualShards: number;
  unusualShards: number;
  rareShards: number;
  epicShards: number;
  legendaryShards: number;
  mythicalShards: number;
  leather: number;
  bone: number;
  herb: number;
  essence: number;
  metal: number;
  crystal: number;
  healingPills?: number;
  focusPills?: number;
  guardPills?: number;
  clarityPills?: number;
}

export type InventoryDelta = Partial<Record<InventoryField, number>>;
export type InventoryLoot = Partial<Record<MaterialField, number>>;
export type BlueprintDelta = Partial<Record<string, number>>;
