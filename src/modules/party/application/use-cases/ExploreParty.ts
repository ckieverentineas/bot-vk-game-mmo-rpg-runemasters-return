import { AppError } from '../../../../shared/domain/AppError';
import type {
  BattleView,
  BiomeView,
  MobTemplateView,
  PartyView,
  PlayerState,
  StatBlock,
} from '../../../../shared/types/game';
import {
  buildPartyExplorationBattleStart,
  resolveStartedExplorationBattleEnemyTurn,
  type PartyExplorationBattleMemberContext,
} from '../../../exploration/application/exploration-battle-start';
import { persistExplorationSceneEffectResult } from '../../../exploration/application/exploration-event-effects';
import {
  addStats,
  derivePlayerStats,
  resolveEncounterLocationLevel,
} from '../../../player/domain/player-stats';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  FindPlayerByIdRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import type { PlayerCraftedItemView } from '../../../workshop/application/workshop-persistence';
import {
  resolveWorkshopEquipmentStatBonus,
  type WorkshopEquippedItemView,
} from '../../../workshop/domain/workshop-catalog';
import type { WorldCatalog } from '../../../world/application/ports/WorldCatalog';
import {
  type ExplorationBattleOutcome,
  type ExplorationRoamingTemplatePool,
  resolveExplorationOutcome,
  resolveExplorationSchoolCode,
} from '../../../exploration/domain/exploration-outcome';
import {
  buildEnemyKnowledgeSnapshot,
  mergeEnemyKnowledgeSnapshots,
} from '../../../world/domain/enemy-knowledge';
import {
  type ExplorationSceneView,
} from '../../../world/domain/exploration-events';

interface PartyMemberBattleContext {
  readonly player: PlayerState;
  readonly workshopItems: readonly WorkshopEquippedItemView[];
}

export interface ExplorePartyEventMemberResult {
  readonly player: PlayerState;
}

export interface ExplorePartyEventResult {
  readonly event: ExplorationSceneView;
  readonly player: PlayerState;
  readonly party: PartyView;
  readonly members: readonly ExplorePartyEventMemberResult[];
}

export type ExplorePartyResult = BattleView | ExplorePartyEventResult;

export const isExplorePartyEventResult = (result: ExplorePartyResult): result is ExplorePartyEventResult => (
  'event' in result
);

const toWorkshopEquippedItem = (item: PlayerCraftedItemView): WorkshopEquippedItemView => ({
  id: item.id,
  code: item.itemCode,
  itemClass: item.itemClass,
  slot: item.slot,
  status: item.status,
  equipped: item.equipped,
  durability: item.durability,
  maxDurability: item.maxDurability,
});

const lowerBiomeRoamingChancePercent = 10;
const higherBiomeRoamingChancePercent = 2;
const higherBiomeRoamingMinLocationLevel = 10;

const resolveHigherBiomeRoamingChancePercent = (locationLevel: number): number => (
  locationLevel >= higherBiomeRoamingMinLocationLevel
    ? higherBiomeRoamingChancePercent
    : 0
);

const sortBiomesByLevel = (biomes: readonly BiomeView[]): BiomeView[] => (
  [...biomes].sort((left, right) => (
    left.minLevel - right.minLevel
    || left.maxLevel - right.maxLevel
    || left.code.localeCompare(right.code)
  ))
);

const listRoamingMobTemplates = (
  worldCatalog: WorldCatalog,
  biome: BiomeView | undefined,
): readonly MobTemplateView[] => (
  biome
    ? worldCatalog.listMobTemplatesForBiome(biome.code).filter((template) => !template.isBoss)
    : []
);

const buildRoamingTemplatePools = (
  worldCatalog: WorldCatalog,
  currentBiome: BiomeView,
  locationLevel: number,
  options: { readonly suppressHigherBiomeRoaming?: boolean } = {},
): readonly ExplorationRoamingTemplatePool[] => {
  const biomes = sortBiomesByLevel(worldCatalog.listBiomes());
  const currentIndex = biomes.findIndex((biome) => biome.code === currentBiome.code);
  if (currentIndex < 0) {
    return [];
  }

  const lowerBiome = biomes
    .slice(0, currentIndex)
    .reverse()
    .find((biome) => biome.minLevel > 0);
  const higherBiome = biomes[currentIndex + 1];

  return [
    {
      biome: lowerBiome,
      templates: listRoamingMobTemplates(worldCatalog, lowerBiome),
      chancePercent: lowerBiomeRoamingChancePercent,
      direction: 'LOWER_BIOME',
    },
    {
      biome: higherBiome,
      templates: listRoamingMobTemplates(worldCatalog, higherBiome),
      chancePercent: options.suppressHigherBiomeRoaming
        ? 0
        : resolveHigherBiomeRoamingChancePercent(locationLevel),
      direction: 'HIGHER_BIOME',
    },
  ].filter((pool): pool is ExplorationRoamingTemplatePool => (
    pool.biome !== undefined && pool.templates.length > 0
  ));
};

const resolveMemberBattleStats = (
  member: PartyMemberBattleContext,
  leaderPlayerId: number,
  leaderStats: StatBlock,
): StatBlock => (
  member.player.playerId === leaderPlayerId
    ? leaderStats
    : addStats(
        derivePlayerStats(member.player),
        resolveWorkshopEquipmentStatBonus(member.workshopItems),
      )
);

const partyLocationLevelSetbackAllowance = 1;

const resolvePartyEncounterLocationLevel = (leader: PlayerState): number => {
  const adaptiveLocationLevel = resolveEncounterLocationLevel(leader);
  if (leader.defeatStreak > 0) {
    return adaptiveLocationLevel;
  }

  return Math.max(
    adaptiveLocationLevel,
    leader.highestLocationLevel - partyLocationLevelSetbackAllowance,
  );
};

const resolvePartyNormalEncounterCursor = (leader: PlayerState): number => leader.mobsKilled;

type ExplorePartyRepository = FindPlayerByVkIdRepository
  & FindPlayerByIdRepository
  & Pick<
    GameRepository,
    | 'finalizeBattle'
    | 'getActiveBattle'
    | 'getActiveParty'
    | 'listPlayerCraftedItems'
    | 'recordInventoryDeltaResult'
    | 'recordPlayerVitalsResult'
    | 'saveBattle'
    | 'startPartyBattle'
  >
  & Partial<Pick<GameRepository, 'listBestiaryDiscovery'>>;

export class ExploreParty {
  public constructor(
    private readonly repository: ExplorePartyRepository,
    private readonly worldCatalog: WorldCatalog,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number): Promise<ExplorePartyResult> {
    const leader = await requirePlayerByVkId(this.repository, vkId);
    const party = await this.repository.getActiveParty(leader.playerId);
    if (!party) {
      throw new AppError('party_not_found', 'Сначала создайте отряд и пригласите второго мастера.');
    }

    if (party.leaderPlayerId !== leader.playerId) {
      throw new AppError('party_leader_required', 'Отрядный выход начинает лидер отряда.');
    }

    if (party.activeBattleId) {
      const activeBattle = await this.repository.getActiveBattle(leader.playerId);
      if (activeBattle) {
        return activeBattle;
      }
    }

    if (party.members.length < party.maxMembers) {
      throw new AppError('party_not_ready', 'Для отрядного выхода нужен второй мастер.');
    }

    if (leader.tutorialState === 'ACTIVE') {
      throw new AppError('party_tutorial_active', 'Сначала завершите обучение и выйдите в приключения.');
    }

    const memberContexts = await this.loadPartyMemberContexts(party);
    const busyMember = memberContexts.find((member) => member.player.activeBattleId !== null);
    if (busyMember) {
      throw new AppError('party_member_busy', `${busyMember.player.vkId} уже занят боем.`);
    }

    const locationLevel = resolvePartyEncounterLocationLevel(leader);
    const currentSchoolCode = resolveExplorationSchoolCode(leader);
    const biome = this.worldCatalog.findBiomeForLocationLevel(locationLevel);
    if (!biome) {
      throw new AppError('biome_not_found', 'Для текущего уровня локации не найден биом.');
    }

    const leaderContext = memberContexts.find((member) => member.player.playerId === leader.playerId);
    if (!leaderContext) {
      throw new AppError('party_member_not_found', 'Лидер не найден в собственном отряде.');
    }

    const outcome = resolveExplorationOutcome({
      player: leader,
      biome,
      templates: this.worldCatalog.listMobTemplatesForBiome(biome.code),
      roamingTemplatePools: buildRoamingTemplatePools(this.worldCatalog, biome, locationLevel, {
        suppressHigherBiomeRoaming: leader.defeatStreak > 0,
      }),
      currentSchoolCode,
      locationLevel,
      workshopItems: leaderContext.workshopItems,
      normalEncounterCursor: resolvePartyNormalEncounterCursor(leader),
    }, this.random);

    if (outcome.kind === 'event') {
      return this.persistPartyExplorationEventResult(party, memberContexts, leader, outcome.event);
    }

    return this.startPartyBattleFromOutcome(party, memberContexts, leader, outcome);
  }

  private async startPartyBattleFromOutcome(
    party: PartyView,
    memberContexts: readonly PartyMemberBattleContext[],
    leader: PlayerState,
    outcome: ExplorationBattleOutcome,
  ): Promise<BattleView> {
    const members = memberContexts.map((member) => ({
      player: member.player,
      stats: resolveMemberBattleStats(member, leader.playerId, outcome.playerStats),
      workshopItems: member.workshopItems,
    } satisfies PartyExplorationBattleMemberContext));

    const enemy = await this.attachPartyEnemyKnowledge(memberContexts, outcome.enemy);
    const { input } = buildPartyExplorationBattleStart({
      party,
      leader,
      outcome,
      enemy,
      members,
      offerEncounterChoice: outcome.locationLevel > 0,
    });
    const battle = await this.repository.startPartyBattle(leader.playerId, party.id, input);

    return resolveStartedExplorationBattleEnemyTurn({
      repository: this.repository,
      random: this.random,
      battle,
      playerId: leader.playerId,
      saveOptions: { actingPlayerId: leader.playerId },
    });
  }

  private async attachPartyEnemyKnowledge(
    memberContexts: readonly PartyMemberBattleContext[],
    enemy: BattleView['enemy'],
  ): Promise<BattleView['enemy']> {
    if (!this.repository.listBestiaryDiscovery) {
      return enemy;
    }

    const snapshots = await Promise.all(memberContexts.map(async (member) => (
      buildEnemyKnowledgeSnapshot(
        enemy.code,
        await this.repository.listBestiaryDiscovery!(member.player.playerId),
      )
    )));
    const knowledge = mergeEnemyKnowledgeSnapshots(snapshots);

    return knowledge ? { ...enemy, knowledge } : enemy;
  }

  private async persistPartyExplorationEventResult(
    party: PartyView,
    memberContexts: readonly PartyMemberBattleContext[],
    leader: PlayerState,
    event: ExplorationSceneView,
  ): Promise<ExplorePartyEventResult> {
    const members = await Promise.all(memberContexts.map(async (member) => ({
      player: await this.applyPartyExplorationEventEffect(member.player, event),
    } satisfies ExplorePartyEventMemberResult)));
    const resultPlayer = members.find((member) => member.player.playerId === leader.playerId)?.player;

    return {
      event,
      player: resultPlayer ?? leader,
      party,
      members,
    };
  }

  private async applyPartyExplorationEventEffect(
    player: PlayerState,
    event: ExplorationSceneView,
  ): Promise<PlayerState> {
    return await persistExplorationSceneEffectResult({
      repository: this.repository,
      player,
      event,
      options: { commandKey: 'EXPLORE_PARTY' },
      buildResult: (updatedPlayer) => updatedPlayer,
    }) ?? player;
  }

  private async loadPartyMemberContexts(party: PartyView): Promise<readonly PartyMemberBattleContext[]> {
    const contexts = await Promise.all(party.members.map(async (member) => {
      const player = await this.repository.findPlayerById(member.playerId);
      if (!player) {
        throw new AppError('party_member_not_found', 'Один из участников отряда уже не найден.');
      }

      return {
        player,
        workshopItems: await this.listWorkshopItems(player.playerId),
      };
    }));

    return contexts;
  }

  private async listWorkshopItems(playerId: number): Promise<readonly WorkshopEquippedItemView[]> {
    const craftedItems = await this.repository.listPlayerCraftedItems(playerId);
    return craftedItems.map(toWorkshopEquippedItem);
  }
}
