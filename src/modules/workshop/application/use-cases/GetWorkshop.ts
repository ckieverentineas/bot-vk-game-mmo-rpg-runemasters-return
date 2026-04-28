import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

type GetWorkshopRepository = FindPlayerByVkIdRepository & Pick<
  GameRepository,
  'listPlayerBlueprintInstances' | 'listPlayerCraftedItems'
>;

export class GetWorkshop {
  public constructor(private readonly repository: GetWorkshopRepository) {}

  public async execute(vkId: number): Promise<WorkshopView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const [blueprintInstances, craftedItems] = await Promise.all([
      this.repository.listPlayerBlueprintInstances(player.playerId),
      this.repository.listPlayerCraftedItems(player.playerId),
    ]);

    return buildWorkshopView(player, blueprintInstances, craftedItems);
  }
}
