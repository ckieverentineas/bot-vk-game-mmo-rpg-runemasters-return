import { describe, expect, it, vi } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import {
  normalizeBattleActionResult,
  persistBattleActionReplay,
  wrapBattleActionResult,
} from './battle-action-result';

const createBattle = (): BattleView => ({
  id: 'battle-1',
} as BattleView);

describe('battle action result helpers', () => {
  it('wraps a raw battle into an application result', () => {
    const battle = createBattle();

    expect(wrapBattleActionResult(battle)).toEqual({
      battle,
      player: null,
      acquisitionSummary: null,
    });
  });

  it('marks replayed raw battle results', () => {
    const battle = createBattle();

    expect(normalizeBattleActionResult(battle, true)).toEqual({
      battle,
      player: null,
      acquisitionSummary: null,
      replayed: true,
    });
  });

  it('stores replay results only when an intent id exists', async () => {
    const repository = {
      storeCommandIntentResult: vi.fn(),
    };
    const result = wrapBattleActionResult(createBattle());

    await persistBattleActionReplay(repository, 1, undefined, result);
    await persistBattleActionReplay(repository, 1, 'intent-1', result);

    expect(repository.storeCommandIntentResult).toHaveBeenCalledTimes(1);
    expect(repository.storeCommandIntentResult).toHaveBeenCalledWith(1, 'intent-1', result);
  });
});
