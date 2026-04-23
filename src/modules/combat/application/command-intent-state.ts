import { createHash } from 'node:crypto';

import type { BattleActionType, BattleView } from '../../../shared/types/game';
import { getBattleRuneLoadoutForAction, isRuneSkillAction } from '../domain/battle-rune-loadouts';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

export const buildBattleActionIntentStateKey = (battle: BattleView, action: BattleActionType): string => {
  const activeAbility = isRuneSkillAction(action)
    ? getBattleRuneLoadoutForAction(battle, action)?.activeAbility ?? null
    : null;

  return serializeStateKey({
    battleId: battle.id,
    status: battle.status,
    actionRevision: battle.actionRevision,
    turnOwner: battle.turnOwner,
    currentTurnPlayerId: battle.party?.currentTurnPlayerId ?? null,
    actedPlayerIds: battle.party?.actedPlayerIds ?? [],
    action,
    encounter: battle.encounter
      ? {
          status: battle.encounter.status,
          initialTurnOwner: battle.encounter.initialTurnOwner,
          canFlee: battle.encounter.canFlee,
          fleeChancePercent: battle.encounter.fleeChancePercent,
        }
      : null,
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
