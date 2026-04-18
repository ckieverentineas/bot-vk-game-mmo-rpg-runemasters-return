import { createHash } from 'node:crypto';

import type { BattleActionType, BattleView } from '../../../shared/types/game';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

export const buildBattleActionIntentStateKey = (battle: BattleView, action: BattleActionType): string => serializeStateKey({
  battleId: battle.id,
  status: battle.status,
  actionRevision: battle.actionRevision,
  turnOwner: battle.turnOwner,
  action,
  currentMana: battle.player.currentMana,
  activeAbility: battle.player.runeLoadout?.activeAbility
    ? {
        code: battle.player.runeLoadout.activeAbility.code,
        manaCost: battle.player.runeLoadout.activeAbility.manaCost,
        currentCooldown: battle.player.runeLoadout.activeAbility.currentCooldown,
      }
    : null,
});
