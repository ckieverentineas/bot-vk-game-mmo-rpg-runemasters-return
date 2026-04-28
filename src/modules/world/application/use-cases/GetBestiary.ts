import { AppError } from '../../../../shared/domain/AppError';
import type { BiomeView, MobTemplateView, PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { BestiaryDiscoveryView, GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import type { WorldCatalog } from '../ports/WorldCatalog';
import {
  bestiaryKillMilestoneThresholds,
  buildBestiaryEnemyDetailView,
  buildBestiaryLocationDetailView,
  buildBestiaryOverviewView,
  isBestiaryLocationUnlocked,
  resolveBestiaryKillMilestoneReward,
  resolveBestiaryLocationDiscoveryReward,
  type BestiaryEnemyDetailView,
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

type GetBestiaryRepository = FindPlayerByVkIdRepository & Pick<
  GameRepository,
  | 'claimBestiaryEnemyKillMilestoneReward'
  | 'claimBestiaryLocationDiscoveryReward'
  | 'listBestiaryDiscovery'
>;

export class GetBestiary {
  public constructor(
    private readonly repository: GetBestiaryRepository,
    private readonly worldCatalog: WorldCatalog,
  ) {}

  public async execute(vkId: number, pageNumber = 1): Promise<BestiaryOverviewView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const discovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();

    return buildBestiaryOverviewView({
      biomes,
      listMobTemplatesForBiome: (biomeCode) => this.worldCatalog.listMobTemplatesForBiome(biomeCode),
      discovery,
      requestedPageNumber: pageNumber,
      highestLocationLevel: player.highestLocationLevel,
      claimedLocationRewardCodes: discovery.claimedLocationRewardCodes,
    });
  }

  public async executeLocation(
    vkId: number,
    biomeCode: string,
    enemyPageNumber = 1,
  ): Promise<BestiaryLocationDetailView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const discovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();
    this.requireUnlockedBiome(biomes, biomeCode, player.highestLocationLevel);

    return buildBestiaryLocationDetailView({
      biomeCode,
      biomes,
      listMobTemplatesForBiome: (currentBiomeCode) => this.worldCatalog.listMobTemplatesForBiome(currentBiomeCode),
      discovery,
      highestLocationLevel: player.highestLocationLevel,
      requestedEnemyPageNumber: enemyPageNumber,
      claimedLocationRewardCodes: discovery.claimedLocationRewardCodes,
    });
  }

  public async executeEnemy(
    vkId: number,
    biomeCode: string,
    enemyCode: string,
  ): Promise<BestiaryEnemyDetailView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const discovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();
    const biome = this.requireUnlockedBiome(biomes, biomeCode, player.highestLocationLevel);
    this.requireEnemyTemplate(biome.code, enemyCode);

    return buildBestiaryEnemyDetailView({
      biomeCode: biome.code,
      enemyCode,
      biomes,
      listMobTemplatesForBiome: (currentBiomeCode) => this.worldCatalog.listMobTemplatesForBiome(currentBiomeCode),
      discovery,
      highestLocationLevel: player.highestLocationLevel,
      claimedLocationRewardCodes: discovery.claimedLocationRewardCodes,
    });
  }

  public async claimLocationReward(vkId: number, biomeCode: string): Promise<BestiaryLocationDetailView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const initialDiscovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();
    const biome = this.requireUnlockedBiome(biomes, biomeCode, player.highestLocationLevel);
    const locationDiscoveryClaim = await this.claimUnlockedLocationDiscoveryRewards(
      player,
      [biome],
      biomes,
      initialDiscovery,
    );

    return buildBestiaryLocationDetailView({
      biomeCode: biome.code,
      biomes,
      listMobTemplatesForBiome: (currentBiomeCode) => this.worldCatalog.listMobTemplatesForBiome(currentBiomeCode),
      discovery: locationDiscoveryClaim.discovery,
      highestLocationLevel: player.highestLocationLevel,
      claimedLocationRewardCodes: locationDiscoveryClaim.discovery.claimedLocationRewardCodes,
      newlyClaimedLocationRewardCodes: locationDiscoveryClaim.newlyClaimedLocationRewardCodes,
    });
  }

  public async claimEnemyReward(
    vkId: number,
    biomeCode: string,
    enemyCode: string,
  ): Promise<BestiaryEnemyDetailView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const initialDiscovery = await this.repository.listBestiaryDiscovery(player.playerId);
    const biomes = this.worldCatalog.listBiomes();
    const biome = this.requireUnlockedBiome(biomes, biomeCode, player.highestLocationLevel);
    const template = this.requireEnemyTemplate(biome.code, enemyCode);
    const killMilestoneClaim = await this.claimQualifiedKillMilestoneRewards(
      player.playerId,
      [template],
      initialDiscovery,
    );

    return buildBestiaryEnemyDetailView({
      biomeCode: biome.code,
      enemyCode,
      biomes,
      listMobTemplatesForBiome: (currentBiomeCode) => this.worldCatalog.listMobTemplatesForBiome(currentBiomeCode),
      discovery: killMilestoneClaim.discovery,
      highestLocationLevel: player.highestLocationLevel,
      claimedLocationRewardCodes: killMilestoneClaim.discovery.claimedLocationRewardCodes,
      newlyClaimedKillMilestones: killMilestoneClaim.newlyClaimedKillMilestones,
    });
  }

  private requireBiome(biomes: readonly BiomeView[], biomeCode: string): BiomeView {
    const biome = biomes.find((candidate) => candidate.code === biomeCode);

    if (!biome) {
      throw new AppError('bestiary_location_not_found', 'Такая локация не найдена в бестиарии.');
    }

    return biome;
  }

  private requireUnlockedBiome(
    biomes: readonly BiomeView[],
    biomeCode: string,
    highestLocationLevel: number,
  ): BiomeView {
    const biome = this.requireBiome(biomes, biomeCode);

    if (!isBestiaryLocationUnlocked(biome, highestLocationLevel)) {
      throw new AppError('bestiary_location_locked', 'Эта локация еще закрыта. Продвиньтесь глубже в исследовании.');
    }

    return biome;
  }

  private requireEnemyTemplate(biomeCode: string, enemyCode: string): MobTemplateView {
    const template = this.worldCatalog
      .listMobTemplatesForBiome(biomeCode)
      .find((candidate) => candidate.code === enemyCode);

    if (!template) {
      throw new AppError('bestiary_enemy_not_found', 'Такой след не найден в этой локации.');
    }

    return template;
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
          resolveBestiaryKillMilestoneReward(template, threshold),
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
