import { PrismaClient } from '@prisma/client';

import { env } from '../config/env';

void env.databaseUrl;

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
