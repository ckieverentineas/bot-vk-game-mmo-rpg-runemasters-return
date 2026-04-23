import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../ports/WorldCatalog';
import { buildBestiaryView, type BestiaryView } from '../../domain/bestiary';

export class GetBestiary {
  public constructor(
    private readonly repository: GameRepository,
    private readonly worldCatalog: WorldCatalog,
  ) {}

  public async execute(vkId: number, pageNumber = 1): Promise<BestiaryView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const discovery = await this.repository.listBestiaryDiscovery(player.playerId);

    return buildBestiaryView(
      this.worldCatalog.listBiomes(),
      (biomeCode) => this.worldCatalog.listMobTemplatesForBiome(biomeCode),
      discovery,
      pageNumber,
    );
  }
}
