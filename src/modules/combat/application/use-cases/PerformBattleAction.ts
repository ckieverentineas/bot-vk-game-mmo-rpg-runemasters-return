import { AppError } from '../../../../shared/domain/AppError';
import type { BattleActionType, BattleView } from '../../../../shared/types/game';
import { isAlchemyConsumableBattleAction } from '../../../consumables/domain/alchemy-consumables';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { isRuneSkillAction } from '../../domain/battle-rune-loadouts';
import {
  normalizeBattleActionResult,
  persistBattleActionReplay,
  type BattleActionResultView,
} from '../battle-action-result';
import { persistBattleActionOutcome } from '../battle-action-outcome';
import { resolveBattleConsumableAction } from '../battle-consumable-action';
import { resolveEnemyResponseIfNeeded } from '../battle-enemy-response';
import { buildBattleActionIntentStateKey } from '../command-intent-state';
import { finalizeRecoveredBattleIfNeeded } from '../finalize-recovered-battle';
import { resolveIdlePartyAutoAttack } from '../idle-party-auto-attack';
import { prepareBattleForActor } from '../party-battle-actor';
import { resolvePlayerBattleAction } from '../player-battle-action';

export type { BattleActionResultView } from '../battle-action-result';

type BattleActionCommandKey =
  | 'BATTLE_ENGAGE'
  | 'BATTLE_FLEE'
  | 'BATTLE_ATTACK'
  | 'BATTLE_DEFEND'
  | 'BATTLE_RUNE_SKILL'
  | 'BATTLE_USE_CONSUMABLE';

export class PerformBattleAction {
  public constructor(
    private readonly repository: GameRepository,
    private readonly random: GameRandom,
  ) {}

  private resolveCommandKey(action: BattleActionType): BattleActionCommandKey {
    if (isAlchemyConsumableBattleAction(action)) {
      return 'BATTLE_USE_CONSUMABLE';
    }

    if (isRuneSkillAction(action)) {
      return 'BATTLE_RUNE_SKILL';
    }

    switch (action) {
      case 'ENGAGE':
        return 'BATTLE_ENGAGE';
      case 'FLEE':
        return 'BATTLE_FLEE';
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
        return normalizeBattleActionResult(replay.result, true);
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Боевой жест ещё в пути. Дождитесь ответа.');
      }
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleActionResultView | BattleView>(
        player.playerId,
        intentId,
        [commandKey],
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return normalizeBattleActionResult(replay.result, true);
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Боевой жест ещё в пути. Дождитесь ответа.');
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
      throw new AppError('stale_command_intent', 'Этот боевой жест уже выцвел. Вернитесь к свежей развилке боя.');
    }

    const commandOptions = {
      commandKey,
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      currentStateKey,
    } as const;

    const recoveredBattle = await finalizeRecoveredBattleIfNeeded(
      this.repository,
      player,
      activeBattle,
      this.random,
      commandOptions,
    );
    if (recoveredBattle.recovered) {
      const result = {
        battle: recoveredBattle.battle,
        player: recoveredBattle.player,
        acquisitionSummary: recoveredBattle.acquisitionSummary,
      };
      await persistBattleActionReplay(this.repository, player.playerId, intent?.intentId, result);
      return result;
    }

    const autoAttackResult = await resolveIdlePartyAutoAttack(
      this.repository,
      this.random,
      recoveredBattle.battle,
      player,
    );
    if (autoAttackResult) {
      await persistBattleActionReplay(this.repository, player.playerId, intent?.intentId, autoAttackResult);
      return autoAttackResult;
    }

    const actorBattle = prepareBattleForActor(recoveredBattle.battle, player);
    const consumableResult = await resolveBattleConsumableAction({
      repository: this.repository,
      player,
      battle: actorBattle,
      action,
      options: commandOptions,
    });
    if (consumableResult) {
      await persistBattleActionReplay(this.repository, player.playerId, intent?.intentId, consumableResult);
      return consumableResult;
    }

    const playerActionResolution = resolvePlayerBattleAction(actorBattle, action, this.random);
    const battlePersistenceOptions = {
      ...commandOptions,
      actingPlayerId: player.playerId,
      playerSkillGains: playerActionResolution.playerSkillGains,
    } as const;
    const battle = resolveEnemyResponseIfNeeded(playerActionResolution.battle, this.random);
    const result = await persistBattleActionOutcome({
      repository: this.repository,
      random: this.random,
      actingPlayer: player,
      acquisitionBaselinePlayer: player,
      battle,
      options: battlePersistenceOptions,
    });

    await persistBattleActionReplay(this.repository, player.playerId, intent?.intentId, result);
    return result;
  }
}
