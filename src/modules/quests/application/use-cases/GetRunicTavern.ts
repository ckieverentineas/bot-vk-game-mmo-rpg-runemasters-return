import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { WorldCatalog } from '../../../world/application/ports/WorldCatalog';
import {
  buildRunicTavernBoardView,
  type RunicTavernBoardView,
  type RunicTavernThreatSource,
} from '../read-models/runic-tavern-board';

type GetRunicTavernRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'listActiveEnemyThreatsForBiome'>;

export class GetRunicTavern {
  public constructor(
    private readonly repository: GetRunicTavernRepository,
    private readonly worldCatalog: WorldCatalog,
  ) {}

  public async execute(vkId: number): Promise<RunicTavernBoardView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const biomes = this.worldCatalog.listBiomes();
    const threatGroups = await Promise.all(
      biomes.map((biome) => this.repository.listActiveEnemyThreatsForBiome(biome.code)),
    );
    const threats: readonly RunicTavernThreatSource[] = threatGroups.flat();

    return buildRunicTavernBoardView({
      player,
      biomes,
      threats,
    });
  }
}
