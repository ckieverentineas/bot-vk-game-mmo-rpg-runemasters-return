import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView, BiomeView, MobTemplateView, PlayerState } from '../../../../shared/types/game';
import { finalizeRecoveredBattleIfNeeded } from '../../../combat/application/finalize-recovered-battle';
import { BattleEngine } from '../../../combat/domain/battle-engine';
import { createBattleEncounter, isBattleEncounterOffered } from '../../../combat/domain/battle-encounter';
import { buildBattlePlayerSnapshot } from '../../../combat/domain/build-battle-player-snapshot';
import { buildPlayerNextGoalView } from '../../../player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../../player/application/read-models/school-recognition';
import {
  getSchoolNovicePathDefinitionForEnemy,
  hasRuneOfSchoolAtLeastRarity,
} from '../../../player/domain/school-novice-path';
import { resolveEncounterLocationLevel } from '../../../player/domain/player-stats';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../../../world/application/ports/WorldCatalog';
import {
  getExplorationSceneInventoryDelta,
  type ExplorationSceneView,
} from '../../../world/domain/exploration-events';
import {
  type ExplorationBattleOutcome,
  type ExplorationRoamingTemplatePool,
  resolveExplorationOutcome,
  resolveExplorationSchoolCode,
} from '../../domain/exploration-outcome';
import { Logger } from '../../../../utils/logger';

import { buildExploreLocationIntentStateKey } from '../command-intent-state';

export interface ExploreLocationReplayResult {
  readonly battle: BattleView;
  readonly replayed: true;
}

export interface ExploreLocationEventResult {
  readonly event: ExplorationSceneView;
  readonly player: PlayerState;
  readonly replayed?: true;
}

export type ExploreLocationResult = BattleView | ExploreLocationReplayResult | ExploreLocationEventResult;

interface ExploreLocationCommandOptions {
  readonly commandKey: 'EXPLORE_LOCATION';
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export const isExploreLocationEventResult = (result: unknown): result is ExploreLocationEventResult => (
  typeof result === 'object' && result !== null && 'event' in result
);

const markExploreLocationReplay = (result: ExploreLocationResult): ExploreLocationReplayResult | ExploreLocationEventResult => {
  if (isExploreLocationEventResult(result)) {
    return { ...result, replayed: true };
  }

  if ('battle' in result) {
    return { battle: result.battle, replayed: true };
  }

  return { battle: result, replayed: true };
};

const lowerBiomeRoamingChancePercent = 12;
const higherBiomeRoamingChancePercent = 3;

const sortBiomesByLevel = (biomes: readonly BiomeView[]): BiomeView[] => (
  [...biomes].sort((left, right) => (
    left.minLevel - right.minLevel
    || left.maxLevel - right.maxLevel
    || left.code.localeCompare(right.code)
  ))
);

const listRoamingMobTemplates = (
  worldCatalog: WorldCatalog,
  biome: BiomeView | undefined,
): readonly MobTemplateView[] => (
  biome
    ? worldCatalog.listMobTemplatesForBiome(biome.code).filter((template) => !template.isBoss)
    : []
);

const buildRoamingTemplatePools = (
  worldCatalog: WorldCatalog,
  currentBiome: BiomeView,
): readonly ExplorationRoamingTemplatePool[] => {
  const biomes = sortBiomesByLevel(worldCatalog.listBiomes());
  const currentIndex = biomes.findIndex((biome) => biome.code === currentBiome.code);
  if (currentIndex < 0) {
    return [];
  }

  const lowerBiome = biomes
    .slice(0, currentIndex)
    .reverse()
    .find((biome) => biome.minLevel > 0);
  const higherBiome = biomes[currentIndex + 1];

  return [
    {
      biome: lowerBiome,
      templates: listRoamingMobTemplates(worldCatalog, lowerBiome),
      chancePercent: lowerBiomeRoamingChancePercent,
      direction: 'LOWER_BIOME',
    },
    {
      biome: higherBiome,
      templates: listRoamingMobTemplates(worldCatalog, higherBiome),
      chancePercent: higherBiomeRoamingChancePercent,
      direction: 'HIGHER_BIOME',
    },
  ].filter((pool): pool is ExplorationRoamingTemplatePool => (
    pool.biome !== undefined && pool.templates.length > 0
  ));
};

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
  ): Promise<ExploreLocationResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const commandKey = 'EXPLORE_LOCATION' as const;
    const scopedIntent = intentSource === 'legacy_text'
      ? null
      : resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (scopedIntent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<ExploreLocationResult>(
        player.playerId,
        scopedIntent.intentId,
        [commandKey],
        scopedIntent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return markExploreLocationReplay(replay.result);
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Прошлый жест ещё в пути. Дождитесь ответа.');
      }
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<ExploreLocationResult>(
        player.playerId,
        intentId,
        [commandKey],
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return markExploreLocationReplay(replay.result);
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Прошлый жест ещё в пути. Дождитесь ответа.');
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
      throw new AppError('stale_command_intent', 'След приключения сместился. Вот нынешний путь.');
    }

    const commandOptions = {
      commandKey,
      intentId: scopedCreateIntent?.intentId,
      intentStateKey: scopedCreateIntent?.intentStateKey,
      currentStateKey,
    } as const;

    const currentPlayer = player;

    const locationLevel = resolveEncounterLocationLevel(currentPlayer);
    const currentSchoolCode = resolveExplorationSchoolCode(currentPlayer);
    const biome = this.worldCatalog.findBiomeForLocationLevel(locationLevel);
    if (!biome) {
      throw new AppError('biome_not_found', 'Для текущего уровня локации не найден биом.');
    }

    const outcome = resolveExplorationOutcome({
      player: currentPlayer,
      biome,
      templates: this.worldCatalog.listMobTemplatesForBiome(biome.code),
      roamingTemplatePools: currentPlayer.tutorialState === 'ACTIVE'
        ? []
        : buildRoamingTemplatePools(this.worldCatalog, biome),
      currentSchoolCode,
      locationLevel,
    }, this.random);

    if (outcome.kind === 'event') {
      return this.persistExplorationEventResult(currentPlayer, {
        event: outcome.event,
        player: currentPlayer,
      }, commandOptions);
    }

    return this.startBattleFromOutcome(vkId, currentPlayer, outcome, commandOptions);
  }

  private async startBattleFromOutcome(
    vkId: number,
    currentPlayer: PlayerState,
    outcome: ExplorationBattleOutcome,
    commandOptions: ExploreLocationCommandOptions,
  ): Promise<BattleView> {
    const playerSnapshot = buildBattlePlayerSnapshot(currentPlayer.playerId, vkId, outcome.playerStats, currentPlayer);
    const shouldOfferEncounterChoice = outcome.locationLevel > 0 && currentPlayer.tutorialState !== 'ACTIVE';
    const encounter = shouldOfferEncounterChoice
      ? createBattleEncounter(playerSnapshot, outcome.enemy, outcome.turnOwner)
      : null;
    const battle = await this.repository.createBattle(currentPlayer.playerId, {
      status: 'ACTIVE',
      battleType: 'PVE',
      actionRevision: 0,
      locationLevel: outcome.locationLevel,
      biomeCode: outcome.biome.code,
      enemyCode: outcome.template.code,
      turnOwner: encounter ? 'PLAYER' : outcome.turnOwner,
      player: playerSnapshot,
      enemy: outcome.enemy,
      encounter,
      log: outcome.openingLog,
      result: null,
      rewards: null,
    }, encounter || outcome.turnOwner === 'PLAYER' ? commandOptions : undefined);

    await this.trackTutorialPathChosen(currentPlayer, battle);
    await this.trackSchoolNoviceEliteEncounterStarted(currentPlayer, battle, outcome.currentSchoolCode);
    await this.trackSchoolNoviceFollowUpBattleStart(currentPlayer, battle);

    if (!isBattleEncounterOffered(battle) && battle.turnOwner === 'ENEMY') {
      const resolved = BattleEngine.resolveEnemyTurn(battle);
      if (resolved.status === 'COMPLETED') {
        const finalized = await this.repository.finalizeBattle(currentPlayer.playerId, resolved, commandOptions);
        return finalized.battle;
      }

      return this.repository.saveBattle(resolved, commandOptions);
    }

    return battle;
  }

  private async persistExplorationEventResult(
    player: PlayerState,
    result: ExploreLocationEventResult,
    commandOptions: ExploreLocationCommandOptions,
  ): Promise<ExploreLocationEventResult> {
    const inventoryDelta = getExplorationSceneInventoryDelta(result.event);

    if (inventoryDelta) {
      return this.repository.recordInventoryDeltaResult(
        player.playerId,
        inventoryDelta,
        commandOptions,
        (updatedPlayer) => ({
          ...result,
          player: updatedPlayer,
        }),
      );
    }

    return this.repository.recordCommandIntentResult(
      player.playerId,
      commandOptions.commandKey,
      commandOptions.intentId,
      commandOptions.intentStateKey,
      commandOptions.currentStateKey,
      result,
    );
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
