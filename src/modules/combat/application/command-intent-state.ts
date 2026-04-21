import { createHash } from 'node:crypto';

import type { BattleActionType, BattleView } from '../../../shared/types/game';
import { getBattleRuneLoadoutForAction } from '../domain/battle-rune-loadouts';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

export const buildBattleActionIntentStateKey = (battle: BattleView, action: BattleActionType): string => {
  const activeAbility = getBattleRuneLoadoutForAction(battle, action)?.activeAbility ?? null;

  return serializeStateKey({
    battleId: battle.id,
    status: battle.status,
    actionRevision: battle.actionRevision,
    turnOwner: battle.turnOwner,
    action,
    currentMana: battle.player.currentMana,
    activeAbility: activeAbility
      ? {
          code: activeAbility.code,
          manaCost: activeAbility.manaCost,
          currentCooldown: activeAbility.currentCooldown,
        }
      : null,
  });
};
