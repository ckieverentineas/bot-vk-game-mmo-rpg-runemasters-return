import type {
  WorkshopBlueprintCode,
  WorkshopItemClass,
  WorkshopItemCode,
  WorkshopItemSlot,
  WorkshopItemStatus,
} from '../../modules/workshop/domain/workshop-catalog';

const blueprintTitles: Readonly<Record<WorkshopBlueprintCode, string>> = {
  hunter_cleaver: 'Охотничий тесак',
  tracker_jacket: 'Куртка следопыта',
  skinning_kit: 'Набор свежевателя',
  resonance_tool: 'Резонансный инструмент',
};

const itemTitles: Readonly<Record<WorkshopItemCode, string>> = {
  hunter_cleaver: 'Охотничий тесак',
  tracker_jacket: 'Куртка следопыта',
  skinning_kit: 'Набор свежевателя',
};

const itemClassTitles: Readonly<Record<WorkshopItemClass, string>> = {
  COMMON: 'обычный',
  UNCOMMON: 'необычный',
  RARE: 'редкий',
  EPIC: 'эпический',
  L: 'L',
  UL: 'UL',
};

const itemSlotTitles: Readonly<Record<WorkshopItemSlot, string>> = {
  weapon: 'оружие',
  armor: 'броня',
  trinket: 'талисман',
  tool: 'инструмент',
};

const itemStatusTitles: Readonly<Record<WorkshopItemStatus, string>> = {
  ACTIVE: 'целый',
  BROKEN: 'сломан',
  DESTROYED: 'разрушен',
};

export const resolveWorkshopBlueprintTitle = (blueprintCode: WorkshopBlueprintCode): string => (
  blueprintTitles[blueprintCode]
);

export const resolveWorkshopItemTitle = (itemCode: WorkshopItemCode): string => (
  itemTitles[itemCode]
);

export const resolveWorkshopItemClassTitle = (itemClass: WorkshopItemClass): string => (
  itemClassTitles[itemClass]
);

export const resolveWorkshopItemSlotTitle = (slot: WorkshopItemSlot): string => (
  itemSlotTitles[slot]
);

export const resolveWorkshopItemStatusTitle = (status: WorkshopItemStatus): string => (
  itemStatusTitles[status]
);
