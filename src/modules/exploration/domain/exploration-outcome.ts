import type {
  BattleEnemySnapshot,
  BiomeView,
  MobTemplateView,
  PlayerState,
  StatBlock,
  TurnOwner,
} from '../../../shared/types/game';
import {
  getSchoolNovicePathDefinition,
  hasEquippedRuneOfSchoolAtLeastRarity,
  hasRuneOfSchoolAtLeastRarity,
} from '../../player/domain/school-novice-path';
import { derivePlayerStats, getEquippedRune } from '../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import { buildEnemySnapshot, describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from '../../world/domain/enemy-scaling';
import {
  type ExplorationSceneView,
  resolveExplorationEventLine,
  resolveStandaloneExplorationEvent,
} from '../../world/domain/exploration-events';
import { resolveGameMasterEncounterLine } from '../../world/domain/game-master-director';

export interface ExplorationOutcomeRandom {
  rollPercentage(chancePercent: number): boolean;
  pickOne<T>(items: readonly T[]): T;
}

export interface ResolveExplorationOutcomeContext {
  readonly player: PlayerState;
  readonly biome: BiomeView;
  readonly templates: readonly MobTemplateView[];
  readonly locationLevel: number;
  readonly currentSchoolCode: string | null;
}

export interface ExplorationEventOutcome {
  readonly kind: 'event';
  readonly event: ExplorationSceneView;
}

export interface ExplorationBattleOutcome {
  readonly kind: 'battle';
  readonly biome: BiomeView;
  readonly template: MobTemplateView;
  readonly enemy: BattleEnemySnapshot;
  readonly playerStats: StatBlock;
  readonly turnOwner: TurnOwner;
  readonly openingLog: string[];
  readonly locationLevel: number;
  readonly currentSchoolCode: string | null;
}

export type ExplorationOutcome = ExplorationEventOutcome | ExplorationBattleOutcome;

export const resolveExplorationSchoolCode = (player: PlayerState): string | null => (
  getSchoolDefinitionForArchetype(getEquippedRune(player)?.archetypeCode)?.code ?? null
);

const shouldPreferSchoolMiniboss = (
  player: PlayerState,
  currentSchoolCode: string | null,
): boolean => {
  const novicePath = getSchoolNovicePathDefinition(currentSchoolCode);

  return !!(
    novicePath
    && novicePath.minibossRewardRarity
    && hasEquippedRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity)
    && !hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.minibossRewardRarity)
  );
};

const buildOpeningLog = (
  context: ResolveExplorationOutcomeContext,
  enemy: BattleEnemySnapshot,
  random: ExplorationOutcomeRandom,
): string[] => {
  const encounterLine = describeEncounter(context.biome, enemy, context.currentSchoolCode);
  const gameMasterLine = resolveGameMasterEncounterLine({
    biome: context.biome,
    enemy,
    currentSchoolCode: context.currentSchoolCode,
    locationLevel: context.locationLevel,
  });
  const explorationEventLine = resolveExplorationEventLine({
    biome: context.biome,
    currentSchoolCode: context.currentSchoolCode,
    locationLevel: context.locationLevel,
  }, random);

  return [
    gameMasterLine ? `${encounterLine} ${gameMasterLine}` : encounterLine,
    ...(explorationEventLine ? [explorationEventLine] : []),
  ];
};

const resolveBattleOutcome = (
  context: ResolveExplorationOutcomeContext,
  random: ExplorationOutcomeRandom,
): ExplorationBattleOutcome => {
  const preferMiniboss = shouldPreferSchoolMiniboss(context.player, context.currentSchoolCode);
  const template = pickEncounterTemplate(context.templates, context.locationLevel, {
    schoolCode: context.currentSchoolCode,
    preferMiniboss,
  }, random);
  const playerStats = derivePlayerStats(context.player);
  const enemy = buildEnemySnapshot(template, context.locationLevel);

  return {
    kind: 'battle',
    biome: context.biome,
    template,
    enemy,
    playerStats,
    turnOwner: resolveInitialTurnOwner(playerStats.dexterity, enemy.dexterity),
    openingLog: buildOpeningLog(context, enemy, random),
    locationLevel: context.locationLevel,
    currentSchoolCode: context.currentSchoolCode,
  };
};

export const resolveExplorationOutcome = (
  context: ResolveExplorationOutcomeContext,
  random: ExplorationOutcomeRandom,
): ExplorationOutcome => {
  const standaloneEvent = resolveStandaloneExplorationEvent({
    biome: context.biome,
    currentSchoolCode: context.currentSchoolCode,
    locationLevel: context.locationLevel,
  }, random);

  if (standaloneEvent) {
    return {
      kind: 'event',
      event: standaloneEvent,
    };
  }

  return resolveBattleOutcome(context, random);
};
