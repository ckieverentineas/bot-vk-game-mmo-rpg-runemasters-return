import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { InventoryField, PlayerState, RuneRarity } from '../../../../shared/types/game';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import { buildCraftAcquisitionSummary, type AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import { resolveCurrentProgressionLocationLevel } from '../../../player/domain/player-stats';

import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { buildCraftIntentStateKey } from '../command-intent-state';
import { RuneFactory } from '../../domain/rune-factory';
import {
  resolveHighestCraftableRuneRarity,
  resolveHighestShardReadyRuneRarity,
  resolveRuneCraftSpend,
} from '../../domain/rune-economy';

export interface CraftRuneResultView {
  readonly player: PlayerState;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
}

const craftMaterialTitles: Readonly<Partial<Record<InventoryField, string>>> = {
  essence: 'эссенция',
  crystal: 'кристалл',
  metal: 'металл',
};
const craftRunePendingMessage = 'Алтарный жест ещё в пути. Дождитесь ответа.';
const craftRuneStaleMessage = 'Этот алтарный жест уже выцвел. Вернитесь к свежей развилке.';

const formatCraftRequirementLine = (rarity: RuneRarity): string => {
  const spend = resolveRuneCraftSpend(rarity);
  const materialCosts = Object.entries(spend.inventoryDelta)
    .filter(([field, amount]) => amount !== undefined && amount < 0 && !field.endsWith('Shards'))
    .map(([field, amount]) => `${craftMaterialTitles[field as InventoryField] ?? field}: ${Math.abs(amount ?? 0)}`);

  return [
    `${gameBalance.runes.craftCost} осколков этой редкости`,
    `${spend.gold} пыли`,
    ...materialCosts,
  ].join(', ');
};

type CraftRuneRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'craftRune' | 'storeCommandIntentResult'>;

export class CraftRune {
  public constructor(
    private readonly repository: CraftRuneRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<CraftRuneResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const currentStateKey = buildCraftIntentStateKey(player);
    const progressionLocationLevel = resolveCurrentProgressionLocationLevel(player);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);

    const replay = await loadCommandIntentReplay<CraftRuneResultView, CraftRuneResultView | PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intent?.intentId,
      expectedCommandKeys: ['CRAFT_RUNE'],
      expectedStateKey: intent?.intentStateKey,
      pendingMessage: craftRunePendingMessage,
      mapResult: (result) => (
        'player' in result ? result : { player: result, acquisitionSummary: null }
      ),
    });
    if (replay) {
      return replay;
    }

    const shardReadyRarity = resolveHighestShardReadyRuneRarity(player);
    if (!shardReadyRarity) {
      throw new AppError('not_enough_shards', 'Недостаточно осколков для создания руны. Нужно минимум 10 осколков одной редкости.');
    }

    const rarity = resolveHighestCraftableRuneRarity(player);
    if (!rarity) {
      throw new AppError(
        'not_enough_rune_resources',
        `Для создания руны нужно: ${formatCraftRequirementLine(shardReadyRarity)}.`,
      );
    }

    assertFreshCommandIntent({
      intent,
      intentSource,
      currentStateKey,
      staleMessage: craftRuneStaleMessage,
    });

    const craftedPlayer = await this.repository.craftRune(
      player.playerId,
      rarity,
      RuneFactory.create(progressionLocationLevel, rarity, undefined, this.random),
      intent?.intentId,
      intent?.intentStateKey,
      intentSource === 'legacy_text' ? undefined : intent ? currentStateKey : undefined,
    );

    const result = {
      player: craftedPlayer,
      acquisitionSummary: buildCraftAcquisitionSummary(player, craftedPlayer),
    };

    if (intent?.intentId) {
      await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);
    }

    return result;
  }
}
