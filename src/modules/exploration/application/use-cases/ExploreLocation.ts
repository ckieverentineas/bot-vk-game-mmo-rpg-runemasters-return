import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import { finalizeRecoveredBattleIfNeeded } from '../../../combat/application/finalize-recovered-battle';
import { BattleEngine } from '../../../combat/domain/battle-engine';
import { buildBattlePlayerSnapshot } from '../../../combat/domain/build-battle-player-snapshot';
import { derivePlayerStats, getEquippedRune, resolveEncounterLocationLevel } from '../../../player/domain/player-stats';
import { requirePlayerById, requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEnemySnapshot, describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from '../../../world/domain/enemy-scaling';

export class ExploreLocation {
  public constructor(
    private readonly repository: GameRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    let currentPlayer = player;
    const activeBattle = await this.repository.getActiveBattle(player.playerId);

    if (activeBattle) {
      const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player, activeBattle, this.random);

      if (!recoveredBattle.recovered) {
        return activeBattle;
      }

      currentPlayer = await requirePlayerById(this.repository, player.playerId);
    }

    const locationLevel = resolveEncounterLocationLevel(currentPlayer);
    const biome = await this.repository.findBiomeForLocationLevel(locationLevel);
    if (!biome) {
      throw new AppError('biome_not_found', 'Для текущего уровня локации не найден биом.');
    }

    const templates = await this.repository.listMobTemplatesForBiome(biome.code);
    const template = pickEncounterTemplate(templates, locationLevel);
    const playerStats = derivePlayerStats(currentPlayer);
    const enemy = buildEnemySnapshot(template, locationLevel);
    const battle = await this.repository.createBattle(currentPlayer.playerId, {
      status: 'ACTIVE',
      battleType: 'PVE',
      actionRevision: 0,
      locationLevel,
      biomeCode: biome.code,
      enemyCode: template.code,
      turnOwner: resolveInitialTurnOwner(playerStats.dexterity, enemy.dexterity),
        player: buildBattlePlayerSnapshot(currentPlayer.playerId, vkId, playerStats, getEquippedRune(currentPlayer)),
      enemy,
      log: [describeEncounter(biome, enemy)],
      result: null,
      rewards: null,
    });

    if (battle.turnOwner === 'ENEMY') {
      const resolved = BattleEngine.resolveEnemyTurn(battle);
      if (resolved.status === 'COMPLETED') {
        const finalized = await this.repository.finalizeBattle(currentPlayer.playerId, resolved);
        return finalized.battle;
      }

      return this.repository.saveBattle(resolved);
    }

    return battle;
  }
}
