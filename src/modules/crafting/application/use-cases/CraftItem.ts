import { AppError } from '../../../../shared/domain/AppError';
import type { InventoryDelta, MaterialField, PlayerSkillPointGain, PlayerState } from '../../../../shared/types/game';
import type { AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { alchemySkillCode, formatAlchemyConsumableEffect } from '../../../consumables/domain/alchemy-consumables';
import { buildCraftingIntentStateKey } from '../command-intent-state';
import {
  canPayCraftingRecipe,
  getCraftingRecipe,
  resolveCraftingRecipeConsumableDelta,
  resolveCraftingRecipeCost,
  resolveCraftingRecipeInventoryDelta,
  resolveCraftingRecipeMissingCost,
  resolveCraftingRecipeOutput,
  type CraftingRecipeCode,
  type CraftingRecipeCost,
  type CraftingRecipeDefinition,
  type CraftingRecipeOutput,
} from '../../domain/crafting-recipes';

export interface CraftItemResultView {
  readonly player: PlayerState;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
}

const materialTitles: Readonly<Record<MaterialField, string>> = {
  leather: 'кожа',
  bone: 'кость',
  herb: 'трава',
  essence: 'эссенция',
  metal: 'металл',
  crystal: 'кристалл',
};
const craftItemPendingMessage = 'Алхимия пилюли ещё в пути. Дождитесь ответа.';
const craftItemStaleMessage = 'Эта пилюля уже выцвела. Вернитесь к свежей Мастерской.';

type CraftItemRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'craftPlayerConsumable' | 'storeCommandIntentResult'>;

const formatCraftingCost = (cost: CraftingRecipeCost): string => {
  const parts = Object.entries(cost)
    .filter(([, amount]) => amount !== undefined && amount > 0)
    .map(([field, amount]) => `${materialTitles[field as MaterialField]} ${amount}`);

  return parts.length > 0 ? parts.join(', ') : 'без материалов';
};

const buildAlchemySkillGain = (recipe: CraftingRecipeDefinition): readonly PlayerSkillPointGain[] => [
  {
    skillCode: alchemySkillCode,
    points: recipe.skillExperience,
  },
];

const buildCraftingSummary = (
  recipe: CraftingRecipeDefinition,
  cost: CraftingRecipeCost,
  output: CraftingRecipeOutput,
): AcquisitionSummaryView => ({
  kind: 'consumable_crafted',
  title: `Алхимия: ${recipe.title} x${output.quantity}`,
  changeLine: `${recipe.resultLine} Эффект: ${formatAlchemyConsumableEffect(output.consumable.effect)}. Потрачено: ${formatCraftingCost(cost)}.`,
  nextStepLine: 'Пилюлю можно выпить в бою или оставить для восстановления между встречами.',
});

const replayCraftItemResult = async (
  repository: CommandIntentReplayRepository,
  player: PlayerState,
  intentId: string | undefined,
  intentStateKey: string | undefined,
): Promise<CraftItemResultView | null> => {
  return loadCommandIntentReplay<CraftItemResultView, CraftItemResultView | PlayerState>({
    repository,
    playerId: player.playerId,
    intentId,
    expectedCommandKeys: ['CRAFT_ITEM'],
    expectedStateKey: intentStateKey,
    pendingMessage: craftItemPendingMessage,
    mapResult: (result) => (
      'player' in result ? result : { player: result, acquisitionSummary: null }
    ),
  });
};

export class CraftItem {
  public constructor(private readonly repository: CraftItemRepository) {}

  public async execute(
    vkId: number,
    recipeCode: CraftingRecipeCode,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<CraftItemResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const recipe = getCraftingRecipe(recipeCode);
    const currentStateKey = buildCraftingIntentStateKey(player, recipe.code);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    const replay = await replayCraftItemResult(this.repository, player, intent?.intentId, intent?.intentStateKey);
    if (replay) {
      return replay;
    }

    if (!canPayCraftingRecipe(player, recipe)) {
      throw new AppError(
        'not_enough_crafting_resources',
        `Для алхимии «${recipe.title}» не хватает: ${formatCraftingCost(resolveCraftingRecipeMissingCost(player, recipe))}.`,
      );
    }

    assertFreshCommandIntent({
      intent,
      intentSource,
      currentStateKey,
      staleMessage: craftItemStaleMessage,
    });

    const cost = resolveCraftingRecipeCost(recipe);
    const output = resolveCraftingRecipeOutput(player, recipe);
    const updatedPlayer = await this.repository.craftPlayerConsumable(
      player.playerId,
      resolveCraftingRecipeInventoryDelta(recipe) as InventoryDelta,
      resolveCraftingRecipeConsumableDelta(player, recipe) as InventoryDelta,
      buildAlchemySkillGain(recipe),
      intent?.intentId,
      intent?.intentStateKey,
      intentSource === 'legacy_text' ? undefined : intent ? currentStateKey : undefined,
    );
    const result = {
      player: updatedPlayer,
      acquisitionSummary: buildCraftingSummary(recipe, cost, output),
    };

    if (intent?.intentId) {
      await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);
    }

    return result;
  }
}
