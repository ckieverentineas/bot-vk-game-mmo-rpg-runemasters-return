import { AppError } from '../../../../shared/domain/AppError';
import type { InventoryDelta, MaterialField, PlayerSkillPointGain, PlayerState } from '../../../../shared/types/game';
import type { AcquisitionSummaryView } from '../../../player/application/read-models/acquisition-summary';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
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
  repository: GameRepository,
  player: PlayerState,
  intentId: string | undefined,
  intentStateKey: string | undefined,
): Promise<CraftItemResultView | null> => {
  if (!intentId) {
    return null;
  }

  const replay = await repository.getCommandIntentResult<CraftItemResultView | PlayerState>(
    player.playerId,
    intentId,
    ['CRAFT_ITEM'],
    intentStateKey,
  );

  if (replay?.status === 'APPLIED' && replay.result) {
    return 'player' in replay.result
      ? replay.result
      : { player: replay.result, acquisitionSummary: null };
  }

  if (replay?.status === 'PENDING') {
    throw new AppError('command_retry_pending', 'Алхимия пилюли ещё в пути. Дождитесь ответа.');
  }

  return null;
};

export class CraftItem {
  public constructor(private readonly repository: GameRepository) {}

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

    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта пилюля уже выцвела. Вернитесь к свежей Мастерской.');
    }

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
