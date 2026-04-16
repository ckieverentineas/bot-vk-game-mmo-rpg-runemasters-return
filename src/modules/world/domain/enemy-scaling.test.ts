import { describe, expect, it } from 'vitest';

import { resolveInitialTurnOwner } from './enemy-scaling';

describe('resolveInitialTurnOwner', () => {
  it('даёт игроку первый ход при близкой разнице в ловкости', () => {
    expect(resolveInitialTurnOwner(3, 4)).toBe('PLAYER');
  });

  it('оставляет первый ход врагу при явном перевесе в ловкости', () => {
    expect(resolveInitialTurnOwner(3, 6)).toBe('ENEMY');
  });
});
