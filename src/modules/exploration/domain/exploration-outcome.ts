import type {
  BattleEncounterKind,
  BattleEnemySnapshot,
  BattleEnemyRoamingSnapshot,
  BiomeView,
  MobTemplateView,
  PlayerState,
  StatBlock,
  TurnOwner,
} from '../../../shared/types/game';
import { buildAntiStallRecoveryView, type AntiStallRecoveryView } from '../../player/domain/anti-stall-recovery';
import {
  getSchoolNovicePathDefinition,
  hasEquippedRuneOfSchoolAtLeastRarity,
  hasRuneOfSchoolAtLeastRarity,
} from '../../player/domain/school-novice-path';
import { getPlayerSchoolMastery } from '../../player/domain/school-mastery';
import { addStats, derivePlayerStats, getEquippedRune } from '../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import {
  resolveWorkshopEquipmentStatBonus,
  type WorkshopEquippedItemView,
} from '../../workshop/domain/workshop-catalog';
import { buildEnemySnapshot, describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from '../../world/domain/enemy-scaling';
import {
  buildEnemyThreatSnapshot,
  resolveEnemyThreatDisplayName,
  resolveEnemyThreatEncounterLine,
} from '../../world/domain/enemy-threat-growth';
import {
  type ExplorationSceneView,
  resolveExplorationEventLine,
  resolveRecoveryRestExplorationEvent,
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
  readonly activeThreats?: readonly ExplorationActiveThreat[];
  readonly roamingTemplatePools?: readonly ExplorationRoamingTemplatePool[];
  readonly locationLevel: number;
  readonly currentSchoolCode: string | null;
  readonly workshopItems?: readonly WorkshopEquippedItemView[];
  readonly normalEncounterCursor?: number;
}

export interface ExplorationActiveThreat {
  readonly enemyCode: string;
  readonly enemyName: string;
  readonly originBiomeCode: string;
  readonly originBiomeName: string;
  readonly currentBiomeCode: string;
  readonly survivalCount: number;
  readonly experience: number;
  readonly levelBonus: number;
  readonly lastSeenLocationLevel: number;
  readonly template: MobTemplateView;
  readonly roamingDirection?: BattleEnemyRoamingSnapshot['direction'];
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
    ...(enemy.roaming
      ? [resolveRoamingEncounterLine(enemy)]
      : []),
    ...(explorationEventLine ? [explorationEventLine] : []),
  ];
};

const resolveRoamingEncounterLine = (enemy: BattleEnemySnapshot): string => {
  const roaming = enemy.roaming;
  if (!roaming) {
    return '';
  }

  if (roaming.direction === 'HIGHER_BIOME') {
    return `⚠️ Чужой след: ${enemy.name} спустился из места «${roaming.originBiomeName}», набрал опыт дороги и опаснее обычной встречи.`;
  }

  return `🧭 Бродячий след: ${enemy.name} пришёл из места «${roaming.originBiomeName}».`;
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

const pickActiveThreat = (
  threats: readonly ExplorationActiveThreat[],
  random: ExplorationOutcomeRandom,
): ExplorationActiveThreat | null => (
  threats.length > 0 && random.rollPercentage(activeThreatChancePercent)
    ? random.pickOne(threats)
    : null
);

const resolveRoamingLevelBonus = (roamingPool: ExplorationRoamingTemplatePool | null): number => (
  roamingPool?.direction === 'HIGHER_BIOME'
    ? higherBiomeRoamingLevelBonus
    : 0
);

const resolveRoamingExperienceBonus = (
  locationLevel: number,
  roamingPool: ExplorationRoamingTemplatePool | null,
): number => (
  roamingPool?.direction === 'HIGHER_BIOME'
    ? Math.max(2, Math.ceil(locationLevel * 0.5))
    : 0
);

const buildRoamingSnapshot = (
  roamingPool: ExplorationRoamingTemplatePool,
  levelBonus: number,
  experienceBonus: number,
): BattleEnemyRoamingSnapshot => ({
  direction: roamingPool.direction,
  originBiomeCode: roamingPool.biome.code,
  originBiomeName: roamingPool.biome.name,
  levelBonus,
  experienceBonus,
});

const buildRoamingEnemySnapshot = (
  template: MobTemplateView,
  context: ResolveExplorationOutcomeContext,
  roamingPool: ExplorationRoamingTemplatePool | null,
): BattleEnemySnapshot => {
  const levelBonus = resolveRoamingLevelBonus(roamingPool);
  const experienceBonus = resolveRoamingExperienceBonus(context.locationLevel, roamingPool);
  const enemy = buildEnemySnapshot(template, context.locationLevel + levelBonus);

  if (!roamingPool) {
    return enemy;
  }

  return {
    ...enemy,
    experienceReward: enemy.experienceReward + experienceBonus,
    roaming: buildRoamingSnapshot(roamingPool, levelBonus, experienceBonus),
  };
};

const resolveThreatRewardBonus = (threat: ExplorationActiveThreat): number => (
  Math.max(threat.levelBonus, Math.floor(threat.experience / 4))
);

const buildThreatRoamingSnapshot = (
  threat: ExplorationActiveThreat,
): BattleEnemyRoamingSnapshot | undefined => {
  if (threat.originBiomeCode === threat.currentBiomeCode || !threat.roamingDirection) {
    return undefined;
  }

  return {
    direction: threat.roamingDirection,
    originBiomeCode: threat.originBiomeCode,
    originBiomeName: threat.originBiomeName,
    levelBonus: threat.levelBonus,
    experienceBonus: resolveThreatRewardBonus(threat),
  };
};

const buildThreatEnemySnapshot = (
  threat: ExplorationActiveThreat,
  context: ResolveExplorationOutcomeContext,
): BattleEnemySnapshot => {
  const enemy = buildEnemySnapshot(threat.template, context.locationLevel + threat.levelBonus);

  return {
    ...enemy,
    name: resolveEnemyThreatDisplayName(threat),
    experienceReward: enemy.experienceReward + resolveThreatRewardBonus(threat),
    threat: buildEnemyThreatSnapshot(threat),
    roaming: buildThreatRoamingSnapshot(threat),
  };
};

const resolveThreatEncounterLine = (threat: ExplorationActiveThreat): string => (
  resolveEnemyThreatEncounterLine(threat)
);

const ambushChancePercent = 12;
const wearyEnemyChancePercent = 18;
const trailChancePercent = 25;
const activeThreatChancePercent = 20;
const ambushMinLocationLevel = 4;
const ambushMinVictories = 3;
const wearyEnemyMinLocationLevel = 2;
const wearyEnemyHealthMultiplier = 0.75;
const recoveryEnemyHealthMultiplier = 0.6;
const higherBiomeRoamingLevelBonus = 2;

const calculateTemplateThreat = (template: MobTemplateView): number => (
  template.baseStats.health
  + template.baseStats.attack * 4
  + template.baseStats.defence * 3
  + template.baseStats.magicDefence
  + template.baseStats.dexterity
  + template.baseStats.intelligence
);

const pickRecoveryEncounterTemplate = (templates: readonly MobTemplateView[]): MobTemplateView => {
  const normalTemplates = templates.filter((template) => !template.isElite && !template.isBoss);
  const candidateTemplates = normalTemplates.length > 0 ? normalTemplates : templates;

  return [...candidateTemplates].sort((left, right) => (
    calculateTemplateThreat(left) - calculateTemplateThreat(right)
    || left.code.localeCompare(right.code)
  ))[0] ?? pickEncounterTemplate(templates, 1);
};

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

const createRecoveryEncounterVariant = (enemy: BattleEnemySnapshot): ExplorationEncounterVariant => ({
  kind: 'WEARY_ENEMY',
  title: 'Осторожная встреча',
  description: `${enemy.name} замечен заранее: маршрут даёт пространство вернуть темп.`,
  effectLine: 'Первый ход за вами, враг начинает с 60% HP, отступить проще: +15%.',
  fleeChanceModifierPercent: 15,
  initialTurnOwner: 'PLAYER',
  enemyHealthMultiplier: recoveryEnemyHealthMultiplier,
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
  recovery: AntiStallRecoveryView | null,
): ExplorationEncounterVariant | null => {
  if (context.locationLevel <= 0) {
    return null;
  }

  if (recovery) {
    return createRecoveryEncounterVariant(enemy);
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

export const resolveExplorationBattleOutcome = (
  context: ResolveExplorationOutcomeContext,
  random: ExplorationOutcomeRandom,
): ExplorationBattleOutcome => {
  const recovery = buildAntiStallRecoveryView(context.player);
  const suppressChallengeEncounters = context.player.defeatStreak > 0 || !!recovery;
  const preferMiniboss = shouldPreferSchoolMiniboss(context.player, context.currentSchoolCode)
    && !suppressChallengeEncounters;
  const preferSealTarget = shouldPreferSchoolSealTarget(context.player, context.currentSchoolCode)
    && !suppressChallengeEncounters;
  const activeThreat = preferMiniboss || preferSealTarget || recovery
    ? null
    : pickActiveThreat(context.activeThreats ?? [], random);
  const roamingPool = preferMiniboss || preferSealTarget || recovery || activeThreat
    ? null
    : pickRoamingPool(context.roamingTemplatePools ?? [], random);
  const template = recovery
    ? pickRecoveryEncounterTemplate(context.templates)
    : activeThreat
    ? activeThreat.template
    : roamingPool
    ? random.pickOne(roamingPool.templates)
    : pickEncounterTemplate(context.templates, context.locationLevel, {
        schoolCode: context.currentSchoolCode,
        preferMiniboss,
        preferSealTarget,
        suppressChallengeEncounters,
        normalEncounterCursor: context.normalEncounterCursor,
      }, random);
  const playerStats = addStats(
    derivePlayerStats(context.player),
    resolveWorkshopEquipmentStatBonus(context.workshopItems ?? []),
  );
  const enemy = activeThreat
    ? buildThreatEnemySnapshot(activeThreat, context)
    : buildRoamingEnemySnapshot(template, context, roamingPool);
  const openingLog = [
    ...buildOpeningLog(context, enemy, random),
    ...(activeThreat ? [resolveThreatEncounterLine(activeThreat)] : []),
  ];
  const encounterVariant = resolveEncounterVariant(context, enemy, random, recovery);

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
  const recovery = buildAntiStallRecoveryView(context.player);
  if (recovery?.shouldOfferRest) {
    const restEvent = resolveRecoveryRestExplorationEvent({
      biome: context.biome,
      currentSchoolCode: context.currentSchoolCode,
      locationLevel: context.locationLevel,
    });

    if (restEvent) {
      return {
        kind: 'event',
        event: restEvent,
      };
    }
  }

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

  return resolveExplorationBattleOutcome(context, random);
};
