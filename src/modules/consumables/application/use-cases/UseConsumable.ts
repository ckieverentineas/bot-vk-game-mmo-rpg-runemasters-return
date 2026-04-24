import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import type { AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import {
  clamp,
  derivePlayerStats,
  derivePlayerVitals,
} from '../../../player/domain/player-stats';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  formatAlchemyConsumableEffect,
  getAlchemyConsumable,
  hasAlchemyConsumable,
  resolveAlchemyConsumableSpend,
  type AlchemyConsumableCode,
  type AlchemyConsumableDefinition,
} from '../../domain/alchemy-consumables';
import { buildUseConsumableIntentStateKey } from '../../../crafting/application/command-intent-state';

export interface UseConsumableResultView {
  readonly player: PlayerState;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
}

const useConsumablePendingMessage = 'Пилюля уже применяется. Дождитесь ответа.';
const useConsumableStaleMessage = 'Эта пилюля уже выцвела. Вернитесь к свежей Мастерской.';

type UseConsumableRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'recordInventoryAndVitalsResult' | 'storeCommandIntentResult'>;

const resolveRecoveredVitals = (
  player: PlayerState,
  consumable: AlchemyConsumableDefinition,
): Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>> => {
  const vitals = derivePlayerVitals(player, derivePlayerStats(player));

  return {
    currentHealth: clamp(vitals.currentHealth + consumable.effect.health, 0, vitals.maxHealth),
    currentMana: clamp(vitals.currentMana + consumable.effect.mana, 0, vitals.maxMana),
  };
};

const resolveAppliedRecoveryLine = (
  before: PlayerState,
  afterVitals: Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>>,
): string => {
  const beforeVitals = derivePlayerVitals(before, derivePlayerStats(before));
  const healthGain = Math.max(0, afterVitals.currentHealth - beforeVitals.currentHealth);
  const manaGain = Math.max(0, afterVitals.currentMana - beforeVitals.currentMana);
  const parts = [
    healthGain > 0 ? `+${healthGain} HP` : null,
    manaGain > 0 ? `+${manaGain} маны` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(' · ') : 'состояние уже было полным';
};

const buildUseSummary = (
  player: PlayerState,
  consumable: AlchemyConsumableDefinition,
  nextVitals: Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>>,
): AcquisitionSummaryView => ({
  kind: 'consumable_used',
  title: `Использована: ${consumable.title}`,
  changeLine: `Восстановлено: ${resolveAppliedRecoveryLine(player, nextVitals)}. Полный эффект состава: ${formatAlchemyConsumableEffect(consumable.effect)}.`,
  nextStepLine: 'Можно вернуться к исследованию или сохранить остальные пилюли для боя.',
});

const replayUseConsumableResult = async (
  repository: CommandIntentReplayRepository,
  player: PlayerState,
  intentId: string | undefined,
  intentStateKey: string | undefined,
): Promise<UseConsumableResultView | null> => {
  return loadCommandIntentReplay<UseConsumableResultView, UseConsumableResultView | PlayerState>({
    repository,
    playerId: player.playerId,
    intentId,
    expectedCommandKeys: ['USE_CONSUMABLE'],
    expectedStateKey: intentStateKey,
    pendingMessage: useConsumablePendingMessage,
    mapResult: (result) => (
      'player' in result ? result : { player: result, acquisitionSummary: null }
    ),
  });
};

export class UseConsumable {
  public constructor(private readonly repository: UseConsumableRepository) {}

  public async execute(
    vkId: number,
    consumableCode: AlchemyConsumableCode,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<UseConsumableResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const consumable = getAlchemyConsumable(consumableCode);
    const currentStateKey = buildUseConsumableIntentStateKey(player, consumable.code);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    const replay = await replayUseConsumableResult(this.repository, player, intent?.intentId, intent?.intentStateKey);
    if (replay) {
      return replay;
    }

    if (!hasAlchemyConsumable(player.inventory, consumable)) {
      throw new AppError('consumable_not_found', `В сумке нет «${consumable.title}». Сначала сварите её в Мастерской.`);
    }

    assertFreshCommandIntent({
      intent,
      intentSource,
      currentStateKey,
      staleMessage: useConsumableStaleMessage,
    });

    const currentVitals = derivePlayerVitals(player, derivePlayerStats(player));
    const nextVitals = resolveRecoveredVitals(player, consumable);
    if (nextVitals.currentHealth === currentVitals.currentHealth && nextVitals.currentMana === currentVitals.currentMana) {
      throw new AppError('consumable_not_needed', `Сейчас «${consumable.title}» ничего не восстановит.`);
    }

    const result = await this.repository.recordInventoryAndVitalsResult(
      player.playerId,
      resolveAlchemyConsumableSpend(consumable),
      nextVitals,
      {
        commandKey: 'USE_CONSUMABLE',
        intentId: intent?.intentId,
        intentStateKey: intent?.intentStateKey,
        currentStateKey: intentSource === 'legacy_text' ? undefined : intent ? currentStateKey : undefined,
      },
      (updatedPlayer) => ({
        player: updatedPlayer,
        acquisitionSummary: buildUseSummary(player, consumable, nextVitals),
      }),
    );

    if (intent?.intentId) {
      await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);
    }

    return result;
  }
}
