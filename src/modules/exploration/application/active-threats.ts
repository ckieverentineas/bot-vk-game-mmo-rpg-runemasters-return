import type {
  BiomeView,
  MobTemplateView,
} from '../../../shared/types/game';
import type { ActiveEnemyThreatView } from '../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../../world/application/ports/WorldCatalog';
import type { ExplorationActiveThreat } from '../domain/exploration-outcome';

const findMobTemplateByCode = (
  worldCatalog: WorldCatalog,
  biomeCode: string,
  enemyCode: string,
): MobTemplateView | null => (
  worldCatalog.listMobTemplatesForBiome(biomeCode)
    .find((template) => template.code === enemyCode) ?? null
);

const resolveThreatRoamingDirection = (
  originBiome: BiomeView | null,
  currentBiome: BiomeView,
): ExplorationActiveThreat['roamingDirection'] => {
  if (!originBiome || originBiome.code === currentBiome.code) {
    return undefined;
  }

  return originBiome.minLevel > currentBiome.minLevel ? 'HIGHER_BIOME' : 'LOWER_BIOME';
};

export const toExplorationActiveThreat = (
  worldCatalog: WorldCatalog,
  currentBiome: BiomeView,
  threat: ActiveEnemyThreatView,
): ExplorationActiveThreat | null => {
  const template = findMobTemplateByCode(worldCatalog, threat.originBiomeCode, threat.enemyCode)
    ?? findMobTemplateByCode(worldCatalog, threat.currentBiomeCode, threat.enemyCode);
  if (!template) {
    return null;
  }

  const originBiome = worldCatalog.listBiomes()
    .find((biome) => biome.code === threat.originBiomeCode) ?? null;

  return {
    ...threat,
    template,
    roamingDirection: resolveThreatRoamingDirection(originBiome, currentBiome),
  };
};
