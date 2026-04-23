import { resolveEnemyTacticalProfile, type EnemyTacticalProfile } from '../../../shared/domain/enemy-tactical-profile';
import type { BiomeView, MobTemplateView, ResourceReward } from '../../../shared/types/game';

export const bestiaryLocationPageSize = 5;
export const bestiaryKillMilestoneThresholds = [1, 5, 10, 25] as const;

const locationDiscoveryRadianceByBiomeCode: Readonly<Record<string, number>> = {
  initium: 1,
  'dark-forest': 2,
  'forgotten-caves': 3,
  'cursed-citadel': 4,
  abyss: 5,
};

const killMilestoneRadianceByThreshold: Readonly<Record<number, number>> = {
  1: 1,
  5: 1,
  10: 2,
  25: 3,
};

export interface BestiaryEnemyVictoryCount {
  readonly enemyCode: string;
  readonly victoryCount: number;
}

export interface BestiaryKillMilestoneKey {
  readonly enemyCode: string;
  readonly threshold: number;
}

export interface BestiaryDiscoveryState {
  readonly discoveredEnemyCodes: readonly string[];
  readonly rewardedEnemyCodes: readonly string[];
  readonly enemyVictoryCounts?: readonly BestiaryEnemyVictoryCount[];
  readonly claimedKillMilestones?: readonly BestiaryKillMilestoneKey[];
}

export interface BestiaryRewardView {
  readonly reward: ResourceReward;
  readonly isClaimed: boolean;
  readonly claimedNow: boolean;
}

export interface BestiaryKillMilestoneView {
  readonly threshold: number;
  readonly reward: ResourceReward;
  readonly isCompleted: boolean;
  readonly isClaimed: boolean;
  readonly claimedNow: boolean;
}

export interface BestiaryEnemyView {
  readonly template: MobTemplateView;
  readonly isDiscovered: boolean;
  readonly isDropRevealed: boolean;
  readonly tacticalProfile: EnemyTacticalProfile | null;
  readonly victoryCount: number;
  readonly killMilestones: readonly BestiaryKillMilestoneView[];
}

export interface BestiaryLocationSummaryView {
  readonly biome: BiomeView;
  readonly isUnlocked: boolean;
  readonly unlockLocationLevel: number;
  readonly discoveryReward: BestiaryRewardView;
  readonly discoveredEnemyCount: number;
  readonly revealedDropCount: number;
  readonly totalEnemyCount: number;
}

export interface BestiaryLocationView {
  readonly biome: BiomeView;
  readonly enemies: readonly BestiaryEnemyView[];
  readonly discoveredEnemyCount: number;
  readonly revealedDropCount: number;
  readonly totalEnemyCount: number;
}

export interface BestiaryView {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly totalLocations: number;
  readonly locations: readonly BestiaryLocationView[];
}

export interface BestiaryOverviewView {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly totalLocations: number;
  readonly locations: readonly BestiaryLocationSummaryView[];
}

export interface BestiaryLocationDetailView {
  readonly location: BestiaryLocationSummaryView;
  readonly enemies: readonly BestiaryEnemyView[];
}

export interface BuildBestiaryOverviewViewInput {
  readonly biomes: readonly BiomeView[];
  readonly listMobTemplatesForBiome: (biomeCode: string) => readonly MobTemplateView[];
  readonly discovery: BestiaryDiscoveryState;
  readonly highestLocationLevel: number;
  readonly requestedPageNumber?: number;
  readonly pageSize?: number;
  readonly claimedLocationRewardCodes?: readonly string[];
  readonly newlyClaimedLocationRewardCodes?: readonly string[];
}

export interface BuildBestiaryLocationDetailViewInput {
  readonly biomeCode: string;
  readonly biomes: readonly BiomeView[];
  readonly listMobTemplatesForBiome: (biomeCode: string) => readonly MobTemplateView[];
  readonly discovery: BestiaryDiscoveryState;
  readonly highestLocationLevel: number;
  readonly claimedLocationRewardCodes?: readonly string[];
  readonly newlyClaimedLocationRewardCodes?: readonly string[];
  readonly newlyClaimedKillMilestones?: readonly BestiaryKillMilestoneKey[];
}

export const normalizeBestiaryPageNumber = (
  requestedPageNumber: number,
  totalLocations: number,
  pageSize = bestiaryLocationPageSize,
): number => {
  const totalPages = Math.max(1, Math.ceil(totalLocations / pageSize));
  const safePageNumber = Number.isFinite(requestedPageNumber)
    ? Math.floor(requestedPageNumber)
    : 1;

  if (safePageNumber < 1) {
    return 1;
  }

  if (safePageNumber > totalPages) {
    return totalPages;
  }

  return safePageNumber;
};

export const isBestiaryLocationUnlocked = (
  biome: BiomeView,
  highestLocationLevel: number,
): boolean => highestLocationLevel >= biome.minLevel;

export const createBestiaryKillMilestoneKey = (enemyCode: string, threshold: number): string => (
  `${enemyCode}:${threshold}`
);

export const resolveBestiaryLocationDiscoveryReward = (
  biome: BiomeView,
  biomeIndex: number,
): ResourceReward => ({
  radiance: locationDiscoveryRadianceByBiomeCode[biome.code] ?? Math.max(1, biomeIndex + 1),
});

export const resolveBestiaryKillMilestoneReward = (threshold: number): ResourceReward => ({
  radiance: killMilestoneRadianceByThreshold[threshold] ?? 1,
});

const createVictoryCountMap = (
  enemyVictoryCounts: readonly BestiaryEnemyVictoryCount[] = [],
): ReadonlyMap<string, number> => new Map(
  enemyVictoryCounts.map(({ enemyCode, victoryCount }) => [enemyCode, Math.max(0, Math.floor(victoryCount))]),
);

const createKillMilestoneSet = (
  milestones: readonly BestiaryKillMilestoneKey[] = [],
): ReadonlySet<string> => new Set(
  milestones.map(({ enemyCode, threshold }) => createBestiaryKillMilestoneKey(enemyCode, threshold)),
);

const buildKillMilestones = (
  enemyCode: string,
  victoryCount: number,
  claimedKillMilestones: ReadonlySet<string>,
  newlyClaimedKillMilestones: ReadonlySet<string>,
): readonly BestiaryKillMilestoneView[] => bestiaryKillMilestoneThresholds.map((threshold) => {
  const milestoneKey = createBestiaryKillMilestoneKey(enemyCode, threshold);
  const claimedNow = newlyClaimedKillMilestones.has(milestoneKey);
  const isClaimed = claimedNow || claimedKillMilestones.has(milestoneKey);

  return {
    threshold,
    reward: resolveBestiaryKillMilestoneReward(threshold),
    isCompleted: victoryCount >= threshold,
    isClaimed,
    claimedNow,
  };
});

const buildEnemyView = (
  template: MobTemplateView,
  discoveredEnemyCodes: ReadonlySet<string>,
  rewardedEnemyCodes: ReadonlySet<string>,
  victoryCounts: ReadonlyMap<string, number>,
  claimedKillMilestones: ReadonlySet<string>,
  newlyClaimedKillMilestones: ReadonlySet<string>,
): BestiaryEnemyView => {
  const isDiscovered = discoveredEnemyCodes.has(template.code);
  const victoryCount = victoryCounts.get(template.code) ?? 0;

  return {
    template,
    isDiscovered,
    isDropRevealed: isDiscovered && rewardedEnemyCodes.has(template.code),
    tacticalProfile: isDiscovered ? resolveEnemyTacticalProfile(template) : null,
    victoryCount,
    killMilestones: buildKillMilestones(
      template.code,
      victoryCount,
      claimedKillMilestones,
      newlyClaimedKillMilestones,
    ),
  };
};

const buildLocationSummary = (
  biome: BiomeView,
  biomeIndex: number,
  enemies: readonly BestiaryEnemyView[],
  highestLocationLevel: number,
  claimedLocationRewardCodes: ReadonlySet<string>,
  newlyClaimedLocationRewardCodes: ReadonlySet<string>,
): BestiaryLocationSummaryView => {
  const claimedNow = newlyClaimedLocationRewardCodes.has(biome.code);

  return {
    biome,
    isUnlocked: isBestiaryLocationUnlocked(biome, highestLocationLevel),
    unlockLocationLevel: biome.minLevel,
    discoveryReward: {
      reward: resolveBestiaryLocationDiscoveryReward(biome, biomeIndex),
      isClaimed: claimedNow || claimedLocationRewardCodes.has(biome.code),
      claimedNow,
    },
    discoveredEnemyCount: enemies.filter((enemy) => enemy.isDiscovered).length,
    revealedDropCount: enemies.filter((enemy) => enemy.isDropRevealed).length,
    totalEnemyCount: enemies.length,
  };
};

const buildBestiaryEnemies = (
  biomeCode: string,
  listMobTemplatesForBiome: (biomeCode: string) => readonly MobTemplateView[],
  discovery: BestiaryDiscoveryState,
  newlyClaimedKillMilestones: readonly BestiaryKillMilestoneKey[] = [],
): readonly BestiaryEnemyView[] => {
  const discoveredEnemyCodes = new Set(discovery.discoveredEnemyCodes);
  const rewardedEnemyCodes = new Set(discovery.rewardedEnemyCodes);
  const victoryCounts = createVictoryCountMap(discovery.enemyVictoryCounts);
  const claimedKillMilestones = createKillMilestoneSet(discovery.claimedKillMilestones);
  const newlyClaimedKillMilestoneSet = createKillMilestoneSet(newlyClaimedKillMilestones);

  return listMobTemplatesForBiome(biomeCode).map((template) => buildEnemyView(
    template,
    discoveredEnemyCodes,
    rewardedEnemyCodes,
    victoryCounts,
    claimedKillMilestones,
    newlyClaimedKillMilestoneSet,
  ));
};

export const buildBestiaryOverviewView = ({
  biomes,
  listMobTemplatesForBiome,
  discovery,
  highestLocationLevel,
  requestedPageNumber = 1,
  pageSize = bestiaryLocationPageSize,
  claimedLocationRewardCodes = [],
  newlyClaimedLocationRewardCodes = [],
}: BuildBestiaryOverviewViewInput): BestiaryOverviewView => {
  const pageNumber = normalizeBestiaryPageNumber(requestedPageNumber, biomes.length, pageSize);
  const pageStart = (pageNumber - 1) * pageSize;
  const claimedLocationRewardCodeSet = new Set(claimedLocationRewardCodes);
  const newlyClaimedLocationRewardCodeSet = new Set(newlyClaimedLocationRewardCodes);
  const locations = biomes
    .slice(pageStart, pageStart + pageSize)
    .map((biome, pageIndex): BestiaryLocationSummaryView => {
      const biomeIndex = pageStart + pageIndex;
      const enemies = buildBestiaryEnemies(biome.code, listMobTemplatesForBiome, discovery);

      return buildLocationSummary(
        biome,
        biomeIndex,
        enemies,
        highestLocationLevel,
        claimedLocationRewardCodeSet,
        newlyClaimedLocationRewardCodeSet,
      );
    });

  return {
    pageNumber,
    totalPages: Math.max(1, Math.ceil(biomes.length / pageSize)),
    totalLocations: biomes.length,
    locations,
  };
};

export const buildBestiaryLocationDetailView = ({
  biomeCode,
  biomes,
  listMobTemplatesForBiome,
  discovery,
  highestLocationLevel,
  claimedLocationRewardCodes = [],
  newlyClaimedLocationRewardCodes = [],
  newlyClaimedKillMilestones = [],
}: BuildBestiaryLocationDetailViewInput): BestiaryLocationDetailView => {
  const biomeIndex = biomes.findIndex((biome) => biome.code === biomeCode);
  const biome = biomes[biomeIndex];

  if (!biome) {
    throw new Error(`Bestiary location not found: ${biomeCode}`);
  }

  const enemies = buildBestiaryEnemies(
    biome.code,
    listMobTemplatesForBiome,
    discovery,
    newlyClaimedKillMilestones,
  );

  return {
    location: buildLocationSummary(
      biome,
      biomeIndex,
      enemies,
      highestLocationLevel,
      new Set(claimedLocationRewardCodes),
      new Set(newlyClaimedLocationRewardCodes),
    ),
    enemies,
  };
};

export const buildBestiaryView = (
  biomes: readonly BiomeView[],
  listMobTemplatesForBiome: (biomeCode: string) => readonly MobTemplateView[],
  discovery: BestiaryDiscoveryState,
  requestedPageNumber = 1,
  pageSize = bestiaryLocationPageSize,
): BestiaryView => {
  const pageNumber = normalizeBestiaryPageNumber(requestedPageNumber, biomes.length, pageSize);
  const pageStart = (pageNumber - 1) * pageSize;
  const discoveredEnemyCodes = new Set(discovery.discoveredEnemyCodes);
  const rewardedEnemyCodes = new Set(discovery.rewardedEnemyCodes);
  const locations = biomes
    .slice(pageStart, pageStart + pageSize)
    .map((biome): BestiaryLocationView => {
      const enemies = listMobTemplatesForBiome(biome.code).map((template): BestiaryEnemyView => buildEnemyView(
        template,
        discoveredEnemyCodes,
        rewardedEnemyCodes,
        createVictoryCountMap(discovery.enemyVictoryCounts),
        createKillMilestoneSet(discovery.claimedKillMilestones),
        new Set(),
      ));

      return {
        biome,
        enemies,
        discoveredEnemyCount: enemies.filter((enemy) => enemy.isDiscovered).length,
        revealedDropCount: enemies.filter((enemy) => enemy.isDropRevealed).length,
        totalEnemyCount: enemies.length,
      };
    });

  return {
    pageNumber,
    totalPages: Math.max(1, Math.ceil(biomes.length / pageSize)),
    totalLocations: biomes.length,
    locations,
  };
};
