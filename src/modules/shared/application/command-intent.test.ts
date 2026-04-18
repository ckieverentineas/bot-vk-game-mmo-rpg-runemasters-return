import { describe, expect, it } from 'vitest';

import { resolveCommandIntent } from './command-intent';

describe('resolveCommandIntent', () => {
  it('returns null when command has no intent envelope', () => {
    expect(resolveCommandIntent()).toBeNull();
  });

  it('rejects incomplete intent envelopes', () => {
    expect(() => resolveCommandIntent('intent-only', undefined)).toThrowError('Эта кнопка уже устарела');
    expect(() => resolveCommandIntent(undefined, 'state-only')).toThrowError('Эта кнопка уже устарела');
  });
});
