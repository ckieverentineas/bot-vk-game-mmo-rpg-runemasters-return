import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { buildPlayerNextGoalView } from '../../../player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../../player/application/read-models/school-recognition';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { getEquippedRune, getEquippedRuneIdsBySlot, getRuneEquippedSlot, getSelectedRune, getUnlockedRuneSlotCount } from '../../../player/domain/player-stats';
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
    targetSlot = 0,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const unlockedSlotCount = getUnlockedRuneSlotCount(player);
    if (!Number.isInteger(targetSlot) || targetSlot < 0 || targetSlot >= unlockedSlotCount) {
      throw new AppError('rune_slot_locked', 'Этот слот рун пока закрыт. Сначала откройте его через мастерство школы.');
    }

    if (targetSlot > 0 && !getEquippedRune(player, 0)) {
      throw new AppError('rune_primary_required', 'Сначала наденьте руну в основной слот, а потом расширяйте сборку поддержкой.');
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    if (targetSlot > 0 && getRuneEquippedSlot(rune) === 0) {
      throw new AppError('rune_primary_required', 'Нельзя увести единственную основную руну в поддержку, пока основной слот не занят другой руной.');
    }

    const currentStateKey = buildEquipIntentStateKey(player, targetSlot);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (intent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<PlayerState>(
        player.playerId,
        intent.intentId,
        ['EQUIP_RUNE'],
        intent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    const previousRune = getEquippedRune(player, targetSlot);
    const recognitionBefore = buildPlayerSchoolRecognitionView(player);
    const nextGoalBefore = buildPlayerNextGoalView(player);
    const updatedPlayer = await this.repository.equipRune(player.playerId, rune.id, {
      commandKey: 'EQUIP_RUNE',
      targetSlot,
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

    const nextRune = getEquippedRune(updatedPlayer, targetSlot);
    if ((previousRune?.id ?? null) !== (nextRune?.id ?? null)) {
      await this.telemetry.loadoutChanged(updatedPlayer.userId, {
        changeType: targetSlot === 0 ? 'equip_primary' : 'equip_support',
        beforeSchoolCode: getSchoolDefinitionForArchetype(previousRune?.archetypeCode)?.code ?? null,
        afterSchoolCode: getSchoolDefinitionForArchetype(nextRune?.archetypeCode)?.code ?? null,
        beforeRarity: previousRune?.rarity ?? null,
        afterRarity: nextRune?.rarity ?? null,
      });
    }

    const recognitionAfter = buildPlayerSchoolRecognitionView(updatedPlayer);
    if (
      targetSlot === 0
      && recognitionBefore
      && !recognitionBefore.signEquipped
      && recognitionAfter?.signEquipped
      && nextGoalBefore.goalType === 'equip_school_sign'
    ) {
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

    return updatedPlayer;
  }
}
