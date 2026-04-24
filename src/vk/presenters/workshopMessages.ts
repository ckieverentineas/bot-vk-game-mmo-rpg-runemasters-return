import {
  formatCraftingRecipeOutput,
  listCraftingRecipes,
  resolveCraftingRecipeCost,
} from '../../modules/crafting/domain/crafting-recipes';
import {
  getAlchemyConsumableCount,
  listAlchemyConsumables,
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
import type { MaterialField } from '../../shared/types/game';
import { withSentencePeriod } from './message-formatting';
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

const formatWorkshopCost = (cost: WorkshopBlueprintCost): string => {
  const parts = Object.entries(cost)
    .filter(([, amount]) => amount !== undefined && amount > 0)
    .map(([field, amount]) => `${materialTitles[field as MaterialField] ?? field} ${amount}`);

  return parts.length > 0 ? parts.join(', ') : 'без материалов';
};

const formatMissingCost = (cost: WorkshopBlueprintCost): string => {
  const formattedCost = formatWorkshopCost(cost);
  return formattedCost === 'без материалов' ? 'материалы готовы' : `не хватает: ${formattedCost}`;
};

const formatBlueprintEntry = (entry: WorkshopBlueprintEntryView): string => {
  const blueprint = entry.blueprint;
  const title = resolveWorkshopBlueprintTitle(blueprint.code);
  const ownedLine = entry.ownedQuantity > 0 ? `чертежей x${entry.ownedQuantity}` : 'чертежа нет';
  const craftState = entry.canCraft
    ? 'можно создать'
    : entry.ownedQuantity > 0
      ? formatMissingCost(entry.missingCost)
      : 'ищите чертеж в наградах';
  const resultLine = blueprint.kind === 'craft_item'
    ? `${resolveWorkshopItemSlotTitle(blueprint.slot)} · ${resolveWorkshopItemClassTitle(blueprint.itemClass)} · прочность ${blueprint.maxDurability}`
    : `${resolveWorkshopItemClassTitle(blueprint.itemClass)} · ремонт`;

  return `- ${title}: ${ownedLine} · ${resultLine} · ${formatWorkshopCost(blueprint.cost)} · ${craftState}.`;
};

const formatRepairToolEntry = (entry: WorkshopRepairToolEntryView): string => {
  const title = resolveWorkshopBlueprintTitle(entry.blueprint.code);
  const status = entry.available
    ? 'готов к ремонту'
    : entry.ownedQuantity > 0
      ? formatMissingCost(entry.missingCost)
      : 'чертежа нет';

  return `- ${title}: чертежей x${entry.ownedQuantity} · ${formatWorkshopCost(entry.blueprint.cost)} · ${status}.`;
};

const formatCraftedItemEntry = (entry: WorkshopCraftedItemEntryView): string => {
  const item = entry.item;
  const title = resolveWorkshopItemTitle(item.itemCode);
  const equippedLine = item.equipped ? 'надет' : 'в сумке';
  const repairLine = entry.availableRepairTools.length > 0
    ? 'ремонт доступен'
    : entry.repairable
      ? 'ремонт возможен, но нужен инструмент'
      : item.itemClass === 'L'
        ? 'L не чинится'
        : 'ремонт недоступен';

  return [
    `- ${title} #${item.id.slice(0, 8)}`,
    resolveWorkshopItemSlotTitle(item.slot),
    resolveWorkshopItemClassTitle(item.itemClass),
    resolveWorkshopItemStatusTitle(item.status),
    equippedLine,
    `прочность ${item.durability}/${item.maxDurability}`,
    repairLine,
  ].join(' · ');
};

const renderWorkshopSummary = (summary: WorkshopScreenSummary | null | undefined): readonly string[] => {
  if (!summary) {
    return [];
  }

  const nextStepLine = 'nextStepLine' in summary ? summary.nextStepLine : null;

  return [
    '',
    `✨ Перемена: ${withSentencePeriod(summary.title)}`,
    `🜂 ${withSentencePeriod(summary.changeLine)}`,
    ...(nextStepLine ? [`👉 Следом: ${withSentencePeriod(nextStepLine)}`] : []),
  ];
};

const renderWorkshopBlueprints = (view: WorkshopView): readonly string[] => {
  const craftBlueprints = view.blueprints.filter((entry) => entry.blueprint.kind === 'craft_item');

  return [
    'Чертежи предметов:',
    ...(craftBlueprints.length > 0
      ? craftBlueprints.map(formatBlueprintEntry)
      : ['- Пока нет известных чертежей предметов.']),
  ];
};

const renderWorkshopRepair = (view: WorkshopView): readonly string[] => [
  'Ремонт UL:',
  ...(view.repairTools.length > 0
    ? view.repairTools.map(formatRepairToolEntry)
    : ['- Ремонтных чертежей пока нет.']),
];

const renderCraftedItems = (view: WorkshopView): readonly string[] => [
  'Созданные предметы:',
  ...(view.craftedItems.length > 0
    ? view.craftedItems.map(formatCraftedItemEntry)
    : ['- В мастерской пока нет созданных предметов.']),
];

const renderPillCrafting = (view: WorkshopView): readonly string[] => [
  'Алхимия пилюль:',
  ...listCraftingRecipes().map((recipe) => {
    const cost = resolveCraftingRecipeCost(recipe);
    return `- ${recipe.title}: ${formatWorkshopCost(cost)} -> ${formatCraftingRecipeOutput(view.player, recipe)}.`;
  }),
];

const renderConsumableStock = (view: WorkshopView): readonly string[] => [
  'Запас пилюль:',
  ...listAlchemyConsumables().map((consumable) => (
    `- ${consumable.title}: x${getAlchemyConsumableCount(view.player.inventory, consumable)} · ${consumable.description}`
  )),
];

export const renderWorkshop = (
  view: WorkshopView,
  summary?: WorkshopScreenSummary | null,
): string => [
  '🛠 Мастерская',
  ...renderWorkshopSummary(summary),
  '',
  'Здесь лежат одноразовые чертежи, предметы с прочностью и алхимия пилюль из добычи.',
  'L предметы не ремонтируются. UL можно восстановить редкими ремонтными чертежами.',
  '',
  ...renderWorkshopBlueprints(view),
  '',
  ...renderWorkshopRepair(view),
  '',
  ...renderCraftedItems(view),
  '',
  ...renderPillCrafting(view),
  '',
  ...renderConsumableStock(view),
].join('\n');
