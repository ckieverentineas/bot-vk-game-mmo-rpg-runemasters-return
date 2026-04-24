import type { PlayerState } from '../../../../shared/types/game';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { getEquippedRune, getEquippedRuneIdsBySlot, getRuneEquippedSlot, getSelectedRune, getUnlockedRuneSlotCount } from '../../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';

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
import { buildUnequipIntentStateKey } from '../command-intent-state';

const runeLoadoutPendingMessage = 'Рунный жест ещё в пути. Дождитесь ответа.';
const runeLoadoutStaleMessage = 'Этот рунный жест уже выцвел. Вернитесь к свежей руне.';

type UnequipCurrentRuneRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'equipRune'>;

export class UnequipCurrentRune {
  public constructor(
    private readonly repository: UnequipCurrentRuneRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string, intentSource: CommandIntentSource = 'payload'): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const legacyReplay = await loadCommandIntentReplay<PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intentSource === 'legacy_text' ? intentId : undefined,
      pendingMessage: runeLoadoutPendingMessage,
    });
    if (legacyReplay) {
      return legacyReplay;
    }

    const targetSlot = getSelectedRune(player) ? getRuneEquippedSlot(getSelectedRune(player)!) ?? 0 : 0;
    const currentStateKey = buildUnequipIntentStateKey(player, targetSlot);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    assertFreshCommandIntent({
      intent,
      intentSource,
      currentStateKey,
      staleMessage: runeLoadoutStaleMessage,
    });

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
