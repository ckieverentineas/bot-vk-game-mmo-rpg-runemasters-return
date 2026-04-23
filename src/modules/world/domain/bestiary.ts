import { resolveEnemyTacticalProfile, type EnemyTacticalProfile } from '../../../shared/domain/enemy-tactical-profile';
import type { BiomeView, MobTemplateView } from '../../../shared/types/game';

export const bestiaryLocationPageSize = 5;

export interface BestiaryDiscoveryState {
  readonly discoveredEnemyCodes: readonly string[];
  readonly rewardedEnemyCodes: readonly string[];
}

export interface BestiaryEnemyView {
  readonly template: MobTemplateView;
  readonly isDiscovered: boolean;
  readonly isDropRevealed: boolean;
  readonly tacticalProfile: EnemyTacticalProfile | null;
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
      const enemies = listMobTemplatesForBiome(biome.code).map((template): BestiaryEnemyView => {
        const isDiscovered = discoveredEnemyCodes.has(template.code);

        return {
          template,
          isDiscovered,
          isDropRevealed: isDiscovered && rewardedEnemyCodes.has(template.code),
          tacticalProfile: isDiscovered ? resolveEnemyTacticalProfile(template) : null,
        };
      });

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
