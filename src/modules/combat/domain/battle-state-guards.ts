import { AppError } from '../../../shared/domain/AppError';
import type { BattleView } from '../../../shared/types/game';
import { isBattleEncounterOffered } from './battle-encounter';

export const assertActiveBattle = (battle: BattleView): void => {
  if (battle.status !== 'ACTIVE') {
    throw new AppError('battle_completed', 'Бой уже завершен.');
  }
};

export const assertBattleEncounterOffered = (battle: BattleView): void => {
  if (!isBattleEncounterOffered(battle)) {
    throw new AppError('battle_encounter_already_resolved', 'Встреча уже перешла в бой.');
  }
};

export const assertPlayerBattleTurn = (battle: BattleView): void => {
  assertActiveBattle(battle);

  if (isBattleEncounterOffered(battle)) {
    throw new AppError('battle_encounter_pending', 'Сначала выберите: вступить в бой или попробовать отступить.');
  }

  if (battle.turnOwner !== 'PLAYER') {
    throw new AppError('enemy_turn', 'Сейчас ход противника.');
  }
};
