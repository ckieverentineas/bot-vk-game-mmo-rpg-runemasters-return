import { AppError } from '../../../../shared/domain/AppError';
import type {
  BattlePartyMemberSnapshot,
  BattleView,
  BiomeView,
  MobTemplateView,
  PartyView,
  PlayerState,
  StatBlock,
} from '../../../../shared/types/game';
import { BattleEngine } from '../../../combat/domain/battle-engine';
import { createBattleEncounter, isBattleEncounterOffered } from '../../../combat/domain/battle-encounter';
import { buildBattlePlayerSnapshot } from '../../../combat/domain/build-battle-player-snapshot';
import {
  addStats,
  derivePlayerStats,
  resolveEncounterLocationLevel,
} from '../../../player/domain/player-stats';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { PlayerCraftedItemView } from '../../../workshop/application/workshop-persistence';
import {
  resolveWorkshopEquipmentStatBonus,
  type WorkshopEquippedItemView,
} from '../../../workshop/domain/workshop-catalog';
import type { WorldCatalog } from '../../../world/application/ports/WorldCatalog';
import {
  type ExplorationRoamingTemplatePool,
  resolveExplorationBattleOutcome,
  resolveExplorationSchoolCode,
} from '../../../exploration/domain/exploration-outcome';

interface PartyMemberBattleContext {
  readonly player: PlayerState;
  readonly workshopItems: readonly WorkshopEquippedItemView[];
}

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

export class ExploreParty {
  public constructor(
    private readonly repository: GameRepository,
    private readonly worldCatalog: WorldCatalog,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number): Promise<BattleView> {
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

    const locationLevel = resolveEncounterLocationLevel(leader);
    const currentSchoolCode = resolveExplorationSchoolCode(leader);
    const biome = this.worldCatalog.findBiomeForLocationLevel(locationLevel);
    if (!biome) {
      throw new AppError('biome_not_found', 'Для текущего уровня локации не найден биом.');
    }

    const leaderContext = memberContexts.find((member) => member.player.playerId === leader.playerId);
    if (!leaderContext) {
      throw new AppError('party_member_not_found', 'Лидер не найден в собственном отряде.');
    }

    const outcome = resolveExplorationBattleOutcome({
      player: leader,
      biome,
      templates: this.worldCatalog.listMobTemplatesForBiome(biome.code),
      roamingTemplatePools: buildRoamingTemplatePools(this.worldCatalog, biome, locationLevel, {
        suppressHigherBiomeRoaming: leader.defeatStreak > 0,
      }),
      currentSchoolCode,
      locationLevel,
      workshopItems: leaderContext.workshopItems,
    }, this.random);

    const partyMembers = memberContexts.map((member) => {
      const stats = resolveMemberBattleStats(member, leader.playerId, outcome.playerStats);
      const snapshot = buildBattlePlayerSnapshot(
        member.player.playerId,
        member.player.vkId,
        stats,
        member.player,
        member.workshopItems,
        { applyWorkshopStatBonus: false },
      );

      return {
        playerId: member.player.playerId,
        vkId: member.player.vkId,
        name: snapshot.name,
        snapshot,
      } satisfies BattlePartyMemberSnapshot;
    });

    const leaderSnapshot = partyMembers.find((member) => member.playerId === leader.playerId)?.snapshot;
    if (!leaderSnapshot) {
      throw new AppError('party_member_not_found', 'Лидер не найден в боевой группе.');
    }

    const shouldOfferEncounterChoice = outcome.locationLevel > 0;
    const encounter = shouldOfferEncounterChoice
      ? createBattleEncounter(leaderSnapshot, outcome.enemy, outcome.turnOwner, outcome.encounterVariant)
      : null;
    const turnOwner = encounter ? 'PLAYER' : outcome.turnOwner;
    const battle = await this.repository.startPartyBattle(leader.playerId, party.id, {
      status: 'ACTIVE',
      battleType: 'PARTY_PVE',
      actionRevision: 0,
      locationLevel: outcome.locationLevel,
      biomeCode: outcome.biome.code,
      enemyCode: outcome.template.code,
      turnOwner,
      player: leaderSnapshot,
      enemy: outcome.enemy,
      party: {
        id: party.id,
        inviteCode: party.inviteCode,
        leaderPlayerId: leader.playerId,
        currentTurnPlayerId: turnOwner === 'PLAYER' ? leader.playerId : null,
        enemyTargetPlayerId: null,
        actedPlayerIds: [],
        members: partyMembers,
      },
      encounter,
      log: outcome.openingLog,
      result: null,
      rewards: null,
    });

    if (!isBattleEncounterOffered(battle) && battle.turnOwner === 'ENEMY') {
      const resolved = BattleEngine.resolveEnemyTurn(battle);
      if (resolved.status === 'COMPLETED') {
        const finalized = await this.repository.finalizeBattle(leader.playerId, resolved);
        return finalized.battle;
      }

      return this.repository.saveBattle(resolved, { actingPlayerId: leader.playerId });
    }

    return battle;
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
