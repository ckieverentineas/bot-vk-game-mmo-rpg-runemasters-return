import { AppError } from '../../../shared/domain/AppError';
import type {
  GameCommandIntentKey,
} from './ports/GameRepository';
import type { CommandIntentReplayRepository } from './ports/repository-scopes';

export type CommandIntentSource = 'payload' | 'legacy_text' | null;

export interface ResolvedCommandIntent {
  readonly intentId: string;
  readonly intentStateKey: string;
}

interface LoadCommandIntentReplayOptions<TStoredResult, TResult> {
  readonly repository: CommandIntentReplayRepository;
  readonly playerId: number;
  readonly intentId: string | undefined;
  readonly expectedCommandKeys?: readonly GameCommandIntentKey[];
  readonly expectedStateKey?: string;
  readonly pendingMessage: string;
  readonly mapResult?: (result: TStoredResult) => TResult | Promise<TResult>;
}

interface AssertFreshCommandIntentOptions {
  readonly intent: ResolvedCommandIntent | null;
  readonly intentSource: CommandIntentSource;
  readonly currentStateKey: string;
  readonly staleMessage: string;
  readonly requireIntent?: boolean;
}

export const resolveCommandIntent = (
  intentId: string | undefined,
  intentStateKey: string | undefined,
  source: CommandIntentSource = 'payload',
  allowUnscoped = true,
): ResolvedCommandIntent | null => {
  const hasIntentId = typeof intentId === 'string';
  const hasStateKey = typeof intentStateKey === 'string';

  if (source === 'legacy_text') {
    if (!hasIntentId || hasStateKey) {
      throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
    }

    return {
      intentId,
      intentStateKey: intentId,
    };
  }

  if (hasIntentId !== hasStateKey) {
    throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
  }

  if (!hasIntentId || !hasStateKey) {
    if (!allowUnscoped) {
      throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
    }

    return null;
  }

  return {
    intentId,
    intentStateKey,
  };
};

const getCommandIntentReplay = async <TResult>(
  repository: CommandIntentReplayRepository,
  playerId: number,
  intentId: string,
  expectedCommandKeys: readonly GameCommandIntentKey[] | undefined,
  expectedStateKey: string | undefined,
) => {
  if (expectedStateKey !== undefined) {
    return repository.getCommandIntentResult<TResult>(
      playerId,
      intentId,
      expectedCommandKeys,
      expectedStateKey,
    );
  }

  if (expectedCommandKeys !== undefined) {
    return repository.getCommandIntentResult<TResult>(playerId, intentId, expectedCommandKeys);
  }

  return repository.getCommandIntentResult<TResult>(playerId, intentId);
};

export const loadCommandIntentReplay = async <TResult, TStoredResult = TResult>(
  options: LoadCommandIntentReplayOptions<TStoredResult, TResult>,
): Promise<TResult | null> => {
  if (!options.intentId) {
    return null;
  }

  const replay = await getCommandIntentReplay<TStoredResult>(
    options.repository,
    options.playerId,
    options.intentId,
    options.expectedCommandKeys,
    options.expectedStateKey,
  );

  if (replay?.status === 'PENDING') {
    throw new AppError('command_retry_pending', options.pendingMessage);
  }

  if (replay?.status !== 'APPLIED' || replay.result === undefined || replay.result === null) {
    return null;
  }

  const mapResult = options.mapResult
    ?? ((result: TStoredResult): TResult => result as unknown as TResult);

  return mapResult(replay.result);
};

export function assertFreshCommandIntent(
  options: AssertFreshCommandIntentOptions & { readonly requireIntent: true },
): ResolvedCommandIntent;
export function assertFreshCommandIntent(options: AssertFreshCommandIntentOptions): ResolvedCommandIntent | null;
export function assertFreshCommandIntent(options: AssertFreshCommandIntentOptions): ResolvedCommandIntent | null {
  if (!options.intent) {
    if (options.requireIntent) {
      throw new AppError('stale_command_intent', options.staleMessage);
    }

    return null;
  }

  if (options.intentSource === 'legacy_text') {
    return options.intent;
  }

  if (options.intent.intentStateKey !== options.currentStateKey) {
    throw new AppError('stale_command_intent', options.staleMessage);
  }

  return options.intent;
}
