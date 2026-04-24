import { describe, expect, it, vi } from 'vitest';

import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
} from './command-intent';

describe('resolveCommandIntent', () => {
  it('returns null when command has no intent envelope', () => {
    expect(resolveCommandIntent(undefined, undefined)).toBeNull();
  });

  it('rejects incomplete intent envelopes', () => {
    expect(() => resolveCommandIntent('intent-only', undefined)).toThrowError('Этот след уже выцвел');
    expect(() => resolveCommandIntent(undefined, 'state-only')).toThrowError('Этот след уже выцвел');
  });

  it('synthesizes the state key for legacy text intents', () => {
    expect(resolveCommandIntent('legacy-intent-1', undefined, 'legacy_text')).toEqual({
      intentId: 'legacy-intent-1',
      intentStateKey: 'legacy-intent-1',
    });
  });

  it('rejects missing intent data when a command requires scoped replay protection', () => {
    expect(() => resolveCommandIntent(undefined, undefined, 'payload', false)).toThrowError('Этот след уже выцвел');
  });
});

describe('loadCommandIntentReplay', () => {
  it('skips replay lookup when there is no intent id', async () => {
    const repository = {
      getCommandIntentResult: vi.fn(),
    };

    await expect(loadCommandIntentReplay({
      repository,
      playerId: 1,
      intentId: undefined,
      pendingMessage: 'Подождите ответ.',
    })).resolves.toBeNull();

    expect(repository.getCommandIntentResult).not.toHaveBeenCalled();
  });

  it('returns mapped applied replay result with command and state guards', async () => {
    const repository = {
      getCommandIntentResult: vi.fn().mockResolvedValue({
        status: 'APPLIED',
        result: { value: 7 },
      }),
    };

    const result = await loadCommandIntentReplay({
      repository,
      playerId: 1,
      intentId: 'intent-1',
      expectedCommandKeys: ['BATTLE_ATTACK'],
      expectedStateKey: 'state-1',
      pendingMessage: 'Подождите ответ.',
      mapResult: (stored: { readonly value: number }) => stored.value,
    });

    expect(result).toBe(7);
    expect(repository.getCommandIntentResult).toHaveBeenCalledWith(
      1,
      'intent-1',
      ['BATTLE_ATTACK'],
      'state-1',
    );
  });

  it('throws a typed pending retry error', async () => {
    const repository = {
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'PENDING' }),
    };

    await expect(loadCommandIntentReplay({
      repository,
      playerId: 1,
      intentId: 'intent-pending',
      pendingMessage: 'Команда еще в пути.',
    })).rejects.toMatchObject({
      code: 'command_retry_pending',
      message: 'Команда еще в пути.',
    });
  });
});

describe('assertFreshCommandIntent', () => {
  it('allows legacy text intents to bypass current state comparison', () => {
    expect(() => assertFreshCommandIntent({
      intent: { intentId: 'legacy-1', intentStateKey: 'legacy-1' },
      intentSource: 'legacy_text',
      currentStateKey: 'current-state',
      staleMessage: 'След устарел.',
    })).not.toThrow();
  });

  it('rejects payload intents with stale state key', () => {
    expect(() => assertFreshCommandIntent({
      intent: { intentId: 'payload-1', intentStateKey: 'old-state' },
      intentSource: 'payload',
      currentStateKey: 'current-state',
      staleMessage: 'След устарел.',
    })).toThrowError('След устарел.');
  });

  it('can require a resolved intent for guarded commands', () => {
    expect(() => assertFreshCommandIntent({
      intent: null,
      intentSource: 'payload',
      currentStateKey: 'current-state',
      staleMessage: 'След обязателен.',
      requireIntent: true,
    })).toThrowError('След обязателен.');
  });
});
