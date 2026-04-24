import {
  canPayCraftingRecipe,
  formatCraftingRecipeOutput,
  listCraftingRecipes,
  resolveCraftingRecipeCost,
  resolveCraftingRecipeMissingCost,
} from '../../modules/crafting/domain/crafting-recipes';
import {
  formatAlchemyConsumableEffect,
  getAlchemyConsumableCount,
  listAlchemyConsumables,
  type AlchemyConsumableDefinition,
} from '../../modules/consumables/domain/alchemy-consumables';
import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import type { WorkshopCraftedItemSummaryView } from '../../modules/workshop/application/use-cases/CraftWorkshopItem';
import type { WorkshopEquippedItemSummaryView } from '../../modules/workshop/application/use-cases/EquipWorkshopItem';
import type { WorkshopRepairedItemSummaryView } from '../../modules/workshop/application/use-cases/RepairWorkshopItem';
import type { WorkshopUnequippedItemSummaryView } from '../../modules/workshop/application/use-cases/UnequipWorkshopItem';
import type {
  WorkshopBlueprintEntryView,
  WorkshopCraftedItemEntryView,
  WorkshopRepairToolEntryView,
  WorkshopView,
} from '../../modules/workshop/application/workshop-view';
import type {
  WorkshopBlueprintCost,
} from '../../modules/workshop/domain/workshop-catalog';
import type { InventoryView, MaterialField } from '../../shared/types/game';
import {
  renderHintBlock,
  renderHintLine,
  withSentencePeriod,
} from './message-formatting';
import {
  resolveWorkshopBlueprintTitle,
  resolveWorkshopItemClassTitle,
  resolveWorkshopItemSlotTitle,
  resolveWorkshopItemStatusTitle,
  resolveWorkshopItemTitle,
} from './workshopLabels';

export type WorkshopScreenSummary =
  | AcquisitionSummaryView
  | WorkshopCraftedItemSummaryView
  | WorkshopEquippedItemSummaryView
  | WorkshopUnequippedItemSummaryView
  | WorkshopRepairedItemSummaryView;

const materialTitles: Readonly<Record<MaterialField, string>> = {
  leather: 'кожа',
  bone: 'кость',
  herb: 'трава',
  essence: 'эссенция',
  metal: 'металл',
  crystal: 'кристалл',
};

const materialFields: readonly MaterialField[] = [
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

const formatInlineList = (items: readonly string[], limit = 3): string => {
  const visibleItems = items.slice(0, limit);
  const hiddenCount = items.length - visibleItems.length;

  return hiddenCount > 0
    ? `${visibleItems.join(', ')} +${hiddenCount}`
    : visibleItems.join(', ');
};

const formatWorkshopCost = (cost: WorkshopBlueprintCost): string => {
  const parts = Object.entries(cost)
    .filter(([, amount]) => amount !== undefined && amount > 0)
    .map(([field, amount]) => `${materialTitles[field as MaterialField] ?? field} ${amount}`);

  return parts.length > 0 ? parts.join(' · ') : 'без материалов';
};

const hasWorkshopCost = (cost: WorkshopBlueprintCost): boolean => (
  Object.values(cost).some((amount) => amount !== undefined && amount > 0)
);

const formatMissingCost = (cost: WorkshopBlueprintCost): string => {
  return hasWorkshopCost(cost) ? `не хватает: ${formatWorkshopCost(cost)}` : 'материалы готовы';
};

const formatMaterialStock = (inventory: InventoryView): string => (
  materialFields
    .map((field) => `${materialTitles[field]} ${inventory[field]}`)
    .join(' · ')
);

const trimPillTitle = (title: string): string => title.replace(/^Пилюля\s+/u, '');

const resolveConsumableIcon = (consumable: AlchemyConsumableDefinition): string => (
  consumable.buttonLabel.split(' ')[0] ?? '💊'
);

const collectAvailableCraftTargets = (view: WorkshopView): readonly string[] => (
  view.blueprints
    .filter((entry) => entry.blueprint.kind === 'craft_item' && entry.canCraft)
    .map((entry) => resolveWorkshopBlueprintTitle(entry.blueprint.code))
);

const collectAvailableEquipTargets = (view: WorkshopView): readonly string[] => (
  view.craftedItems
    .filter((entry) => !entry.item.equipped && entry.equippable)
    .map((entry) => resolveWorkshopItemTitle(entry.item.itemCode))
);

const collectAvailableRepairTargets = (view: WorkshopView): readonly string[] => (
  view.craftedItems.flatMap((entry) => (
    entry.availableRepairTools.map((repairTool) => (
      `${resolveWorkshopItemTitle(entry.item.itemCode)} ${resolveWorkshopItemClassTitle(repairTool.blueprint.itemClass)}`
    ))
  ))
);

const collectAvailablePillCraftTargets = (view: WorkshopView): readonly string[] => (
  listCraftingRecipes()
    .filter((recipe) => canPayCraftingRecipe(view.player, recipe))
    .map((recipe) => trimPillTitle(recipe.title))
);

const collectAvailableConsumableTargets = (view: WorkshopView): readonly string[] => (
  listAlchemyConsumables()
    .map((consumable) => ({
      title: trimPillTitle(consumable.title),
      count: getAlchemyConsumableCount(view.player.inventory, consumable),
    }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.title} x${entry.count}`)
);

const formatQuickActionLine = (
  icon: string,
  title: string,
  targets: readonly string[],
): string | null => (
  targets.length > 0 ? `• ${icon} ${title}: ${formatInlineList(targets)}.` : null
);

const renderWorkshopActions = (view: WorkshopView): readonly string[] => {
  const actionLines = [
    formatQuickActionLine('⚒', 'Создать', collectAvailableCraftTargets(view)),
    formatQuickActionLine('🎽', 'Надеть', collectAvailableEquipTargets(view)),
    formatQuickActionLine('🔧', 'Починить', collectAvailableRepairTargets(view)),
    formatQuickActionLine('🧪', 'Сварить', collectAvailablePillCraftTargets(view)),
    formatQuickActionLine('💊', 'Выпить', collectAvailableConsumableTargets(view)),
  ].filter((line): line is string => line !== null);

  return [
    '📌 Сейчас',
    ...(actionLines.length > 0 ? actionLines : ['• Готовых действий нет.']),
    `🧵 Материалы: ${formatMaterialStock(view.player.inventory)}.`,
  ];
};

const formatBlueprintEntry = (entry: WorkshopBlueprintEntryView): string => {
  const blueprint = entry.blueprint;
  const title = resolveWorkshopBlueprintTitle(blueprint.code);
  const ownedLine = entry.ownedQuantity > 0 ? `чертеж x${entry.ownedQuantity}` : 'чертежа нет';
  const craftState = entry.canCraft
    ? '✅ готово'
    : entry.ownedQuantity > 0
      ? `🧩 ${formatMissingCost(entry.missingCost)}`
      : '🔒 нужен чертеж';
  const resultLine = blueprint.kind === 'craft_item'
    ? `${resolveWorkshopItemSlotTitle(blueprint.slot)} · ${resolveWorkshopItemClassTitle(blueprint.itemClass)} · прочн. ${blueprint.maxDurability}`
    : `${resolveWorkshopItemClassTitle(blueprint.itemClass)} · ремонт`;

  return `• ${craftState} · ${title}: ${ownedLine} · ${resultLine} · ${formatWorkshopCost(blueprint.cost)}.`;
};

const formatRepairToolEntry = (entry: WorkshopRepairToolEntryView): string => {
  const title = resolveWorkshopBlueprintTitle(entry.blueprint.code);
  const status = entry.available
    ? '✅ готово'
    : entry.ownedQuantity > 0
      ? `🧩 ${formatMissingCost(entry.missingCost)}`
      : '🔒 нужен чертеж';
  const ownedLine = entry.ownedQuantity > 0 ? `чертеж x${entry.ownedQuantity}` : 'чертежа нет';

  return `${[
    `• ${status} · ${title}: ${ownedLine}`,
    `чинит ${resolveWorkshopItemClassTitle(entry.blueprint.itemClass)}`,
    formatWorkshopCost(entry.blueprint.cost),
  ].join(' · ')}.`;
};

const formatCraftedItemRepairState = (entry: WorkshopCraftedItemEntryView): string => {
  const item = entry.item;

  if (item.status === 'DESTROYED') {
    return 'не восстановить';
  }

  if (entry.availableRepairTools.length > 0) {
    return '🔧 ремонт готов';
  }

  if (entry.repairable) {
    return '🧩 нужен инструмент';
  }

  if (item.itemClass === 'L') {
    return 'L одноразовый';
  }

  return 'ремонт не нужен';
};

const formatCraftedItemEntry = (entry: WorkshopCraftedItemEntryView): string => {
  const item = entry.item;
  const title = resolveWorkshopItemTitle(item.itemCode);
  const storageLine = item.equipped ? '✅ надет' : '📦 в сумке';
  const equipState = item.equipped
    ? 'можно снять'
    : entry.equippable
      ? 'можно надеть'
      : '⚠️ нельзя надеть';
  const repairLine = formatCraftedItemRepairState(entry);

  const details = [
    resolveWorkshopItemSlotTitle(item.slot),
    resolveWorkshopItemClassTitle(item.itemClass),
    resolveWorkshopItemStatusTitle(item.status),
    storageLine,
    equipState,
    `прочн. ${item.durability}/${item.maxDurability}`,
    repairLine,
  ].join(' · ');

  return `• ${title} #${item.id.slice(0, 8)}: ${details}.`;
};

const renderWorkshopSummary = (summary: WorkshopScreenSummary | null | undefined): readonly string[] => {
  if (!summary) {
    return [];
  }

  const nextStepLine = 'nextStepLine' in summary ? summary.nextStepLine : null;

  return [
    '',
    `✨ ${withSentencePeriod(summary.title)}`,
    ...(nextStepLine ? [`👉 ${withSentencePeriod(nextStepLine)}`] : []),
    ...renderHintBlock([summary.changeLine]),
  ];
};

const renderWorkshopBlueprints = (view: WorkshopView): readonly string[] => {
  const craftBlueprints = view.blueprints.filter((entry) => entry.blueprint.kind === 'craft_item');

  return [
    '⚒ Создать',
    ...(craftBlueprints.length > 0
      ? craftBlueprints.map(formatBlueprintEntry)
      : ['• Пока нет чертежей.']),
  ];
};

const renderWorkshopRepair = (view: WorkshopView): readonly string[] => [
  '🔧 Ремонт',
  ...(view.repairTools.length > 0
    ? view.repairTools.map(formatRepairToolEntry)
    : ['• Инструментов ремонта пока нет.']),
];

const renderCraftedItems = (view: WorkshopView): readonly string[] => [
  '🎽 Снаряжение',
  ...(view.craftedItems.length > 0
    ? view.craftedItems.map(formatCraftedItemEntry)
    : ['• Пока пусто: создайте предмет по чертежу.']),
];

const renderPillCrafting = (view: WorkshopView): readonly string[] => [
  '🧪 Алхимия',
  ...listCraftingRecipes().map((recipe) => {
    const cost = resolveCraftingRecipeCost(recipe);
    const canCraft = canPayCraftingRecipe(view.player, recipe);
    const recipeState = canCraft
      ? `✅ ${formatWorkshopCost(cost)}`
      : `🧩 ${formatMissingCost(resolveCraftingRecipeMissingCost(view.player, recipe))}`;

    return `• ${recipeState} -> ${formatCraftingRecipeOutput(view.player, recipe)}.`;
  }),
];

const renderConsumableStock = (view: WorkshopView): readonly string[] => {
  const stock = listAlchemyConsumables()
    .map((consumable) => ({
      consumable,
      count: getAlchemyConsumableCount(view.player.inventory, consumable),
    }))
    .filter((entry) => entry.count > 0);

  return [
    '💊 Запас',
    ...(stock.length > 0
      ? stock.map(({ consumable, count }) => (
        `• ${resolveConsumableIcon(consumable)} ${consumable.title} x${count}: ${formatAlchemyConsumableEffect(consumable.effect)}.`
      ))
      : ['• Пусто.']),
  ];
};

export const renderWorkshop = (
  view: WorkshopView,
  summary?: WorkshopScreenSummary | null,
): string => [
  '🛠 Мастерская',
  ...renderWorkshopSummary(summary),
  '',
  ...renderWorkshopActions(view),
  '',
  renderHintLine('Пилюли можно пить здесь и в бою; L ломается навсегда, UL чинится.'),
  '',
  ...renderWorkshopBlueprints(view),
  '',
  ...renderCraftedItems(view),
  '',
  ...renderWorkshopRepair(view),
  '',
  ...renderPillCrafting(view),
  '',
  ...renderConsumableStock(view),
].join('\n');
