import { Prisma } from '@prisma/client';

export const isPrismaUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError => (
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
);
