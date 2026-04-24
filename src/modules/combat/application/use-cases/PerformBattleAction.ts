import { AppError } from '../../../../shared/domain/AppError';
import type { BattleActionType, BattleView, PlayerState } from '../../../../shared/types/game';
import { buildBattleAcquisitionSummary, type AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import {
  getAlchemyConsumableByBattleAction,
  isAlchemyConsumableBattleAction,
  resolveAlchemyConsumableSpend,
} from '../../../consumables/domain/alchemy-consumables';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository, SaveBattleOptions } from '../../../shared/application/ports/GameRepository';
import { isBattleEncounterOffered } from '../../domain/battle-encounter';
import { BattleEngine } from '../../domain/battle-engine';
import { resolveBattleActionSkillGains } from '../../domain/battle-action-skill-growth';
import { isRuneSkillAction } from '../../domain/battle-rune-loadouts';
import { appendBattleLog } from '../../domain/battle-utils';
import { buildBattleActionIntentStateKey } from '../command-intent-state';

import { finalizeRecoveredBattleIfNeeded } from '../finalize-recovered-battle';
import { RewardEngine } from '../../domain/reward-engine';
import { resolveVictoryRewardOptions } from '../resolve-victory-reward-options';

const isPartyBattle = (battle: BattleView): battle is BattleView & { party: NonNullable<BattleView['party']> } => (
  battle.battleType === 'PARTY_PVE' && battle.party !== undefined && battle.party !== null
);

const partyAutoAttackIdleMs = 30_000;

const hasPartyTurnTimedOut = (battle: BattleView): boolean => {
  const updatedAtTime = Date.parse(battle.updatedAt);

  return Number.isFinite(updatedAtTime) && Date.now() - updatedAtTime > partyAutoAttackIdleMs;
};

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

  private resolveCommandKey(action: BattleActionType): 'BATTLE_ENGAGE' | 'BATTLE_FLEE' | 'BATTLE_ATTACK' | 'BATTLE_DEFEND' | 'BATTLE_RUNE_SKILL' | 'BATTLE_USE_CONSUMABLE' {
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
        return this.normalizeBattleResult(replay.result, true);
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
        return this.normalizeBattleResult(replay.result, true);
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

    const autoAttackResult = await this.resolveTimedOutPartyTurn(recoveredBattle.battle, player);
    if (autoAttackResult) {
      await this.persistReplayResult(player.playerId, intent?.intentId, autoAttackResult);
      return autoAttackResult;
    }

    const actorBattle = this.prepareBattleForActor(recoveredBattle.battle, player);
    const consumable = getAlchemyConsumableByBattleAction(action);
    if (consumable) {
      if ((player.inventory[consumable.inventoryField] ?? 0) <= 0) {
        throw new AppError('consumable_not_found', `В сумке нет «${consumable.title}». Сварите её в Мастерской.`);
      }

      const battleAfterConsumable = BattleEngine.useConsumable(actorBattle, consumable);
      const result = this.wrapBattleResult(await this.repository.saveBattleWithInventoryDelta(
        battleAfterConsumable,
        resolveAlchemyConsumableSpend(consumable),
        {
          ...commandOptions,
          actingPlayerId: player.playerId,
        },
      ));
      await this.persistReplayResult(player.playerId, intent?.intentId, result);
      return result;
    }

    const fleeSucceeded = action === 'FLEE'
      && actorBattle.encounter?.canFlee === true
      && this.random.rollPercentage(actorBattle.encounter.fleeChancePercent);
    const battleAfterPlayerAction = BattleEngine.performPlayerAction(actorBattle, action, { fleeSucceeded });
    const playerSkillGains = resolveBattleActionSkillGains({
      action,
      before: actorBattle,
      afterPlayerAction: battleAfterPlayerAction,
    });
    const battlePersistenceOptions = {
      ...commandOptions,
      actingPlayerId: player.playerId,
      playerSkillGains,
    } as const;
    let battle = battleAfterPlayerAction;

    if (battle.status === 'ACTIVE') {
      battle = BattleEngine.resolveEnemyTurn(battle);
    }

    if (battle.status === 'COMPLETED') {
      const rewarded = battle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(battle, resolveVictoryRewardOptions(player, battle, this.random), this.random)
        : { battle, droppedRune: null };

      const finalized = await this.repository.finalizeBattle(player.playerId, rewarded.battle, battlePersistenceOptions);
      const result = {
        battle: finalized.battle,
        player: finalized.player,
        acquisitionSummary: buildBattleAcquisitionSummary(player, finalized.player, finalized.battle),
      };
      await this.persistReplayResult(player.playerId, intent?.intentId, result);
      return result;
    }

    const result = this.wrapBattleResult(await this.repository.saveBattle(battle, battlePersistenceOptions));
    await this.persistReplayResult(player.playerId, intent?.intentId, result);
    return result;
  }

  private async resolveTimedOutPartyTurn(
    battle: BattleView,
    requester: PlayerState,
  ): Promise<BattleActionResultView | null> {
    if (!this.shouldAutoAttackPartyMember(battle, requester)) {
      return null;
    }

    const currentTurnPlayerId = battle.party.currentTurnPlayerId;
    const currentMember = battle.party.members.find((member) => member.playerId === currentTurnPlayerId);
    if (!currentMember || currentMember.snapshot.currentHealth <= 0) {
      return null;
    }

    const actor = await this.repository.findPlayerById(currentMember.playerId);
    if (!actor) {
      throw new AppError('party_member_not_found', 'Участник отряда уже не найден.');
    }

    const actorBattle = {
      ...battle,
      player: currentMember.snapshot,
      log: appendBattleLog(
        battle.log,
        `⏳ ${currentMember.name} медлит больше 30 секунд: автоатака.`,
      ),
    };
    const battleAfterPlayerAction = BattleEngine.performPlayerAction(actorBattle, 'ATTACK');
    const playerSkillGains = resolveBattleActionSkillGains({
      action: 'ATTACK',
      before: actorBattle,
      afterPlayerAction: battleAfterPlayerAction,
    });
    const battlePersistenceOptions: SaveBattleOptions = {
      commandKey: 'BATTLE_ATTACK',
      actingPlayerId: actor.playerId,
      playerSkillGains,
    };
    let nextBattle = battleAfterPlayerAction;

    if (nextBattle.status === 'ACTIVE') {
      nextBattle = BattleEngine.resolveEnemyTurn(nextBattle);
    }

    if (nextBattle.status === 'COMPLETED') {
      const rewarded = nextBattle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(nextBattle, resolveVictoryRewardOptions(actor, nextBattle, this.random), this.random)
        : { battle: nextBattle, droppedRune: null };
      const finalized = await this.repository.finalizeBattle(actor.playerId, rewarded.battle, battlePersistenceOptions);
      const requesterAfterBattle = actor.playerId === requester.playerId
        ? finalized.player
        : await this.repository.findPlayerById(requester.playerId);

      if (!requesterAfterBattle) {
        throw new AppError('player_not_found', 'Персонаж уже не найден.');
      }

      return {
        battle: finalized.battle,
        player: requesterAfterBattle,
        acquisitionSummary: buildBattleAcquisitionSummary(requester, requesterAfterBattle, finalized.battle),
      };
    }

    return this.wrapBattleResult(await this.repository.saveBattle(nextBattle, battlePersistenceOptions));
  }

  private shouldAutoAttackPartyMember(
    battle: BattleView,
    requester: PlayerState,
  ): battle is BattleView & { party: NonNullable<BattleView['party']> } {
    return isPartyBattle(battle)
      && battle.status === 'ACTIVE'
      && battle.turnOwner === 'PLAYER'
      && battle.party.currentTurnPlayerId !== null
      && battle.party.currentTurnPlayerId !== requester.playerId
      && !isBattleEncounterOffered(battle)
      && hasPartyTurnTimedOut(battle);
  }

  private prepareBattleForActor(battle: BattleView, player: PlayerState): BattleView {
    if (!isPartyBattle(battle)) {
      return battle;
    }

    const currentTurnPlayerId = battle.party.currentTurnPlayerId;
    if (currentTurnPlayerId !== player.playerId) {
      const currentMember = battle.party.members.find((member) => member.playerId === currentTurnPlayerId);
      const currentMemberName = currentMember?.name ?? 'другой мастер';
      throw new AppError('party_member_turn_required', `Сейчас ходит ${currentMemberName}. Дождитесь своего хода.`);
    }

    const partyMember = battle.party.members.find((member) => member.playerId === player.playerId);
    if (!partyMember) {
      throw new AppError('party_member_not_found', 'Вы уже не состоите в этом отряде.');
    }

    return {
      ...battle,
      player: partyMember.snapshot,
    };
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
