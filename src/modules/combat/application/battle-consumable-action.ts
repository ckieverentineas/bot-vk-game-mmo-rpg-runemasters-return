import { AppError } from '../../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../../shared/types/game';
import {
  getAlchemyConsumableByBattleAction,
  resolveAlchemyConsumableSpend,
} from '../../consumables/domain/alchemy-consumables';
import type { GameRepository, SaveBattleOptions } from '../../shared/application/ports/GameRepository';
import { BattleEngine } from '../domain/battle-engine';
import { wrapBattleActionResult, type BattleActionResultView } from './battle-action-result';

type BattleConsumableRepository = Pick<GameRepository, 'saveBattleWithInventoryDelta'>;

interface BattleConsumableActionContext {
  readonly repository: BattleConsumableRepository;
  readonly player: PlayerState;
  readonly battle: BattleView;
  readonly action: BattleActionType;
  readonly options: SaveBattleOptions;
}

export const resolveBattleConsumableAction = async ({
  repository,
  player,
  battle,
  action,
  options,
}: BattleConsumableActionContext): Promise<BattleActionResultView | null> => {
  const consumable = getAlchemyConsumableByBattleAction(action);
  if (!consumable) {
    return null;
  }

  if ((player.inventory[consumable.inventoryField] ?? 0) <= 0) {
    throw new AppError('consumable_not_found', `В сумке нет «${consumable.title}». Сварите её в Мастерской.`);
  }

  const battleAfterConsumable = BattleEngine.useConsumable(battle, consumable);
  const savedBattle = await repository.saveBattleWithInventoryDelta(
    battleAfterConsumable,
    resolveAlchemyConsumableSpend(consumable),
    {
      ...options,
      actingPlayerId: player.playerId,
    },
  );

  return wrapBattleActionResult(savedBattle);
};
