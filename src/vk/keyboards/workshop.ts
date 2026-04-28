import { Keyboard } from 'vk-io';

import {
  buildCraftingIntentStateKey,
  buildUseConsumableIntentStateKey,
} from '../../modules/crafting/application/command-intent-state';
import {
  canPayCraftingRecipe,
  listCraftingRecipes,
} from '../../modules/crafting/domain/crafting-recipes';
import {
  getAlchemyConsumableCount,
  listAlchemyConsumables,
} from '../../modules/consumables/domain/alchemy-consumables';
import {
  buildAwakenWorkshopBlueprintFeatureIntentStateKey,
  buildBuyWorkshopShopOfferIntentStateKey,
  buildCraftWorkshopItemIntentStateKey,
  buildEquipWorkshopItemIntentStateKey,
  buildRepairWorkshopItemIntentStateKey,
  buildUnequipWorkshopItemIntentStateKey,
} from '../../modules/workshop/application/command-intent-state';
import type {
  WorkshopBlueprintEntryView,
  WorkshopCraftedItemEntryView,
  WorkshopShopOfferEntryView,
  WorkshopView,
} from '../../modules/workshop/application/workshop-view';
import type { WorkshopRepairToolBlueprintDefinition } from '../../modules/workshop/domain/workshop-catalog';
import {
  createWorkshopCraftCommand,
  createWorkshopAwakenCommand,
  createWorkshopEquipCommand,
  createWorkshopRepairCommand,
  createWorkshopShopCommand,
  createWorkshopUnequipCommand,
  gameCommands,
  resolveCraftingRecipeCodeCommand,
  resolveUseConsumableCodeCommand,
} from '../commands/catalog';
import {
  resolveWorkshopBlueprintTitle,
  resolveWorkshopItemTitle,
} from '../presenters/workshopLabels';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const rowSize = 2;
const maxKeyboardRows = 6;
const navigationRowCount = 2;
const awakenButtonLimit = 4;
const equipmentButtonLimit = 4;
const repairButtonLimit = 4;
const shopButtonLimit = 4;

const chunkRows = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

const limitActionRows = (rows: KeyboardLayout): KeyboardLayout => (
  rows.slice(0, maxKeyboardRows - navigationRowCount)
);

const truncateLabel = (text: string, maxLength: number): string => (
  text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}…`
);

const resolveButtonIcon = (label: string): string => label.split(' ')[0] ?? '💊';

const createBlueprintStateEntries = (view: WorkshopView) => (
  view.blueprints.map((entry) => entry.instance)
);

const createCraftedItemStateEntries = (view: WorkshopView) => (
  view.craftedItems.map((entry) => entry.item)
);

const isCraftItemBlueprintEntry = (
  entry: WorkshopBlueprintEntryView,
): boolean => entry.blueprint.kind === 'craft_item';

const createWorkshopAwakenRows = (view: WorkshopView): KeyboardLayout => {
  const blueprintStateEntries = createBlueprintStateEntries(view);
  const buttons = view.blueprints
    .filter((entry) => entry.featureAwakeningRadianceCost > 0)
    .slice(0, awakenButtonLimit)
    .map((entry) => ({
      label: truncateLabel(
        `✨ Пробудить ${resolveWorkshopBlueprintTitle(entry.blueprint.code)} · ${entry.featureAwakeningRadianceCost}`,
        40,
      ),
      command: createWorkshopAwakenCommand(entry.instance.id),
      color: entry.canAwakenFeature ? Keyboard.PRIMARY_COLOR : Keyboard.SECONDARY_COLOR,
      intentScoped: true,
      stateKey: buildAwakenWorkshopBlueprintFeatureIntentStateKey(
        view.player,
        entry.instance.id,
        blueprintStateEntries,
      ),
    }));

  return chunkRows(buttons, rowSize);
};

const createWorkshopCraftRows = (view: WorkshopView): KeyboardLayout => {
  const blueprintStateEntries = createBlueprintStateEntries(view);
  const craftedItemStateEntries = createCraftedItemStateEntries(view);
  const buttons = view.blueprints
    .filter(isCraftItemBlueprintEntry)
    .filter((entry) => entry.ownedQuantity > 0)
    .map((entry) => ({
      label: truncateLabel(
        `${entry.canCraft ? '⚒' : '🧩'} ${resolveWorkshopBlueprintTitle(entry.blueprint.code)} x${entry.ownedQuantity}`,
        40,
      ),
      command: createWorkshopCraftCommand(entry.instance.id),
      color: entry.canCraft ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR,
      intentScoped: true,
      stateKey: buildCraftWorkshopItemIntentStateKey(
        view.player,
        entry.instance.id,
        blueprintStateEntries,
        craftedItemStateEntries,
      ),
    }));

  return chunkRows(buttons, rowSize);
};

const createEquipmentButtonLabel = (entry: WorkshopCraftedItemEntryView): string => {
  const action = entry.item.equipped ? '↩ Снять' : '🎽 Надеть';
  return truncateLabel(`${action} ${resolveWorkshopItemTitle(entry.item.itemCode)}`, 40);
};

const createWorkshopEquipmentRows = (view: WorkshopView): KeyboardLayout => {
  const craftedItemStateEntries = createCraftedItemStateEntries(view);
  const buttons = view.craftedItems
    .filter((entry) => entry.item.equipped || entry.equippable)
    .map((entry) => {
      const command = entry.item.equipped
        ? createWorkshopUnequipCommand(entry.item.id)
        : createWorkshopEquipCommand(entry.item.id);
      const stateKey = entry.item.equipped
        ? buildUnequipWorkshopItemIntentStateKey(view.player, entry.item.id, craftedItemStateEntries)
        : buildEquipWorkshopItemIntentStateKey(view.player, entry.item.id, craftedItemStateEntries);

      return {
        label: createEquipmentButtonLabel(entry),
        command,
        color: entry.item.equipped ? Keyboard.SECONDARY_COLOR : Keyboard.POSITIVE_COLOR,
        intentScoped: true,
        stateKey,
      };
    })
    .slice(0, equipmentButtonLimit);

  return chunkRows(buttons, rowSize);
};

const createRepairButtonLabel = (
  entry: WorkshopCraftedItemEntryView,
  repairBlueprint: WorkshopRepairToolBlueprintDefinition,
): string => (
  truncateLabel(`🔧 Починить ${resolveWorkshopItemTitle(entry.item.itemCode)} ${repairBlueprint.itemClass}`, 40)
);

const createWorkshopRepairRows = (view: WorkshopView): KeyboardLayout => {
  const blueprintStateEntries = createBlueprintStateEntries(view);
  const craftedItemStateEntries = createCraftedItemStateEntries(view);
  const buttons = view.craftedItems
    .flatMap((entry) => entry.availableRepairTools.map((repairTool) => ({
      label: createRepairButtonLabel(entry, repairTool.blueprint),
      command: createWorkshopRepairCommand(entry.item.id, repairTool.instance.id),
      color: Keyboard.POSITIVE_COLOR,
      intentScoped: true,
      stateKey: buildRepairWorkshopItemIntentStateKey(
        view.player,
        entry.item.id,
        repairTool.instance.id,
        blueprintStateEntries,
        craftedItemStateEntries,
      ),
    })))
    .slice(0, repairButtonLimit);

  return chunkRows(buttons, rowSize);
};

const createWorkshopShopButtonLabel = (entry: WorkshopShopOfferEntryView): string => {
  const icon = entry.canBuy ? '🛒' : '💰';
  return truncateLabel(`${icon} ${entry.offer.buttonLabel} · ${entry.offer.priceDust}`, 40);
};

const createWorkshopShopRows = (view: WorkshopView): KeyboardLayout => {
  const buttons = view.shopOffers
    .slice(0, shopButtonLimit)
    .map((entry) => ({
      label: createWorkshopShopButtonLabel(entry),
      command: createWorkshopShopCommand(entry.offer.code),
      color: entry.canBuy ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR,
      intentScoped: true,
      stateKey: buildBuyWorkshopShopOfferIntentStateKey(view.player, entry.offer.code),
    }));

  return chunkRows(buttons, rowSize);
};

const createPillCraftingRows = (view: WorkshopView): KeyboardLayout => {
  const buttons = listCraftingRecipes().map((recipe) => {
    const canCraft = canPayCraftingRecipe(view.player, recipe);

    return {
      label: truncateLabel(`${canCraft ? '✅' : '🧩'} ${recipe.buttonLabel}`, 40),
      command: resolveCraftingRecipeCodeCommand(recipe.code),
      color: canCraft ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR,
      intentScoped: true,
      stateKey: buildCraftingIntentStateKey(view.player, recipe.code),
    };
  });

  return chunkRows(buttons, rowSize);
};

const createUseConsumableRows = (view: WorkshopView): KeyboardLayout => {
  const buttons = listAlchemyConsumables()
    .map((consumable) => ({
      consumable,
      count: getAlchemyConsumableCount(view.player.inventory, consumable),
    }))
    .filter((entry) => entry.count > 0)
    .map(({ consumable, count }) => ({
      label: truncateLabel(
        `${resolveButtonIcon(consumable.buttonLabel)} ${consumable.title.replace(/^Пилюля\s+/u, '')} x${count}`,
        40,
      ),
      command: resolveUseConsumableCodeCommand(consumable.code),
      color: Keyboard.PRIMARY_COLOR,
      intentScoped: true,
      stateKey: buildUseConsumableIntentStateKey(view.player, consumable.code),
    }));

  return chunkRows(buttons, rowSize);
};

const createWorkshopActionRows = (view: WorkshopView): KeyboardLayout => limitActionRows([
  ...createWorkshopAwakenRows(view),
  ...createWorkshopCraftRows(view),
  ...createWorkshopEquipmentRows(view),
  ...createWorkshopRepairRows(view),
  ...createWorkshopShopRows(view),
  ...createPillCraftingRows(view),
  ...createUseConsumableRows(view),
]);

const createNavigationRows = (): KeyboardLayout => [
  [
    { label: '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.SECONDARY_COLOR },
    { label: '🕯 Алтарь', command: gameCommands.altar, color: Keyboard.SECONDARY_COLOR },
  ],
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

const createWorkshopLayout = (view: WorkshopView): KeyboardLayout => [
  ...createWorkshopActionRows(view),
  ...createNavigationRows(),
];

export const createWorkshopKeyboard = (view: WorkshopView): KeyboardBuilder => (
  buildKeyboard(createWorkshopLayout(view))
);
