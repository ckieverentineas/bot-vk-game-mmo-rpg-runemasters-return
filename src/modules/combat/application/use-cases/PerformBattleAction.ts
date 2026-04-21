import { AppError } from '../../../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../../../shared/types/game';
import { buildBattleAcquisitionSummary, type AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { BattleEngine } from '../../domain/battle-engine';
import { isRuneSkillAction } from '../../domain/battle-rune-loadouts';
import { buildBattleActionIntentStateKey } from '../command-intent-state';

import { finalizeRecoveredBattleIfNeeded } from '../finalize-recovered-battle';
import { RewardEngine } from '../../domain/reward-engine';
import { resolveVictoryRewardOptions } from '../resolve-victory-reward-options';

export interface BattleActionResultView {
  readonly battle: BattleView;
  readonly player: PlayerState | null;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
  readonly replayed?: true;
}

export class PerformBattleAction {
  public constructor(
    private readonly repository: GameRepository,
    private readonly random: GameRandom,
  ) {}

  private resolveCommandKey(action: BattleActionType): 'BATTLE_ATTACK' | 'BATTLE_DEFEND' | 'BATTLE_RUNE_SKILL' {
    if (isRuneSkillAction(action)) {
      return 'BATTLE_RUNE_SKILL';
    }

    switch (action) {
      case 'DEFEND':
        return 'BATTLE_DEFEND';
      case 'ATTACK':
      default:
        return 'BATTLE_ATTACK';
    }
  }

  public async execute(
    vkId: number,
    action: BattleActionType = 'ATTACK',
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<BattleActionResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const commandKey = this.resolveCommandKey(action);
    const scopedIntent = intentSource === 'legacy_text'
      ? null
      : resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (scopedIntent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleActionResultView | BattleView>(
        player.playerId,
        scopedIntent.intentId,
        [commandKey],
        scopedIntent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return this.normalizeBattleResult(replay.result, true);
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleActionResultView | BattleView>(
        player.playerId,
        intentId,
        [commandKey],
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return this.normalizeBattleResult(replay.result, true);
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const activeBattle = await this.repository.getActiveBattle(player.playerId);
    if (!activeBattle) {
      throw new AppError('battle_not_found', 'Сейчас у вас нет активного боя.');
    }

    const currentStateKey = buildBattleActionIntentStateKey(activeBattle, action);
    const intent = intentSource === 'legacy_text'
      ? { intentId: resolveCommandIntent(intentId, undefined, intentSource, false)?.intentId as string, intentStateKey: currentStateKey }
      : scopedIntent;

    if (intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    const commandOptions = {
      commandKey,
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      currentStateKey,
    } as const;

    const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player, activeBattle, this.random, commandOptions);
    if (recoveredBattle.recovered) {
      const result = {
        battle: recoveredBattle.battle,
        player: recoveredBattle.player,
        acquisitionSummary: recoveredBattle.acquisitionSummary,
      };
      await this.persistReplayResult(player.playerId, intent?.intentId, result);
      return result;
    }

    let battle = BattleEngine.performPlayerAction(recoveredBattle.battle, action);

    if (battle.status === 'ACTIVE') {
      battle = BattleEngine.resolveEnemyTurn(battle);
    }

    if (battle.status === 'COMPLETED') {
      const rewarded = battle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(battle, resolveVictoryRewardOptions(player, battle, this.random), this.random)
        : { battle, droppedRune: null };

      const finalized = await this.repository.finalizeBattle(player.playerId, rewarded.battle, commandOptions);
      const result = {
        battle: finalized.battle,
        player: finalized.player,
        acquisitionSummary: buildBattleAcquisitionSummary(player, finalized.player, finalized.battle),
      };
      await this.persistReplayResult(player.playerId, intent?.intentId, result);
      return result;
    }

    const result = this.wrapBattleResult(await this.repository.saveBattle(battle, commandOptions));
    await this.persistReplayResult(player.playerId, intent?.intentId, result);
    return result;
  }

  private wrapBattleResult(battle: BattleView, replayed = false): BattleActionResultView {
    return {
      battle,
      player: null,
      acquisitionSummary: null,
      ...(replayed ? { replayed: true as const } : {}),
    };
  }

  private normalizeBattleResult(result: BattleActionResultView | BattleView, replayed = false): BattleActionResultView {
    if ('battle' in result) {
      return replayed ? { ...result, replayed: true } : result;
    }

    return this.wrapBattleResult(result, replayed);
  }

  private async persistReplayResult(playerId: number, intentId: string | undefined, result: BattleActionResultView): Promise<void> {
    if (!intentId) {
      return;
    }

    await this.repository.storeCommandIntentResult(playerId, intentId, result);
  }
}
