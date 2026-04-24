import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

type GetWorkshopRepository = FindPlayerByVkIdRepository & Pick<
  GameRepository,
  'listPlayerBlueprints' | 'listPlayerCraftedItems'
>;

export class GetWorkshop {
  public constructor(private readonly repository: GetWorkshopRepository) {}

  public async execute(vkId: number): Promise<WorkshopView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const [blueprints, craftedItems] = await Promise.all([
      this.repository.listPlayerBlueprints(player.playerId),
      this.repository.listPlayerCraftedItems(player.playerId),
    ]);

    return buildWorkshopView(player, blueprints, craftedItems);
  }
}
