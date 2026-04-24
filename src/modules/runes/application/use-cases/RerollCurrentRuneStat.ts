import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, StatKey } from '../../../../shared/types/game';
import { getSelectedRune, resolveCurrentProgressionLocationLevel } from '../../../player/domain/player-stats';
import type { GameRandom } from '../../../../shared/domain/GameRandom';

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
import { buildRerollIntentStateKey } from '../command-intent-state';
import { RuneFactory } from '../../domain/rune-factory';
import { canPayRuneSpend, resolveRuneRerollSpend } from '../../domain/rune-economy';

const runeMutationPendingMessage = 'Рунный жест ещё в пути. Дождитесь ответа.';
const runeMutationStaleMessage = 'Этот рунный жест уже выцвел. Вернитесь к свежей руне.';

type RerollCurrentRuneStatRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'rerollRuneStat'>;

export class RerollCurrentRuneStat {
  public constructor(
    private readonly repository: RerollCurrentRuneStatRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number, stat: StatKey, intentId?: string, intentStateKey?: string, intentSource: CommandIntentSource = 'payload'): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const legacyReplay = await loadCommandIntentReplay<PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intentSource === 'legacy_text' ? intentId : undefined,
      pendingMessage: runeMutationPendingMessage,
    });
    if (legacyReplay) {
      return legacyReplay;
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    if (player.inventory[shardField] < gameBalance.runes.rerollShardCost) {
      throw new AppError('not_enough_shards', 'Для изменения стата нужен хотя бы один осколок той же редкости.');
    }

    const spend = resolveRuneRerollSpend(rune.rarity);
    if (!canPayRuneSpend(player, spend)) {
      throw new AppError(
        'not_enough_rune_resources',
        `Для перековки нужно ${spend.gold} пыли и ${gameBalance.runes.rerollShardCost} осколок той же редкости.`,
      );
    }

    const currentStateKey = buildRerollIntentStateKey(player, stat, rune);
    const progressionLocationLevel = resolveCurrentProgressionLocationLevel(player);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    assertFreshCommandIntent({
      intent,
      intentSource,
      currentStateKey,
      staleMessage: runeMutationStaleMessage,
    });

    const nextRune = RuneFactory.rerollStat(rune, stat, progressionLocationLevel, this.random);
    return this.repository.rerollRuneStat(player.playerId, rune.id, rune.rarity, {
      health: nextRune.health,
      attack: nextRune.attack,
      defence: nextRune.defence,
      magicDefence: nextRune.magicDefence,
      dexterity: nextRune.dexterity,
      intelligence: nextRune.intelligence,
    }, intent?.intentId, intent?.intentStateKey, intentSource === 'legacy_text' ? undefined : intent ? currentStateKey : undefined);
  }
}
