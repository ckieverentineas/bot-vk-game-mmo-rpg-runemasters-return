import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import { BattleEngine } from '../../../combat/domain/battle-engine';
import { recoverInvalidActiveBattle } from '../../../combat/domain/recover-active-battle';
import { RewardEngine } from '../../../combat/domain/reward-engine';
import { derivePlayerStats, resolveEncounterLocationLevel } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEnemySnapshot, buildPlayerSnapshot, describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from '../../../world/domain/enemy-scaling';

export class ExploreLocation {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    let currentPlayer = player;
    const activeBattle = await this.repository.getActiveBattle(player.playerId);
    if (activeBattle) {
      const recoveredBattle = recoverInvalidActiveBattle(activeBattle);
      if (!recoveredBattle) {
        return activeBattle;
      }

      const rewardedRecoveredBattle = recoveredBattle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(recoveredBattle)
        : { battle: recoveredBattle, droppedRune: null };

      await this.repository.finalizeBattle(player.playerId, rewardedRecoveredBattle.battle, rewardedRecoveredBattle.droppedRune);

      const refreshedPlayer = await this.repository.findPlayerById(player.playerId);
      if (!refreshedPlayer) {
        throw new AppError('player_not_found', 'Игрок не найден. Нажмите «начать», чтобы создать персонажа.');
      }

      currentPlayer = refreshedPlayer;
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
      locationLevel,
      biomeCode: biome.code,
      enemyCode: template.code,
      turnOwner: resolveInitialTurnOwner(playerStats.dexterity, enemy.dexterity),
      player: buildPlayerSnapshot(currentPlayer.playerId, vkId, playerStats),
      enemy,
      log: [describeEncounter(biome, enemy)],
      result: null,
      rewards: null,
    });

    if (battle.turnOwner === 'ENEMY') {
      const resolved = BattleEngine.resolveEnemyTurn(battle);
      if (resolved.status === 'COMPLETED') {
        await this.repository.finalizeBattle(currentPlayer.playerId, resolved, null);
        return resolved;
      }

      return this.repository.saveBattle(resolved);
    }

    return battle;
  }
}
