import { describe, expect, it } from 'vitest';

import { resolveCommandIntent } from './command-intent';

describe('resolveCommandIntent', () => {
  it('returns null when command has no intent envelope', () => {
    expect(resolveCommandIntent(undefined, undefined)).toBeNull();
  });

  it('rejects incomplete intent envelopes', () => {
    expect(() => resolveCommandIntent('intent-only', undefined)).toThrowError('Эта кнопка уже устарела');
    expect(() => resolveCommandIntent(undefined, 'state-only')).toThrowError('Эта кнопка уже устарела');
  });

  it('synthesizes the state key for legacy text intents', () => {
    expect(resolveCommandIntent('legacy-intent-1', undefined, 'legacy_text')).toEqual({
      intentId: 'legacy-intent-1',
      intentStateKey: 'legacy-intent-1',
    });
  });

  it('rejects missing intent data when a command requires scoped replay protection', () => {
    expect(() => resolveCommandIntent(undefined, undefined, 'payload', false)).toThrowError('Эта кнопка уже устарела');
  });
});
