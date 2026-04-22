import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { Logger } from '../../../../utils/logger';
import {
  buildEquipAcquisitionSummary,
  type AcquisitionSummaryView,
} from '../../../player/application/read-models/acquisition-summary';
import { buildPlayerNextGoalView } from '../../../player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../../player/application/read-models/school-recognition';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import {
  getEquippedRune,
  getEquippedRuneIdsBySlot,
  getSelectedRune,
  getUnlockedRuneSlotCount,
  resolveAutoEquipRuneSlot,
} from '../../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEquipIntentStateKey } from '../command-intent-state';

export class EquipCurrentRune {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    targetSlot: number | null = null,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<PlayerState | EquipRuneResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<PlayerState | EquipRuneResultView>(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return 'player' in replay.result
          ? { ...replay.result, replayed: true }
          : {
            player: replay.result,
            acquisitionSummary: null,
            replayed: true,
          };
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Рунный жест ещё в пути. Дождитесь ответа.');
      }
    }

    const unlockedSlotCount = getUnlockedRuneSlotCount(player);
    const resolvedTargetSlot = targetSlot ?? resolveAutoEquipRuneSlot(player);
    if (!Number.isInteger(resolvedTargetSlot) || resolvedTargetSlot < 0 || resolvedTargetSlot >= unlockedSlotCount) {
      throw new AppError('rune_slot_locked', 'Этот слот рун пока закрыт. Откройте новый слот через развитие мастера.');
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    const currentStateKey = buildEquipIntentStateKey(player, resolvedTargetSlot);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (intent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<PlayerState | EquipRuneResultView>(
        player.playerId,
        intent.intentId,
        ['EQUIP_RUNE'],
        intent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return 'player' in replay.result
          ? { ...replay.result, replayed: true }
          : {
            player: replay.result,
            acquisitionSummary: null,
            replayed: true,
          };
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Рунный жест ещё в пути. Дождитесь ответа.');
      }
    }

    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Этот рунный жест уже выцвел. Вернитесь к свежей руне.');
    }

    const previousRune = getEquippedRune(player, resolvedTargetSlot);
    const recognitionBefore = buildPlayerSchoolRecognitionView(player);
    const nextGoalBefore = buildPlayerNextGoalView(player);
    const updatedPlayer = await this.repository.equipRune(player.playerId, rune.id, {
      commandKey: 'EQUIP_RUNE',
      targetSlot: resolvedTargetSlot,
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedPlayerUpdatedAt: player.updatedAt,
      expectedCurrentRuneIndex: player.currentRuneIndex,
      expectedUnlockedRuneSlotCount: unlockedSlotCount,
      expectedSelectedRuneId: rune.id,
      expectedEquippedRuneId: getEquippedRune(player)?.id ?? null,
      expectedEquippedRuneIdsBySlot: getEquippedRuneIdsBySlot(player),
      expectedRuneIds: player.runes.map((entry) => entry.id),
    });

    const nextRune = getEquippedRune(updatedPlayer, resolvedTargetSlot);
    const recognitionAfter = buildPlayerSchoolRecognitionView(updatedPlayer);

    try {
      if ((previousRune?.id ?? null) !== (nextRune?.id ?? null)) {
        await this.telemetry.loadoutChanged(updatedPlayer.userId, {
          changeType: 'equip_rune',
          slotNumber: resolvedTargetSlot + 1,
          beforeSchoolCode: getSchoolDefinitionForArchetype(previousRune?.archetypeCode)?.code ?? null,
          afterSchoolCode: getSchoolDefinitionForArchetype(nextRune?.archetypeCode)?.code ?? null,
          beforeRarity: previousRune?.rarity ?? null,
          afterRarity: nextRune?.rarity ?? null,
        });
      }

      if (
        resolvedTargetSlot === 0
        && recognitionBefore?.signEquipped !== true
        && recognitionAfter?.signEquipped
        && ['equip_first_rune', 'equip_school_sign'].includes(nextGoalBefore.goalType)
      ) {
        await this.telemetry.firstSchoolCommitted(updatedPlayer.userId, {
          schoolCode: recognitionAfter.schoolCode,
          runeId: nextRune?.id ?? rune.id,
          runeRarity: nextRune?.rarity ?? rune.rarity,
          commitSource: 'equip_current_rune',
        });

        await this.telemetry.schoolNoviceFollowUpActionTaken(updatedPlayer.userId, {
          schoolCode: recognitionAfter.schoolCode,
          currentGoalType: nextGoalBefore.goalType,
          actionType: 'equip_school_sign',
          signEquipped: recognitionAfter.signEquipped,
          usedSchoolSign: true,
          battleId: null,
          enemyCode: null,
        });
      }
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }

    const acquisitionSummary = buildEquipAcquisitionSummary(player, updatedPlayer, resolvedTargetSlot, nextGoalBefore.goalType);
    return acquisitionSummary
      ? { player: updatedPlayer, acquisitionSummary }
      : updatedPlayer;
  }
}

export interface EquipRuneResultView {
  readonly player: PlayerState;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
  readonly replayed?: true;
}
