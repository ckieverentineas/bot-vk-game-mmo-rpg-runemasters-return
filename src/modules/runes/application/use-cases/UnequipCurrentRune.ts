import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { getEquippedRune, getEquippedRuneIdsBySlot, getRuneEquippedSlot, getSelectedRune, getUnlockedRuneSlotCount } from '../../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildUnequipIntentStateKey } from '../command-intent-state';

export class UnequipCurrentRune {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string, intentSource: CommandIntentSource = 'payload'): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Рунный жест ещё в пути. Дождитесь ответа.');
      }
    }

    const targetSlot = getSelectedRune(player) ? getRuneEquippedSlot(getSelectedRune(player)!) ?? 0 : 0;
    const currentStateKey = buildUnequipIntentStateKey(player, targetSlot);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Этот рунный жест уже выцвел. Вернитесь к свежей руне.');
    }

    const previousRune = getEquippedRune(player, targetSlot);
    const updatedPlayer = await this.repository.equipRune(player.playerId, null, {
      commandKey: 'UNEQUIP_RUNE',
      targetSlot,
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedPlayerUpdatedAt: player.updatedAt,
      expectedCurrentRuneIndex: player.currentRuneIndex,
      expectedUnlockedRuneSlotCount: getUnlockedRuneSlotCount(player),
      expectedSelectedRuneId: getSelectedRune(player)?.id ?? null,
      expectedEquippedRuneId: getEquippedRune(player, targetSlot)?.id ?? null,
      expectedEquippedRuneIdsBySlot: getEquippedRuneIdsBySlot(player),
      expectedRuneIds: player.runes.map((entry) => entry.id),
    });

    const nextRune = getEquippedRune(updatedPlayer, targetSlot);
    if ((previousRune?.id ?? null) !== (nextRune?.id ?? null)) {
      await this.telemetry.loadoutChanged(updatedPlayer.userId, {
        changeType: 'unequip_rune',
        slotNumber: targetSlot + 1,
        beforeSchoolCode: getSchoolDefinitionForArchetype(previousRune?.archetypeCode)?.code ?? null,
        afterSchoolCode: getSchoolDefinitionForArchetype(nextRune?.archetypeCode)?.code ?? null,
        beforeRarity: previousRune?.rarity ?? null,
        afterRarity: nextRune?.rarity ?? null,
      });
    }

    return updatedPlayer;
  }
}
