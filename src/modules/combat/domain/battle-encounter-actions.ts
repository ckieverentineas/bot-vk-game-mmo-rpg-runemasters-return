import type { BattleView } from '../../../shared/types/game';
import { appendBattleLog } from './battle-utils';
import {
  formatBattleActor,
  messageWhen,
} from './battle-log-lines';
import {
  assertActiveBattle,
  assertBattleEncounterOffered,
} from './battle-state-guards';

export const engageBattleEncounter = (battle: BattleView): BattleView => {
  assertActiveBattle(battle);
  assertBattleEncounterOffered(battle);

  const initialTurnOwner = battle.encounter?.initialTurnOwner ?? 'PLAYER';
  const encounterEffectLine = battle.encounter?.effectLine ?? null;

  battle.encounter = {
    ...battle.encounter!,
    status: 'ENGAGED',
  };
  battle.turnOwner = initialTurnOwner;
  battle.log = appendBattleLog(
    battle.log,
    `⚔️ ${formatBattleActor(battle.player.name)} принимает встречу с ${formatBattleActor(battle.enemy.name)}: бой начинается.`,
    ...messageWhen(
      encounterEffectLine !== null,
      `🧭 Условие встречи: ${encounterEffectLine ?? ''}`,
    ),
  );

  return battle;
};

export const attemptBattleFlee = (
  battle: BattleView,
  fleeSucceeded: boolean,
): BattleView => {
  assertActiveBattle(battle);
  assertBattleEncounterOffered(battle);

  if (fleeSucceeded) {
    battle.encounter = {
      ...battle.encounter!,
      status: 'FLED',
    };
    battle.status = 'COMPLETED';
    battle.result = 'FLED';
    battle.turnOwner = 'PLAYER';
    battle.rewards = null;
    battle.log = appendBattleLog(
      battle.log,
      `💨 ${formatBattleActor(battle.player.name)} отступает от ${formatBattleActor(battle.enemy.name)}: бой не начинается.`,
    );

    return battle;
  }

  battle.encounter = {
    ...battle.encounter!,
    status: 'ENGAGED',
  };
  battle.turnOwner = 'ENEMY';
  battle.log = appendBattleLog(
    battle.log,
    `💨 ${formatBattleActor(battle.player.name)} пытается отступить от ${formatBattleActor(battle.enemy.name)}, но ${formatBattleActor(battle.enemy.name)} перехватывает путь.`,
  );

  return battle;
};
