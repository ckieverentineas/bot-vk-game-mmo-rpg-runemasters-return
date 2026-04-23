import type {
  BattleEncounterKind,
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
import { getPlayerSchoolMastery } from '../../player/domain/school-mastery';
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
  readonly roamingTemplatePools?: readonly ExplorationRoamingTemplatePool[];
  readonly locationLevel: number;
  readonly currentSchoolCode: string | null;
}

export interface ExplorationRoamingTemplatePool {
  readonly biome: BiomeView;
  readonly templates: readonly MobTemplateView[];
  readonly chancePercent: number;
  readonly direction: 'LOWER_BIOME' | 'HIGHER_BIOME';
}

export interface ExplorationEventOutcome {
  readonly kind: 'event';
  readonly event: ExplorationSceneView;
}

export interface ExplorationEncounterVariant {
  readonly kind: BattleEncounterKind;
  readonly title: string;
  readonly description: string;
  readonly effectLine: string;
  readonly fleeChanceModifierPercent?: number;
  readonly initialTurnOwner?: TurnOwner;
  readonly enemyHealthMultiplier?: number;
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
  readonly encounterVariant: ExplorationEncounterVariant | null;
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

const shouldPreferSchoolSealTarget = (
  player: PlayerState,
  currentSchoolCode: string | null,
): boolean => {
  const novicePath = getSchoolNovicePathDefinition(currentSchoolCode);
  if (!novicePath?.minibossRewardRarity) {
    return false;
  }

  const mastery = getPlayerSchoolMastery(player, novicePath.schoolCode);
  return hasEquippedRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.minibossRewardRarity)
    && (mastery?.rank ?? 0) < 2;
};

const buildOpeningLog = (
  context: ResolveExplorationOutcomeContext & { readonly roamingOriginBiome?: BiomeView | null },
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
    ...(context.roamingOriginBiome
      ? [`🧭 Бродячий след: ${enemy.name} пришёл из места «${context.roamingOriginBiome.name}».`]
      : []),
    ...(explorationEventLine ? [explorationEventLine] : []),
  ];
};

const pickRoamingPool = (
  pools: readonly ExplorationRoamingTemplatePool[],
  random: ExplorationOutcomeRandom,
): ExplorationRoamingTemplatePool | null => (
  pools.find((pool) => (
    pool.chancePercent > 0
    && pool.templates.length > 0
    && random.rollPercentage(pool.chancePercent)
  )) ?? null
);

const ambushChancePercent = 12;
const wearyEnemyChancePercent = 18;
const trailChancePercent = 25;
const ambushMinLocationLevel = 4;
const ambushMinVictories = 3;
const wearyEnemyMinLocationLevel = 2;
const wearyEnemyHealthMultiplier = 0.75;

const createTrailVariant = (enemy: BattleEnemySnapshot): ExplorationEncounterVariant => ({
  kind: 'TRAIL',
  title: 'Свежий след',
  description: `${enemy.name} ещё не вышел на вас: следы дают выбрать темп.`,
  effectLine: 'Первый ход за вами, отступить проще: +10% к шансу ухода.',
  fleeChanceModifierPercent: 10,
  initialTurnOwner: 'PLAYER',
});

const createAmbushVariant = (enemy: BattleEnemySnapshot): ExplorationEncounterVariant => ({
  kind: 'AMBUSH',
  title: 'Засада',
  description: `${enemy.name} выходит из укрытия ближе обычного.`,
  effectLine: 'Враг начнёт первым, шанс отступить ниже: -10%.',
  fleeChanceModifierPercent: -10,
  initialTurnOwner: 'ENEMY',
});

const createWearyEnemyVariant = (enemy: BattleEnemySnapshot): ExplorationEncounterVariant => ({
  kind: 'WEARY_ENEMY',
  title: 'Усталый враг',
  description: `${enemy.name} уже потрёпан дорогой и входит в бой не на полном здоровье.`,
  effectLine: 'Враг начинает с 75% HP, отступить чуть проще: +5%.',
  fleeChanceModifierPercent: 5,
  enemyHealthMultiplier: wearyEnemyHealthMultiplier,
});

const createEliteTrailVariant = (enemy: BattleEnemySnapshot): ExplorationEncounterVariant => ({
  kind: 'ELITE_TRAIL',
  title: 'Элитный след',
  description: `${enemy.name} оставил слишком явные знаки силы: это не случайная стычка.`,
  effectLine: 'Элитная цель заметна заранее, но отступить сложнее: -5%.',
  fleeChanceModifierPercent: -5,
});

const resolveEncounterVariant = (
  context: ResolveExplorationOutcomeContext,
  enemy: BattleEnemySnapshot,
  random: ExplorationOutcomeRandom,
): ExplorationEncounterVariant | null => {
  if (context.locationLevel <= 0) {
    return null;
  }

  if (enemy.isElite || enemy.isBoss) {
    return createEliteTrailVariant(enemy);
  }

  if (context.player.defeatStreak > 0) {
    return createTrailVariant(enemy);
  }

  if (
    context.player.victories >= ambushMinVictories
    && context.locationLevel >= ambushMinLocationLevel
    && random.rollPercentage(ambushChancePercent)
  ) {
    return createAmbushVariant(enemy);
  }

  if (context.locationLevel >= wearyEnemyMinLocationLevel && random.rollPercentage(wearyEnemyChancePercent)) {
    return createWearyEnemyVariant(enemy);
  }

  if (random.rollPercentage(trailChancePercent)) {
    return createTrailVariant(enemy);
  }

  return null;
};

const applyEncounterVariantToEnemy = (
  enemy: BattleEnemySnapshot,
  variant: ExplorationEncounterVariant | null,
): BattleEnemySnapshot => {
  if (!variant?.enemyHealthMultiplier) {
    return enemy;
  }

  return {
    ...enemy,
    currentHealth: Math.max(1, Math.ceil(enemy.maxHealth * variant.enemyHealthMultiplier)),
  };
};

const resolveBattleOutcome = (
  context: ResolveExplorationOutcomeContext,
  random: ExplorationOutcomeRandom,
): ExplorationBattleOutcome => {
  const suppressChallengeEncounters = context.player.defeatStreak > 0;
  const preferMiniboss = shouldPreferSchoolMiniboss(context.player, context.currentSchoolCode)
    && !suppressChallengeEncounters;
  const preferSealTarget = shouldPreferSchoolSealTarget(context.player, context.currentSchoolCode)
    && !suppressChallengeEncounters;
  const roamingPool = preferMiniboss || preferSealTarget
    ? null
    : pickRoamingPool(context.roamingTemplatePools ?? [], random);
  const template = roamingPool
    ? random.pickOne(roamingPool.templates)
    : pickEncounterTemplate(context.templates, context.locationLevel, {
        schoolCode: context.currentSchoolCode,
        preferMiniboss,
        preferSealTarget,
        suppressChallengeEncounters,
      }, random);
  const playerStats = derivePlayerStats(context.player);
  const enemy = buildEnemySnapshot(template, context.locationLevel);
  const openingLog = buildOpeningLog({
    ...context,
    roamingOriginBiome: roamingPool?.biome ?? null,
  }, enemy, random);
  const encounterVariant = resolveEncounterVariant(context, enemy, random);

  return {
    kind: 'battle',
    biome: context.biome,
    template,
    enemy: applyEncounterVariantToEnemy(enemy, encounterVariant),
    playerStats,
    turnOwner: resolveInitialTurnOwner(playerStats.dexterity, enemy.dexterity),
    openingLog,
    locationLevel: context.locationLevel,
    currentSchoolCode: context.currentSchoolCode,
    encounterVariant,
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
