import { AppError } from '../../../shared/domain/AppError';

export type CommandIntentSource = 'payload' | 'legacy_text' | null;

export interface ResolvedCommandIntent {
  readonly intentId: string;
  readonly intentStateKey: string;
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
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return {
      intentId,
      intentStateKey: intentId,
    };
  }

  if (hasIntentId !== hasStateKey) {
    throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
  }

  if (!hasIntentId || !hasStateKey) {
    if (!allowUnscoped) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return null;
  }

  return {
    intentId,
    intentStateKey,
  };
};
