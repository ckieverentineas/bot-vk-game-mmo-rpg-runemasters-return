import { Prisma, PrismaClient, type PlayerBlueprint, type PlayerCraftedItem } from '@prisma/client';

import { AppError } from '../../../../shared/domain/AppError';
import type {
  BattleView,
  InventoryDelta,
  MaterialField,
} from '../../../../shared/types/game';
import type {
  GameCommandIntentKey,
} from '../../application/ports/GameRepository';
import type {
  PlayerBlueprintView,
  PlayerCraftedItemView,
  WorkshopMutationOptions,
} from '../../../workshop/application/workshop-persistence';
import {
  canEquipWorkshopItem,
  getWorkshopBlueprint,
  isWorkshopBlueprintCode,
  isWorkshopItemClass,
  isWorkshopItemCode,
  isWorkshopItemSlot,
  isWorkshopItemStatus,
  resolveWorkshopItemDecay,
  type WorkshopBlueprintCode,
  type WorkshopBlueprintCost,
  type WorkshopBlueprintDefinition,
  type WorkshopCraftItemBlueprintDefinition,
  type WorkshopEquippedItemView,
  type WorkshopRepairToolBlueprintDefinition,
} from '../../../workshop/domain/workshop-catalog';
import {
  buildInventoryAvailabilityWhere,
  buildInventoryDeltaInput,
} from './prisma-inventory-utils';

type TransactionClient = Prisma.TransactionClient;

type RunWithCommandIntent = <TResult>(
  tx: TransactionClient,
  playerId: number,
  commandKey: GameCommandIntentKey,
  intentId: string | undefined,
  stateKey: string | undefined,
  currentStateKey: string | undefined,
  apply: () => Promise<TResult>,
) => Promise<TResult>;

interface PrismaWorkshopPersistenceContext {
  readonly runWithCommandIntent: RunWithCommandIntent;
}

const workshopMaterialFields: readonly MaterialField[] = [
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

const buildWorkshopCostInventoryDelta = (cost: WorkshopBlueprintCost): InventoryDelta => (
  workshopMaterialFields.reduce<InventoryDelta>((delta, field) => {
    const amount = cost[field] ?? 0;

    if (amount <= 0) {
      return delta;
    }

    return {
      ...delta,
      [field]: -amount,
    };
  }, {})
);

const requireWorkshopBlueprintDefinition = (
  blueprintCode: WorkshopBlueprintCode,
): WorkshopBlueprintDefinition => {
  try {
    return getWorkshopBlueprint(blueprintCode);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('workshop_blueprint_not_found', 'Чертёж мастерской не найден.');
  }
};

const requireWorkshopCraftBlueprint = (
  blueprintCode: WorkshopBlueprintCode,
): WorkshopCraftItemBlueprintDefinition => {
  const blueprint = requireWorkshopBlueprintDefinition(blueprintCode);

  if (blueprint.kind !== 'craft_item') {
    throw new AppError('workshop_blueprint_not_craftable', 'Этот чертёж не создаёт предмет.');
  }

  return blueprint;
};

const requireWorkshopRepairBlueprint = (
  blueprintCode: WorkshopBlueprintCode,
): WorkshopRepairToolBlueprintDefinition => {
  const blueprint = requireWorkshopBlueprintDefinition(blueprintCode);

  if (blueprint.kind !== 'repair_tool') {
    throw new AppError('workshop_blueprint_not_repair_tool', 'Этот чертёж не подходит для ремонта.');
  }

  return blueprint;
};

const assertPositiveBlueprintQuantity = (quantity: number): void => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError('invalid_blueprint_quantity', 'Количество чертежей должно быть положительным.');
  }
};

const requireKnownWorkshopValue = <TValue extends string>(
  value: string,
  isKnown: (candidate: string) => candidate is TValue,
  fieldName: string,
): TValue => {
  if (!isKnown(value)) {
    throw new AppError('workshop_persistence_invalid', `В записи мастерской неизвестное поле ${fieldName}.`);
  }

  return value;
};

const mapPlayerBlueprintRecord = (record: PlayerBlueprint): PlayerBlueprintView => ({
  playerId: record.playerId,
  blueprintCode: requireKnownWorkshopValue(record.blueprintCode, isWorkshopBlueprintCode, 'blueprintCode'),
  quantity: record.quantity,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapPlayerCraftedItemRecord = (record: PlayerCraftedItem): PlayerCraftedItemView => ({
  id: record.id,
  playerId: record.playerId,
  itemCode: requireKnownWorkshopValue(record.itemCode, isWorkshopItemCode, 'itemCode'),
  itemClass: requireKnownWorkshopValue(record.itemClass, isWorkshopItemClass, 'itemClass'),
  slot: requireKnownWorkshopValue(record.slot, isWorkshopItemSlot, 'slot'),
  status: requireKnownWorkshopValue(record.status, isWorkshopItemStatus, 'status'),
  equipped: record.equipped,
  durability: record.durability,
  maxDurability: record.maxDurability,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const spendWorkshopBlueprint = async (
  client: TransactionClient,
  playerId: number,
  blueprintCode: WorkshopBlueprintCode,
  errorMessage: string,
): Promise<void> => {
  const spent = await client.playerBlueprint.updateMany({
    where: {
      playerId,
      blueprintCode,
      quantity: { gte: 1 },
    },
    data: {
      quantity: { decrement: 1 },
    },
  });

  if (spent.count === 0) {
    throw new AppError('workshop_blueprint_spent', errorMessage);
  }
};

const spendWorkshopInventoryCost = async (
  client: TransactionClient,
  playerId: number,
  cost: WorkshopBlueprintCost,
  errorCode: string,
  errorMessage: string,
): Promise<void> => {
  const inventoryDelta = buildWorkshopCostInventoryDelta(cost);
  const inventorySpend = buildInventoryDeltaInput(inventoryDelta);

  if (Object.keys(inventorySpend).length === 0) {
    return;
  }

  const spent = await client.playerInventory.updateMany({
    where: buildInventoryAvailabilityWhere(playerId, inventoryDelta),
    data: inventorySpend as Prisma.PlayerInventoryUpdateManyMutationInput,
  });

  if (spent.count === 0) {
    throw new AppError(errorCode, errorMessage);
  }
};

const toWorkshopEquippedItem = (item: PlayerCraftedItem): WorkshopEquippedItemView => ({
  id: item.id,
  code: requireKnownWorkshopValue(item.itemCode, isWorkshopItemCode, 'itemCode'),
  itemClass: requireKnownWorkshopValue(item.itemClass, isWorkshopItemClass, 'itemClass'),
  slot: requireKnownWorkshopValue(item.slot, isWorkshopItemSlot, 'slot'),
  status: requireKnownWorkshopValue(item.status, isWorkshopItemStatus, 'status'),
  equipped: item.equipped,
  durability: item.durability,
  maxDurability: item.maxDurability,
});

const canRepairCraftedItemRecord = (item: PlayerCraftedItem): boolean => {
  if (item.itemClass !== 'UL' || item.durability >= item.maxDurability) {
    return false;
  }

  if (item.status === 'BROKEN') {
    return true;
  }

  return item.status === 'ACTIVE';
};

const canEquipCraftedItemRecord = (item: PlayerCraftedItem): boolean => (
  item.status === 'ACTIVE'
  && item.durability > 0
  && canEquipWorkshopItem(toWorkshopEquippedItem(item))
);

export class PrismaWorkshopPersistence {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly context: PrismaWorkshopPersistenceContext,
  ) {}

  public async listPlayerBlueprints(playerId: number): Promise<readonly PlayerBlueprintView[]> {
    const blueprints = await this.prisma.playerBlueprint.findMany({
      where: { playerId },
      orderBy: { blueprintCode: 'asc' },
    });

    return blueprints.map(mapPlayerBlueprintRecord);
  }

  public async listPlayerCraftedItems(playerId: number): Promise<readonly PlayerCraftedItemView[]> {
    const items = await this.prisma.playerCraftedItem.findMany({
      where: { playerId },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    return items.map(mapPlayerCraftedItemRecord);
  }

  public async grantPlayerBlueprint(
    playerId: number,
    blueprintCode: WorkshopBlueprintCode,
    quantity: number,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerBlueprintView> {
    return this.prisma.$transaction((tx) => this.context.runWithCommandIntent(
      tx,
      playerId,
      'GRANT_WORKSHOP_BLUEPRINT',
      options?.intentId,
      options?.intentStateKey,
      options?.currentStateKey,
      async () => {
        requireWorkshopBlueprintDefinition(blueprintCode);
        assertPositiveBlueprintQuantity(quantity);

        const blueprint = await tx.playerBlueprint.upsert({
          where: {
            playerId_blueprintCode: {
              playerId,
              blueprintCode,
            },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            playerId,
            blueprintCode,
            quantity,
          },
        });

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        return mapPlayerBlueprintRecord(blueprint);
      },
    ));
  }

  public async craftWorkshopItem(
    playerId: number,
    blueprintCode: WorkshopBlueprintCode,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.prisma.$transaction((tx) => this.context.runWithCommandIntent(
      tx,
      playerId,
      'CRAFT_WORKSHOP_ITEM',
      options?.intentId,
      options?.intentStateKey,
      options?.currentStateKey,
      async () => {
        const blueprint = requireWorkshopCraftBlueprint(blueprintCode);

        await spendWorkshopBlueprint(
          tx,
          playerId,
          blueprint.code,
          'Чертёж для этого предмета уже потрачен.',
        );
        await spendWorkshopInventoryCost(
          tx,
          playerId,
          blueprint.cost,
          'not_enough_workshop_resources',
          'Материалов для предмета уже не хватает.',
        );

        const item = await tx.playerCraftedItem.create({
          data: {
            playerId,
            itemCode: blueprint.resultItemCode,
            itemClass: blueprint.itemClass,
            slot: blueprint.slot,
            status: 'ACTIVE',
            equipped: false,
            durability: blueprint.maxDurability,
            maxDurability: blueprint.maxDurability,
          },
        });

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        return mapPlayerCraftedItemRecord(item);
      },
    ));
  }

  public async repairWorkshopItem(
    playerId: number,
    itemId: string,
    repairBlueprintCode: WorkshopBlueprintCode,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.prisma.$transaction((tx) => this.context.runWithCommandIntent(
      tx,
      playerId,
      'REPAIR_WORKSHOP_ITEM',
      options?.intentId,
      options?.intentStateKey,
      options?.currentStateKey,
      async () => {
        const repairBlueprint = requireWorkshopRepairBlueprint(repairBlueprintCode);

        const item = await tx.playerCraftedItem.findFirst({
          where: {
            id: itemId,
            playerId,
          },
        });

        if (!item) {
          throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
        }

        if (!canRepairCraftedItemRecord(item)) {
          throw new AppError('workshop_item_not_repairable', 'Этот предмет нельзя отремонтировать.');
        }

        await spendWorkshopBlueprint(
          tx,
          playerId,
          repairBlueprint.code,
          'Ремонтный чертёж уже потрачен.',
        );
        await spendWorkshopInventoryCost(
          tx,
          playerId,
          repairBlueprint.cost,
          'not_enough_workshop_repair_resources',
          'Материалов для ремонта уже не хватает.',
        );

        const repaired = await tx.playerCraftedItem.updateMany({
          where: {
            id: itemId,
            playerId,
            itemClass: 'UL',
            status: { in: ['ACTIVE', 'BROKEN'] },
            durability: {
              lt: item.maxDurability,
            },
          },
          data: {
            status: 'ACTIVE',
            durability: item.maxDurability,
          },
        });

        if (repaired.count === 0) {
          throw new AppError('workshop_item_not_repairable', 'Этот предмет уже нельзя отремонтировать.');
        }

        const repairedItem = await tx.playerCraftedItem.findFirst({
          where: {
            id: itemId,
            playerId,
          },
        });

        if (!repairedItem) {
          throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
        }

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        return mapPlayerCraftedItemRecord(repairedItem);
      },
    ));
  }

  public async equipWorkshopItem(
    playerId: number,
    itemId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.prisma.$transaction((tx) => this.context.runWithCommandIntent(
      tx,
      playerId,
      'EQUIP_WORKSHOP_ITEM',
      options?.intentId,
      options?.intentStateKey,
      options?.currentStateKey,
      async () => {
        const item = await tx.playerCraftedItem.findFirst({
          where: {
            id: itemId,
            playerId,
          },
        });

        if (!item || !canEquipCraftedItemRecord(item)) {
          throw new AppError('workshop_item_not_equippable', 'Этот предмет нельзя экипировать.');
        }

        await tx.playerCraftedItem.updateMany({
          where: {
            playerId,
            slot: item.slot,
            equipped: true,
          },
          data: { equipped: false },
        });

        const equipped = await tx.playerCraftedItem.updateMany({
          where: {
            id: itemId,
            playerId,
            status: 'ACTIVE',
            durability: { gt: 0 },
          },
          data: { equipped: true },
        });

        if (equipped.count === 0) {
          throw new AppError('workshop_item_not_equippable', 'Этот предмет уже нельзя экипировать.');
        }

        const updatedItem = await tx.playerCraftedItem.findFirst({
          where: {
            id: itemId,
            playerId,
          },
        });

        if (!updatedItem) {
          throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
        }

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        return mapPlayerCraftedItemRecord(updatedItem);
      },
    ));
  }

  public async unequipWorkshopItem(
    playerId: number,
    itemId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.prisma.$transaction((tx) => this.context.runWithCommandIntent(
      tx,
      playerId,
      'UNEQUIP_WORKSHOP_ITEM',
      options?.intentId,
      options?.intentStateKey,
      options?.currentStateKey,
      async () => {
        const item = await tx.playerCraftedItem.findFirst({
          where: {
            id: itemId,
            playerId,
          },
        });

        if (!item) {
          throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
        }

        const unequipped = await tx.playerCraftedItem.updateMany({
          where: {
            id: itemId,
            playerId,
          },
          data: { equipped: false },
        });

        if (unequipped.count === 0) {
          throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
        }

        const updatedItem = await tx.playerCraftedItem.findFirst({
          where: {
            id: itemId,
            playerId,
          },
        });

        if (!updatedItem) {
          throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
        }

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        return mapPlayerCraftedItemRecord(updatedItem);
      },
    ));
  }

  public async decayLoadout(
    client: TransactionClient,
    playerId: number,
    battle: BattleView,
  ): Promise<void> {
    const itemIds = [...new Set((battle.player.workshopLoadout ?? []).map((item) => item.id))];
    if (itemIds.length === 0) {
      return;
    }

    const items = await client.playerCraftedItem.findMany({
      where: {
        playerId,
        id: { in: itemIds },
        status: 'ACTIVE',
        durability: { gt: 0 },
      },
    });

    for (const item of items) {
      const decayed = resolveWorkshopItemDecay(toWorkshopEquippedItem(item));

      await client.playerCraftedItem.updateMany({
        where: {
          id: item.id,
          playerId,
          status: 'ACTIVE',
          durability: { gt: 0 },
        },
        data: {
          status: decayed.status,
          equipped: decayed.equipped,
          durability: decayed.durability,
        },
      });
    }
  }
}
