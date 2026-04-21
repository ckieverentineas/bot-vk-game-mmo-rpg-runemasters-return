import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../../../shared/types/game';
import { finalizeRecoveredBattleIfNeeded } from '../../../combat/application/finalize-recovered-battle';
import { BattleEngine } from '../../../combat/domain/battle-engine';
import { buildBattlePlayerSnapshot } from '../../../combat/domain/build-battle-player-snapshot';
import { buildPlayerNextGoalView } from '../../../player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../../player/application/read-models/school-recognition';
import {
  getSchoolNovicePathDefinition,
  getSchoolNovicePathDefinitionForEnemy,
  hasEquippedRuneOfSchoolAtLeastRarity,
  hasRuneOfSchoolAtLeastRarity,
} from '../../../player/domain/school-novice-path';
import { derivePlayerStats, getEquippedRune, resolveEncounterLocationLevel } from '../../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../../../world/application/ports/WorldCatalog';
import { buildEnemySnapshot, describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from '../../../world/domain/enemy-scaling';
import { resolveGameMasterEncounterLine } from '../../../world/domain/game-master-director';
import { Logger } from '../../../../utils/logger';

import { buildExploreLocationIntentStateKey } from '../command-intent-state';

export interface ExploreLocationReplayResult {
  readonly battle: BattleView;
  readonly replayed: true;
}

export class ExploreLocation {
  public constructor(
    private readonly repository: GameRepository,
    private readonly worldCatalog: WorldCatalog,
    private readonly random: GameRandom,
    private readonly telemetry?: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<BattleView | ExploreLocationReplayResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const commandKey = 'EXPLORE_LOCATION' as const;
    const scopedIntent = intentSource === 'legacy_text'
      ? null
      : resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (scopedIntent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleView>(
        player.playerId,
        scopedIntent.intentId,
        [commandKey],
        scopedIntent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return { battle: replay.result, replayed: true };
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleView>(
        player.playerId,
        intentId,
        [commandKey],
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return { battle: replay.result, replayed: true };
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const intent = intentSource === 'legacy_text'
      ? resolveCommandIntent(intentId, undefined, intentSource, false)
      : scopedIntent;
    const recoveryCommandOptions = intent
      ? {
          commandKey,
          intentId: intent.intentId,
          intentStateKey: intent.intentStateKey,
          currentStateKey: intent.intentStateKey,
        } as const
      : undefined;

    const activeBattle = await this.repository.getActiveBattle(player.playerId);

    if (activeBattle) {
      const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player, activeBattle, this.random, recoveryCommandOptions);
      return recoveredBattle.recovered ? recoveredBattle.battle : activeBattle;
    }

    const currentStateKey = buildExploreLocationIntentStateKey(player);
    const scopedCreateIntent = intentSource === 'legacy_text'
      ? { intentId: resolveCommandIntent(intentId, undefined, intentSource, false)?.intentId as string, intentStateKey: currentStateKey }
      : scopedIntent;

    if (intentSource !== 'legacy_text' && scopedCreateIntent && scopedCreateIntent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Я вернул актуальный контекст приключения.');
    }

    const commandOptions = {
      commandKey,
      intentId: scopedCreateIntent?.intentId,
      intentStateKey: scopedCreateIntent?.intentStateKey,
      currentStateKey,
    } as const;

    const currentPlayer = player;

    const locationLevel = resolveEncounterLocationLevel(currentPlayer);
    const currentSchoolCode = getSchoolDefinitionForArchetype(getEquippedRune(currentPlayer)?.archetypeCode)?.code ?? null;
    const biome = this.worldCatalog.findBiomeForLocationLevel(locationLevel);
    if (!biome) {
      throw new AppError('biome_not_found', 'Для текущего уровня локации не найден биом.');
    }

    const templates = this.worldCatalog.listMobTemplatesForBiome(biome.code);
    const novicePath = getSchoolNovicePathDefinition(currentSchoolCode);
    const preferMiniboss = !!(
      novicePath
      && novicePath.minibossRewardRarity
      && hasEquippedRuneOfSchoolAtLeastRarity(currentPlayer, novicePath.schoolCode, novicePath.rewardRarity)
      && !hasRuneOfSchoolAtLeastRarity(currentPlayer, novicePath.schoolCode, novicePath.minibossRewardRarity)
    );
    const template = pickEncounterTemplate(templates, locationLevel, {
      schoolCode: currentSchoolCode,
      preferMiniboss,
    }, this.random);
    const playerStats = derivePlayerStats(currentPlayer);
    const enemy = buildEnemySnapshot(template, locationLevel);
    const turnOwner = resolveInitialTurnOwner(playerStats.dexterity, enemy.dexterity);
    const encounterLine = describeEncounter(biome, enemy, currentSchoolCode);
    const gameMasterLine = resolveGameMasterEncounterLine({
      biome,
      enemy,
      currentSchoolCode,
      locationLevel,
    });
    const battle = await this.repository.createBattle(currentPlayer.playerId, {
      status: 'ACTIVE',
      battleType: 'PVE',
      actionRevision: 0,
      locationLevel,
      biomeCode: biome.code,
      enemyCode: template.code,
      turnOwner,
      player: buildBattlePlayerSnapshot(currentPlayer.playerId, vkId, playerStats, currentPlayer),
      enemy,
      log: gameMasterLine ? [`${encounterLine} ${gameMasterLine}`] : [encounterLine],
      result: null,
      rewards: null,
    }, turnOwner === 'PLAYER' ? commandOptions : undefined);

    await this.trackTutorialPathChosen(currentPlayer, battle);
    await this.trackSchoolNoviceEliteEncounterStarted(currentPlayer, battle, currentSchoolCode);
    await this.trackSchoolNoviceFollowUpBattleStart(currentPlayer, battle);

    if (battle.turnOwner === 'ENEMY') {
      const resolved = BattleEngine.resolveEnemyTurn(battle);
      if (resolved.status === 'COMPLETED') {
        const finalized = await this.repository.finalizeBattle(currentPlayer.playerId, resolved, commandOptions);
        return finalized.battle;
      }

      return this.repository.saveBattle(resolved, commandOptions);
    }

    return battle;
  }

  private async trackTutorialPathChosen(player: PlayerState, battle: BattleView): Promise<void> {
    if (!this.telemetry || player.tutorialState !== 'ACTIVE' || battle.locationLevel !== 0) {
      return;
    }

    try {
      await this.telemetry.tutorialPathChosen(player.userId, {
        entrySurface: 'location',
        choice: 'continue_tutorial',
        tutorialState: player.tutorialState,
      });
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }

  private async trackSchoolNoviceEliteEncounterStarted(
    player: PlayerState,
    battle: BattleView,
    currentSchoolCode: string | null,
  ): Promise<void> {
    const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
    const nextGoal = buildPlayerNextGoalView(player);

    if (
      !this.telemetry
      || !novicePath
      || !battle.enemy.isElite
      || currentSchoolCode !== novicePath.schoolCode
      || hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity)
      || nextGoal.goalType !== 'hunt_school_elite'
    ) {
      return;
    }

    try {
      await this.telemetry.schoolNoviceEliteEncounterStarted(player.userId, {
        battleId: battle.id,
        schoolCode: novicePath.schoolCode,
        enemyCode: battle.enemy.code,
        biomeCode: battle.biomeCode,
        locationLevel: battle.locationLevel,
        targetRewardRarity: novicePath.rewardRarity,
        nextGoalType: 'hunt_school_elite',
      });
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }

  private async trackSchoolNoviceFollowUpBattleStart(player: PlayerState, battle: BattleView): Promise<void> {
    const recognition = buildPlayerSchoolRecognitionView(player);
    const nextGoal = buildPlayerNextGoalView(player);

    if (
      !this.telemetry
      || !recognition
      || !recognition.signEquipped
      || nextGoal.goalType === 'equip_school_sign'
    ) {
      return;
    }

    try {
      await this.telemetry.schoolNoviceFollowUpActionTaken(player.userId, {
        schoolCode: recognition.schoolCode,
        currentGoalType: nextGoal.goalType,
        actionType: 'start_next_battle',
        signEquipped: true,
        usedSchoolSign: true,
        battleId: battle.id,
        enemyCode: battle.enemy.code,
      });
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }
}
