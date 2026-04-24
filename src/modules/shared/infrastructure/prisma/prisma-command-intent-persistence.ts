import { Prisma, PrismaClient } from '@prisma/client';

import { AppError } from '../../../../shared/domain/AppError';
import { stringifyJson } from '../../../../shared/utils/json';
import type {
  CommandIntentReplayResult,
  GameCommandIntentKey,
} from '../../application/ports/GameRepository';

type TransactionClient = Prisma.TransactionClient;

const staleCommandIntentMessage = 'Этот след уже выцвел. Вернитесь к свежей развилке.';
const commandRetryPendingMessage = 'Прошлый жест ещё в пути. Дождитесь ответа.';

const parseCommandIntentResultSnapshot = <TResult>(value: string): TResult => (
  JSON.parse(value) as TResult
);

export class PrismaCommandIntentPersistence {
  public constructor(private readonly prisma: PrismaClient) {}

  public async reserve<TResult>(
    tx: TransactionClient,
    playerId: number,
    intentId: string,
    commandKey: GameCommandIntentKey,
    stateKey: string,
  ): Promise<TResult | null> {
    const existing = await tx.commandIntentRecord.findUnique({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
    });

    if (existing && (existing.commandKey !== commandKey || existing.stateKey !== stateKey)) {
      throw new AppError('stale_command_intent', staleCommandIntentMessage);
    }

    if (existing?.status === 'APPLIED') {
      return parseCommandIntentResultSnapshot<TResult>(existing.resultSnapshot);
    }

    try {
      await tx.commandIntentRecord.create({
        data: {
          playerId,
          intentId,
          commandKey,
          stateKey,
        },
      });
      return null;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const retried = await tx.commandIntentRecord.findUnique({
        where: {
          playerId_intentId: {
            playerId,
            intentId,
          },
        },
      });

      if (retried && (retried.commandKey !== commandKey || retried.stateKey !== stateKey)) {
        throw new AppError('stale_command_intent', staleCommandIntentMessage);
      }

      if (retried?.status === 'APPLIED') {
        return parseCommandIntentResultSnapshot<TResult>(retried.resultSnapshot);
      }

      throw new AppError('command_retry_pending', commandRetryPendingMessage);
    }
  }

  public async finalize<TResult>(
    tx: TransactionClient,
    playerId: number,
    intentId: string,
    result: TResult,
  ): Promise<void> {
    await tx.commandIntentRecord.update({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
      data: {
        status: 'APPLIED',
        resultSnapshot: stringifyJson(result, '{}'),
      },
    });
  }

  public async run<TResult>(
    tx: TransactionClient,
    playerId: number,
    commandKey: GameCommandIntentKey,
    intentId: string | undefined,
    stateKey: string | undefined,
    currentStateKey: string | undefined,
    apply: () => Promise<TResult>,
  ): Promise<TResult> {
    if (!intentId || !stateKey) {
      return apply();
    }

    const existing = await this.reserve<TResult>(tx, playerId, intentId, commandKey, stateKey);
    if (existing) {
      return existing;
    }

    if (currentStateKey !== undefined && currentStateKey !== stateKey) {
      throw new AppError('stale_command_intent', staleCommandIntentMessage);
    }

    const result = await apply();
    await this.finalize<TResult>(tx, playerId, intentId, result);
    return result;
  }

  public async getResult<TResult = unknown>(
    playerId: number,
    intentId: string,
    expectedCommandKeys?: readonly string[],
    expectedStateKey?: string,
  ): Promise<CommandIntentReplayResult<TResult> | null> {
    const existing = await this.prisma.commandIntentRecord.findUnique({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
    });

    if (!existing) {
      return null;
    }

    if (expectedCommandKeys && !expectedCommandKeys.includes(existing.commandKey)) {
      throw new AppError('stale_command_intent', staleCommandIntentMessage);
    }

    if (expectedStateKey !== undefined && existing.stateKey !== expectedStateKey) {
      throw new AppError('stale_command_intent', staleCommandIntentMessage);
    }

    if (existing.status === 'APPLIED') {
      return {
        status: 'APPLIED',
        result: parseCommandIntentResultSnapshot<TResult>(existing.resultSnapshot),
      };
    }

    return {
      status: 'PENDING',
    };
  }

  public async storeResult<TResult>(
    playerId: number,
    intentId: string,
    result: TResult,
  ): Promise<void> {
    await this.prisma.commandIntentRecord.update({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
      data: {
        status: 'APPLIED',
        resultSnapshot: stringifyJson(result, '{}'),
      },
    });
  }

  public async recordResult<TResult>(
    playerId: number,
    commandKey: GameCommandIntentKey,
    intentId: string | undefined,
    intentStateKey: string | undefined,
    currentStateKey: string | undefined,
    result: TResult,
  ): Promise<TResult> {
    return this.prisma.$transaction((tx) => this.run(
      tx,
      playerId,
      commandKey,
      intentId,
      intentStateKey,
      currentStateKey,
      async () => result,
    ));
  }
}
