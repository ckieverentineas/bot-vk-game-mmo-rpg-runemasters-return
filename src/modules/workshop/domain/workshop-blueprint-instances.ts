import type { WorkshopBlueprintCode, WorkshopBlueprintRarity } from './workshop-catalog';

export type WorkshopBlueprintDiscoveryKind =
  | 'COMMON'
  | 'SECRET'
  | 'QUEST'
  | 'SCHOOL'
  | 'REPAIR'
  | 'LEGACY';

export type WorkshopBlueprintInstanceStatus = 'AVAILABLE' | 'CONSUMED' | 'EXPIRED';
export type WorkshopBlueprintQuality = 'ROUGH' | 'STURDY' | 'FINE' | 'MASTERWORK';
export type WorkshopBlueprintSourceType =
  | 'TROPHY'
  | 'QUEST'
  | 'BESTIARY'
  | 'DAILY_TRACE'
  | 'EVENT'
  | 'SCHOOL_TRIAL'
  | 'LEGACY';

export interface WorkshopBlueprintModifierSnapshot {
  readonly radianceFeatureAwakened?: boolean;
  readonly notes?: readonly string[];
}

export interface WorkshopBlueprintInstanceView {
  readonly id: string;
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly rarity: WorkshopBlueprintRarity;
  readonly sourceType: WorkshopBlueprintSourceType;
  readonly sourceId: string | null;
  readonly discoveryKind: WorkshopBlueprintDiscoveryKind;
  readonly quality: WorkshopBlueprintQuality;
  readonly craftPotential: string;
  readonly modifierSnapshot: WorkshopBlueprintModifierSnapshot;
  readonly status: WorkshopBlueprintInstanceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly discoveredAt: string | null;
  readonly consumedAt: string | null;
}

export interface LegacyBlueprintStackInput {
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly quantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SecretSkinningKitConditionInput {
  readonly enemyKind: string;
  readonly successfulTrophyActions: number;
  readonly bestiaryVictoryCount: number;
}

export const workshopBlueprintDiscoveryKinds = [
  'COMMON',
  'SECRET',
  'QUEST',
  'SCHOOL',
  'REPAIR',
  'LEGACY',
] as const satisfies readonly WorkshopBlueprintDiscoveryKind[];

export const workshopBlueprintInstanceStatuses = [
  'AVAILABLE',
  'CONSUMED',
  'EXPIRED',
] as const satisfies readonly WorkshopBlueprintInstanceStatus[];

export const workshopBlueprintQualities = [
  'ROUGH',
  'STURDY',
  'FINE',
  'MASTERWORK',
] as const satisfies readonly WorkshopBlueprintQuality[];

export const workshopBlueprintSourceTypes = [
  'TROPHY',
  'QUEST',
  'BESTIARY',
  'DAILY_TRACE',
  'EVENT',
  'SCHOOL_TRIAL',
  'LEGACY',
] as const satisfies readonly WorkshopBlueprintSourceType[];

const qualityLabels: Readonly<Record<WorkshopBlueprintQuality, string>> = {
  ROUGH: 'Грубое',
  STURDY: 'Крепкое',
  FINE: 'Тонкое',
  MASTERWORK: 'Мастерское',
};

const normalizeQuantity = (quantity: number): number => (
  Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0
);

const includesWorkshopBlueprintInstanceValue = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => values.includes(value as TValue);

export const isWorkshopBlueprintDiscoveryKind = (
  value: string,
): value is WorkshopBlueprintDiscoveryKind => (
  includesWorkshopBlueprintInstanceValue(workshopBlueprintDiscoveryKinds, value)
);

export const isWorkshopBlueprintInstanceStatus = (
  value: string,
): value is WorkshopBlueprintInstanceStatus => (
  includesWorkshopBlueprintInstanceValue(workshopBlueprintInstanceStatuses, value)
);

export const isWorkshopBlueprintQuality = (
  value: string,
): value is WorkshopBlueprintQuality => (
  includesWorkshopBlueprintInstanceValue(workshopBlueprintQualities, value)
);

export const isWorkshopBlueprintSourceType = (
  value: string,
): value is WorkshopBlueprintSourceType => (
  includesWorkshopBlueprintInstanceValue(workshopBlueprintSourceTypes, value)
);

export const formatWorkshopBlueprintQuality = (quality: WorkshopBlueprintQuality): string => (
  qualityLabels[quality]
);

export const canCraftBlueprintInstance = (
  instance: Pick<WorkshopBlueprintInstanceView, 'status'>,
): boolean => instance.status === 'AVAILABLE';

export const createLegacyBlueprintInstances = (
  stack: LegacyBlueprintStackInput,
): readonly WorkshopBlueprintInstanceView[] => {
  const quantity = normalizeQuantity(stack.quantity);

  return Array.from({ length: quantity }, (_, index): WorkshopBlueprintInstanceView => ({
    id: `legacy:${stack.playerId}:${stack.blueprintCode}:${index + 1}`,
    playerId: stack.playerId,
    blueprintCode: stack.blueprintCode,
    rarity: 'COMMON',
    sourceType: 'LEGACY',
    sourceId: null,
    discoveryKind: 'LEGACY',
    quality: 'STURDY',
    craftPotential: 'legacy_default',
    modifierSnapshot: {},
    status: 'AVAILABLE',
    createdAt: stack.createdAt,
    updatedAt: stack.updatedAt,
    discoveredAt: stack.updatedAt,
    consumedAt: null,
  }));
};

export const isSecretSkinningKitConditionMet = (
  input: SecretSkinningKitConditionInput,
): boolean => (
  input.enemyKind === 'beast'
  && input.successfulTrophyActions >= 3
  && input.bestiaryVictoryCount >= 5
);
