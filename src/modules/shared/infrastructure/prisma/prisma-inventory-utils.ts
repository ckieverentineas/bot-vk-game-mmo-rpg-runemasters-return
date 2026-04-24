import { Prisma } from '@prisma/client';

import type { InventoryDelta } from '../../../../shared/types/game';

export const buildInventoryDeltaInput = (
  delta: InventoryDelta,
): Record<string, { increment: number }> => {
  const data: Record<string, { increment: number }> = {};

  for (const [key, value] of Object.entries(delta)) {
    if (value !== undefined && value !== 0) {
      data[key] = { increment: value };
    }
  }

  return data;
};

export const buildInventoryAvailabilityWhere = (
  playerId: number,
  delta: InventoryDelta,
): Prisma.PlayerInventoryWhereInput => {
  const where: Prisma.PlayerInventoryWhereInput = { playerId };

  for (const [key, value] of Object.entries(delta)) {
    if (value !== undefined && value < 0) {
      where[key as keyof Prisma.PlayerInventoryWhereInput] = { gte: Math.abs(value) } as never;
    }
  }

  return where;
};
