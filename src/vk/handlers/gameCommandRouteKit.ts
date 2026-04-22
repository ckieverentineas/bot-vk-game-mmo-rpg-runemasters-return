import type { Context } from 'vk-io';

import { gameCommands } from '../commands/catalog';
import { resolveCommandEnvelope } from '../router/commandRouter';
import type { GameHandler } from './gameHandler';

export type CommandIntentContext = {
  readonly intentId: string | null;
  readonly stateKey: string | null;
  readonly intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'];
};

export type StaticCommandHandler = (
  handler: GameHandler,
  ctx: Context,
  vkId: number,
  context: CommandIntentContext,
) => Promise<void>;

type DynamicCommandResolver<T> = (command: string) => T | null;

type DynamicCommandExecutor<T> = (
  handler: GameHandler,
  ctx: Context,
  vkId: number,
  value: T,
  context: CommandIntentContext,
) => Promise<void>;

export type DynamicCommandRoute = {
  readonly tryHandle: (
    handler: GameHandler,
    ctx: Context,
    vkId: number,
    command: string,
    context: CommandIntentContext,
  ) => Promise<boolean>;
};

export type GameCommandType = typeof gameCommands[keyof typeof gameCommands];

export type StaticCommandRouteConfig = Readonly<Partial<Record<GameCommandType, StaticCommandHandler>>>;

export const createDynamicCommandRoute = <T>(
  resolve: DynamicCommandResolver<T>,
  handle: DynamicCommandExecutor<T>,
): DynamicCommandRoute => ({
  tryHandle: async (handler, ctx, vkId, command, context) => {
    const resolvedValue = resolve(command);
    if (resolvedValue === null) {
      return false;
    }

    await handle(handler, ctx, vkId, resolvedValue, context);
    return true;
  },
});

export const toRouteState = (context: CommandIntentContext): {
  intentId: string | undefined;
  stateKey: string | undefined;
  intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'];
} => ({
  intentId: context.intentId ?? undefined,
  stateKey: context.stateKey ?? undefined,
  intentSource: context.intentSource,
});
