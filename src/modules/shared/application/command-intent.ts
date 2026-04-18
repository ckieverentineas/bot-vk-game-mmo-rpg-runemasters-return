import { AppError } from '../../../shared/domain/AppError';

export interface ResolvedCommandIntent {
  readonly intentId: string;
  readonly intentStateKey: string;
}

export const resolveCommandIntent = (
  intentId?: string,
  intentStateKey?: string,
): ResolvedCommandIntent | null => {
  const hasIntentId = typeof intentId === 'string';
  const hasStateKey = typeof intentStateKey === 'string';

  if (hasIntentId !== hasStateKey) {
    throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
  }

  if (!hasIntentId || !hasStateKey) {
    return null;
  }

  return {
    intentId,
    intentStateKey,
  };
};
