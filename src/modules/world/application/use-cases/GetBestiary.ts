import { AppError } from '../../../../shared/domain/AppError';
import type { BiomeView, MobTemplateView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { BestiaryDiscoveryView, GameRepository } from '../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../ports/WorldCatalog';
import {
  bestiaryKillMilestoneThresholds,
  bestiaryLocationPageSize,
  buildBestiaryLocationDetailView,
  buildBestiaryOverviewView,
  isBestiaryLocationUnlocked,
  normalizeBestiaryPageNumber,
  resolveBestiaryKillMilestoneReward,
  resolveBestiaryLocationDiscoveryReward,
  type BestiaryKillMilestoneKey,
  type BestiaryLocationDetailView,
  type BestiaryOverviewView,
} from '../../domain/bestiary';

interface LocationDiscoveryClaimView {
  readonly discovery: BestiaryDiscoveryView;
  readonly newlyClaimedLocationRewardCodes: readonly string[];
}

interface KillMilestoneClaimView {
  readonly discovery: BestiaryDiscoveryView;
  readonly newlyClaimedKillMilestones: readonly BestiaryKillMilestoneKey[];
}

export class GetBestiary {
  public constructor(
    private readonly repository: GameRepository,
    private readonly worldCatalog: WorldCatalog,
  ) {}

  public async execute(vkId: number, pageNumber = 1): Promise<BestiaryOverviewView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const discovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();
    const pageBiomes = this.getPageBiomes(biomes, pageNumber);
    const discoveryClaim = await this.claimUnlockedLocationDiscoveryRewards(
      player,
      pageBiomes,
      biomes,
      discovery,
    );

    return buildBestiaryOverviewView({
      biomes,
      listMobTemplatesForBiome: (biomeCode) => this.worldCatalog.listMobTemplatesForBiome(biomeCode),
      discovery: discoveryClaim.discovery,
      requestedPageNumber: pageNumber,
      highestLocationLevel: player.highestLocationLevel,
      claimedLocationRewardCodes: discoveryClaim.discovery.claimedLocationRewardCodes,
      newlyClaimedLocationRewardCodes: discoveryClaim.newlyClaimedLocationRewardCodes,
    });
  }

  public async executeLocation(vkId: number, biomeCode: string): Promise<BestiaryLocationDetailView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const initialDiscovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();
    const biome = this.requireBiome(biomes, biomeCode);

    if (!isBestiaryLocationUnlocked(biome, player.highestLocationLevel)) {
      throw new AppError('bestiary_location_locked', 'Эта локация еще закрыта. Продвиньтесь глубже в исследовании.');
    }

    const locationDiscoveryClaim = await this.claimUnlockedLocationDiscoveryRewards(
      player,
      [biome],
      biomes,
      initialDiscovery,
    );
    const templates = this.worldCatalog.listMobTemplatesForBiome(biome.code);
    const killMilestoneClaim = await this.claimQualifiedKillMilestoneRewards(
      player.playerId,
      templates,
      locationDiscoveryClaim.discovery,
    );

    return buildBestiaryLocationDetailView({
      biomeCode: biome.code,
      biomes,
      listMobTemplatesForBiome: (currentBiomeCode) => this.worldCatalog.listMobTemplatesForBiome(currentBiomeCode),
      discovery: killMilestoneClaim.discovery,
      highestLocationLevel: player.highestLocationLevel,
      claimedLocationRewardCodes: killMilestoneClaim.discovery.claimedLocationRewardCodes,
      newlyClaimedLocationRewardCodes: locationDiscoveryClaim.newlyClaimedLocationRewardCodes,
      newlyClaimedKillMilestones: killMilestoneClaim.newlyClaimedKillMilestones,
    });
  }

  private getPageBiomes(
    biomes: readonly BiomeView[],
    requestedPageNumber: number,
  ): readonly BiomeView[] {
    const pageNumber = normalizeBestiaryPageNumber(
      requestedPageNumber,
      biomes.length,
      bestiaryLocationPageSize,
    );
    const pageStart = (pageNumber - 1) * bestiaryLocationPageSize;

    return biomes.slice(pageStart, pageStart + bestiaryLocationPageSize);
  }

  private requireBiome(biomes: readonly BiomeView[], biomeCode: string): BiomeView {
    const biome = biomes.find((candidate) => candidate.code === biomeCode);

    if (!biome) {
      throw new AppError('bestiary_location_not_found', 'Такая локация не найдена в бестиарии.');
    }

    return biome;
  }

  private async claimUnlockedLocationDiscoveryRewards(
    player: PlayerState,
    candidateBiomes: readonly BiomeView[],
    allBiomes: readonly BiomeView[],
    discovery: BestiaryDiscoveryView,
  ): Promise<LocationDiscoveryClaimView> {
    const claimedLocationRewardCodes = new Set(discovery.claimedLocationRewardCodes);
    const newlyClaimedLocationRewardCodes: string[] = [];

    for (const biome of candidateBiomes) {
      if (!isBestiaryLocationUnlocked(biome, player.highestLocationLevel) || claimedLocationRewardCodes.has(biome.code)) {
        continue;
      }

      const biomeIndex = allBiomes.findIndex((candidate) => candidate.code === biome.code);
      const result = await this.repository.claimBestiaryLocationDiscoveryReward(
        player.playerId,
        biome.code,
        resolveBestiaryLocationDiscoveryReward(biome, biomeIndex),
      );

      if (result.claimed) {
        newlyClaimedLocationRewardCodes.push(biome.code);
      }
    }

    return {
      discovery: newlyClaimedLocationRewardCodes.length > 0
        ? await this.repository.listBestiaryDiscovery(player.playerId)
        : discovery,
      newlyClaimedLocationRewardCodes,
    };
  }

  private async claimQualifiedKillMilestoneRewards(
    playerId: number,
    templates: readonly MobTemplateView[],
    discovery: BestiaryDiscoveryView,
  ): Promise<KillMilestoneClaimView> {
    const victoryCountsByEnemyCode = new Map(
      discovery.enemyVictoryCounts.map(({ enemyCode, victoryCount }) => [enemyCode, victoryCount]),
    );
    const claimedMilestoneKeys = new Set(
      discovery.claimedKillMilestones.map(({ enemyCode, threshold }) => `${enemyCode}:${threshold}`),
    );
    const newlyClaimedKillMilestones: BestiaryKillMilestoneKey[] = [];

    for (const template of templates) {
      const victoryCount = victoryCountsByEnemyCode.get(template.code) ?? 0;

      for (const threshold of bestiaryKillMilestoneThresholds) {
        const milestoneKey = `${template.code}:${threshold}`;
        if (victoryCount < threshold || claimedMilestoneKeys.has(milestoneKey)) {
          continue;
        }

        const result = await this.repository.claimBestiaryEnemyKillMilestoneReward(
          playerId,
          template.code,
          threshold,
          resolveBestiaryKillMilestoneReward(threshold),
        );

        if (result.claimed) {
          newlyClaimedKillMilestones.push({ enemyCode: template.code, threshold });
        }
      }
    }

    return {
      discovery: newlyClaimedKillMilestones.length > 0
        ? await this.repository.listBestiaryDiscovery(playerId)
        : discovery,
      newlyClaimedKillMilestones,
    };
  }
}
