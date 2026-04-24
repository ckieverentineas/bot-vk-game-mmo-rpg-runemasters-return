import { describe, expect, it } from 'vitest';

import {
  formatDefaultPlayerName,
  normalizeRequestedPlayerName,
  resolvePlayerDisplayName,
} from './player-name';

describe('player names', () => {
  it('keeps the default player number marker stable', () => {
    expect(formatDefaultPlayerName(1001)).toBe('Рунный мастер #1001');
    expect(resolvePlayerDisplayName('Рунный мастер #1001', 1001)).toBe('Рунный мастер #1001');
  });

  it('cleans requested nicknames without losing readable text', () => {
    expect(normalizeRequestedPlayerName('  Лианна!!!  ')).toBe('Лианна');
  });
});
