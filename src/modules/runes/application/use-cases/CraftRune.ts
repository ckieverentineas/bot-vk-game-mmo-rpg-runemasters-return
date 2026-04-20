import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, RuneRarity } from '../../../../shared/types/game';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import { buildCraftAcquisitionSummary, type AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import { resolveCurrentProgressionLocationLevel } from '../../../player/domain/player-stats';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildCraftIntentStateKey } from '../command-intent-state';
import { RuneFactory } from '../../domain/rune-factory';

const rarityPriority: RuneRarity[] = ['MYTHICAL', 'LEGENDARY', 'EPIC', 'RARE', 'UNUSUAL', 'USUAL'];

export interface CraftRuneResultView {
  readonly player: PlayerState;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
}

export class CraftRune {
  public constructor(
    private readonly repository: GameRepository,
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

    if (intent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<CraftRuneResultView | PlayerState>(
        player.playerId,
        intent.intentId,
        ['CRAFT_RUNE'],
        intent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return 'player' in replay.result ? replay.result : { player: replay.result, acquisitionSummary: null };
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const rarity = rarityPriority.find((candidate) => {
      const shardField = gameBalance.runes.profiles[candidate].shardField;
      return player.inventory[shardField] >= gameBalance.runes.craftCost;
    });

    if (!rarity) {
      throw new AppError('not_enough_shards', 'Недостаточно осколков для создания руны. Нужно минимум 10 осколков одной редкости.');
    }

    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

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
