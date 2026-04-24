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
  buildCraftWorkshopItemIntentStateKey,
  buildEquipWorkshopItemIntentStateKey,
  buildRepairWorkshopItemIntentStateKey,
  buildUnequipWorkshopItemIntentStateKey,
} from '../../modules/workshop/application/command-intent-state';
import type {
  WorkshopBlueprintEntryView,
  WorkshopCraftedItemEntryView,
  WorkshopView,
} from '../../modules/workshop/application/workshop-view';
import type { WorkshopRepairToolBlueprintDefinition } from '../../modules/workshop/domain/workshop-catalog';
import {
  createWorkshopCraftCommand,
  createWorkshopEquipCommand,
  createWorkshopRepairCommand,
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
const equipmentButtonLimit = 4;
const repairButtonLimit = 4;

const chunkRows = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

const truncateLabel = (text: string, maxLength: number): string => (
  text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}…`
);

const createBlueprintStateEntries = (view: WorkshopView) => (
  view.blueprints.map((entry) => ({
    blueprintCode: entry.blueprint.code,
    quantity: entry.ownedQuantity,
  }))
);

const createCraftedItemStateEntries = (view: WorkshopView) => (
  view.craftedItems.map((entry) => entry.item)
);

const isCraftItemBlueprintEntry = (
  entry: WorkshopBlueprintEntryView,
): boolean => entry.blueprint.kind === 'craft_item';

const createWorkshopCraftRows = (view: WorkshopView): KeyboardLayout => {
  const blueprintStateEntries = createBlueprintStateEntries(view);
  const craftedItemStateEntries = createCraftedItemStateEntries(view);
  const buttons = view.blueprints
    .filter(isCraftItemBlueprintEntry)
    .filter((entry) => entry.ownedQuantity > 0)
    .map((entry) => ({
      label: truncateLabel(`⚒ ${resolveWorkshopBlueprintTitle(entry.blueprint.code)} x${entry.ownedQuantity}`, 40),
      command: createWorkshopCraftCommand(entry.blueprint.code),
      color: entry.canCraft ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR,
      intentScoped: true,
      stateKey: buildCraftWorkshopItemIntentStateKey(
        view.player,
        entry.blueprint.code,
        blueprintStateEntries,
        craftedItemStateEntries,
      ),
    }));

  return chunkRows(buttons, rowSize);
};

const createEquipmentButtonLabel = (entry: WorkshopCraftedItemEntryView): string => {
  const action = entry.item.equipped ? 'Снять' : 'Надеть';
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
  truncateLabel(`🔧 ${resolveWorkshopItemTitle(entry.item.itemCode)} ${repairBlueprint.itemClass}`, 40)
);

const createWorkshopRepairRows = (view: WorkshopView): KeyboardLayout => {
  const blueprintStateEntries = createBlueprintStateEntries(view);
  const craftedItemStateEntries = createCraftedItemStateEntries(view);
  const buttons = view.craftedItems
    .flatMap((entry) => entry.availableRepairTools.map((repairTool) => ({
      label: createRepairButtonLabel(entry, repairTool.blueprint),
      command: createWorkshopRepairCommand(entry.item.id, repairTool.blueprint.code),
      color: Keyboard.POSITIVE_COLOR,
      intentScoped: true,
      stateKey: buildRepairWorkshopItemIntentStateKey(
        view.player,
        entry.item.id,
        repairTool.blueprint.code,
        blueprintStateEntries,
        craftedItemStateEntries,
      ),
    })))
    .slice(0, repairButtonLimit);

  return chunkRows(buttons, rowSize);
};

const createPillCraftingRows = (view: WorkshopView): KeyboardLayout => {
  const buttons = listCraftingRecipes().map((recipe) => ({
    label: recipe.buttonLabel,
    command: resolveCraftingRecipeCodeCommand(recipe.code),
    color: canPayCraftingRecipe(view.player, recipe) ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR,
    intentScoped: true,
    stateKey: buildCraftingIntentStateKey(view.player, recipe.code),
  }));

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
      label: truncateLabel(`${consumable.buttonLabel} x${count}`, 40),
      command: resolveUseConsumableCodeCommand(consumable.code),
      color: Keyboard.PRIMARY_COLOR,
      intentScoped: true,
      stateKey: buildUseConsumableIntentStateKey(view.player, consumable.code),
    }));

  return chunkRows(buttons, rowSize);
};

const createWorkshopLayout = (view: WorkshopView): KeyboardLayout => [
  ...createWorkshopCraftRows(view),
  ...createWorkshopEquipmentRows(view),
  ...createWorkshopRepairRows(view),
  ...createPillCraftingRows(view),
  ...createUseConsumableRows(view),
  [
    { label: '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.SECONDARY_COLOR },
    { label: '🕯 Алтарь', command: gameCommands.altar, color: Keyboard.SECONDARY_COLOR },
  ],
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

export const createWorkshopKeyboard = (view: WorkshopView): KeyboardBuilder => (
  buildKeyboard(createWorkshopLayout(view))
);
