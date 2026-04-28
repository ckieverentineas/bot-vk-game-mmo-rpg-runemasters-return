import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  getWorkshopBlueprint,
  type WorkshopBlueprintCode,
  type WorkshopCraftItemBlueprintDefinition,
} from '../../domain/workshop-catalog';
import {
  awakenWorkshopBlueprintFeature,
  canAwakenWorkshopBlueprintFeature,
  workshopBlueprintFeatureAwakeningRadianceCost,
} from '../../domain/workshop-blueprint-instances';
import { buildAwakenWorkshopBlueprintFeatureIntentStateKey } from '../command-intent-state';
import {
  buildWorkshopBlueprintFeatureAwakeningEconomyTelemetryPayload,
  trackWorkshopEconomyTelemetry,
} from '../workshop-economy-telemetry';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView } from '../workshop-persistence';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

export interface AwakenWorkshopBlueprintFeatureSummaryView {
  readonly kind: 'awakened_workshop_blueprint_feature';
  readonly blueprintInstanceId: string;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly title: string;
  readonly changeLine: string;
  readonly nextStepLine: string;
  readonly radianceCost: number;
}

export interface AwakenWorkshopBlueprintFeatureResultView {
  readonly view: WorkshopView;
  readonly awakenedBlueprint: PlayerBlueprintInstanceView;
  readonly acquisitionSummary: AwakenWorkshopBlueprintFeatureSummaryView;
  readonly message: string;
}

type AwakenWorkshopBlueprintFeatureReplayResult =
  | AwakenWorkshopBlueprintFeatureResultView
  | PlayerBlueprintInstanceView;
type WorkshopSnapshotRepository = Pick<GameRepository, 'listPlayerBlueprintInstances' | 'listPlayerCraftedItems'>;
type WorkshopCurrentViewRepository = FindPlayerByVkIdRepository & WorkshopSnapshotRepository;
type AwakenWorkshopBlueprintFeatureRepository = CommandIntentReplayRepository
  & WorkshopCurrentViewRepository
  & Pick<GameRepository, 'awakenWorkshopBlueprintFeature' | 'storeCommandIntentResult'>;

const staleAwakeningMessage = 'Этот жест мастерской уже выцвел. Вернитесь к свежей Мастерской.';
const pendingAwakeningMessage = 'Мастерская еще пробуждает чертеж. Дождитесь ответа.';

const isAwakenWorkshopBlueprintFeatureResult = (
  result: AwakenWorkshopBlueprintFeatureReplayResult,
): result is AwakenWorkshopBlueprintFeatureResultView => 'awakenedBlueprint' in result && 'view' in result;

const requireCraftBlueprint = (blueprintCode: WorkshopBlueprintCode): WorkshopCraftItemBlueprintDefinition => {
  const blueprint = getWorkshopBlueprint(blueprintCode);

  if (blueprint.kind !== 'craft_item') {
    throw new AppError('workshop_blueprint_feature_unavailable', 'Пробуждение доступно только чертежам предметов.');
  }

  return blueprint;
};

const requireAwakenableBlueprintInstance = (
  blueprintInstances: readonly PlayerBlueprintInstanceView[],
  blueprintInstanceId: string,
): {
  readonly instance: PlayerBlueprintInstanceView;
  readonly blueprint: WorkshopCraftItemBlueprintDefinition;
} => {
  const instance = blueprintInstances.find((entry) => entry.id === blueprintInstanceId);

  if (!instance || instance.status !== 'AVAILABLE') {
    throw new AppError('workshop_blueprint_unavailable', 'У вас нет такого доступного чертежа.');
  }

  const blueprint = requireCraftBlueprint(instance.blueprintCode);
  if (!canAwakenWorkshopBlueprintFeature(instance)) {
    throw new AppError(
      'workshop_blueprint_feature_unavailable',
      'Этот чертеж не несет редкой особенности для пробуждения.',
    );
  }

  return { instance, blueprint };
};

const assertRadianceAvailable = (player: PlayerState): void => {
  if (player.radiance < workshopBlueprintFeatureAwakeningRadianceCost) {
    throw new AppError(
      'not_enough_radiance',
      `Для пробуждения нужно сияние: ${workshopBlueprintFeatureAwakeningRadianceCost}.`,
    );
  }
};

const buildAwakeningSummary = (
  blueprint: WorkshopCraftItemBlueprintDefinition,
  awakenedBlueprint: PlayerBlueprintInstanceView,
): AwakenWorkshopBlueprintFeatureSummaryView => ({
  kind: 'awakened_workshop_blueprint_feature',
  blueprintInstanceId: awakenedBlueprint.id,
  blueprintCode: blueprint.code,
  title: 'Особенность пробуждена',
  changeLine: `Чертеж ${blueprint.code} #${awakenedBlueprint.id.slice(0, 8)} пробужден: следующее изделие получит +1 ступень качества.`,
  nextStepLine: 'Теперь можно создать предмет по пробужденному чертежу.',
  radianceCost: workshopBlueprintFeatureAwakeningRadianceCost,
});

const buildAwakeningResult = (
  view: WorkshopView,
  blueprint: WorkshopCraftItemBlueprintDefinition,
  awakenedBlueprint: PlayerBlueprintInstanceView,
): AwakenWorkshopBlueprintFeatureResultView => {
  const acquisitionSummary = buildAwakeningSummary(blueprint, awakenedBlueprint);

  return {
    view,
    awakenedBlueprint,
    acquisitionSummary,
    message: acquisitionSummary.changeLine,
  };
};

const loadWorkshopSnapshot = async (
  repository: WorkshopSnapshotRepository,
  player: PlayerState,
): Promise<{
  readonly player: PlayerState;
  readonly blueprintInstances: readonly PlayerBlueprintInstanceView[];
  readonly craftedItems: readonly PlayerCraftedItemView[];
}> => {
  const [blueprintInstances, craftedItems] = await Promise.all([
    repository.listPlayerBlueprintInstances(player.playerId),
    repository.listPlayerCraftedItems(player.playerId),
  ]);

  return { player, blueprintInstances, craftedItems };
};

const loadCurrentWorkshopView = async (
  repository: WorkshopCurrentViewRepository,
  vkId: number,
): Promise<WorkshopView> => {
  const player = await requirePlayerByVkId(repository, vkId);
  const snapshot = await loadWorkshopSnapshot(repository, player);

  return buildWorkshopView(snapshot.player, snapshot.blueprintInstances, snapshot.craftedItems);
};

const replayAwakenWorkshopBlueprintFeatureResult = async (
  repository: CommandIntentReplayRepository,
  player: PlayerState,
  snapshot: {
    readonly blueprintInstances: readonly PlayerBlueprintInstanceView[];
    readonly craftedItems: readonly PlayerCraftedItemView[];
  },
  intentId: string,
  intentStateKey: string,
): Promise<AwakenWorkshopBlueprintFeatureResultView | null> => {
  return loadCommandIntentReplay<
    AwakenWorkshopBlueprintFeatureResultView,
    AwakenWorkshopBlueprintFeatureReplayResult
  >({
    repository,
    playerId: player.playerId,
    intentId,
    expectedCommandKeys: ['AWAKEN_WORKSHOP_BLUEPRINT_FEATURE'],
    expectedStateKey: intentStateKey,
    pendingMessage: pendingAwakeningMessage,
    mapResult: (result) => {
      if (isAwakenWorkshopBlueprintFeatureResult(result)) {
        return result;
      }

      const blueprint = requireCraftBlueprint(result.blueprintCode);
      const blueprintInstances = snapshot.blueprintInstances.map((instance) => (
        instance.id === result.id ? result : instance
      ));
      const view = buildWorkshopView(player, blueprintInstances, snapshot.craftedItems);
      return buildAwakeningResult(view, blueprint, result);
    },
  });
};

export class AwakenWorkshopBlueprintFeature {
  public constructor(
    private readonly repository: AwakenWorkshopBlueprintFeatureRepository,
    private readonly telemetry?: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    blueprintInstanceId: string,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<AwakenWorkshopBlueprintFeatureResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const resolvedIntent = resolveCommandIntent(intentId, stateKey, intentSource, false);
    if (!resolvedIntent) {
      throw new AppError('stale_command_intent', staleAwakeningMessage);
    }

    const snapshot = await loadWorkshopSnapshot(this.repository, player);
    const currentStateKey = buildAwakenWorkshopBlueprintFeatureIntentStateKey(
      player,
      blueprintInstanceId,
      snapshot.blueprintInstances,
    );
    const replay = await replayAwakenWorkshopBlueprintFeatureResult(
      this.repository,
      player,
      snapshot,
      resolvedIntent.intentId,
      resolvedIntent.intentStateKey,
    );
    if (replay) {
      return replay;
    }

    const intent = assertFreshCommandIntent({
      intent: resolvedIntent,
      intentSource,
      currentStateKey,
      staleMessage: staleAwakeningMessage,
      requireIntent: true,
    });
    const { instance, blueprint } = requireAwakenableBlueprintInstance(
      snapshot.blueprintInstances,
      blueprintInstanceId,
    );
    assertRadianceAvailable(player);

    const awakenedBlueprint = await this.repository.awakenWorkshopBlueprintFeature(
      player.playerId,
      instance.id,
      workshopBlueprintFeatureAwakeningRadianceCost,
      awakenWorkshopBlueprintFeature(instance),
      {
        intentId: intent.intentId,
        intentStateKey: intent.intentStateKey,
        currentStateKey: intentSource === 'legacy_text' ? undefined : currentStateKey,
      },
    );
    const view = await loadCurrentWorkshopView(this.repository, vkId);
    const result = buildAwakeningResult(view, blueprint, awakenedBlueprint);

    await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);
    await trackWorkshopEconomyTelemetry(
      this.telemetry,
      player.userId,
      buildWorkshopBlueprintFeatureAwakeningEconomyTelemetryPayload(
        blueprint,
        workshopBlueprintFeatureAwakeningRadianceCost,
        player.level,
      ),
    );

    return result;
  }
}
