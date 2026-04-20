import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import { finalizeRecoveredBattleIfNeeded } from '../../../combat/application/finalize-recovered-battle';
import { BattleEngine } from '../../../combat/domain/battle-engine';
import { buildBattlePlayerSnapshot } from '../../../combat/domain/build-battle-player-snapshot';
import { derivePlayerStats, getEquippedRune, resolveEncounterLocationLevel } from '../../../player/domain/player-stats';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEnemySnapshot, describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from '../../../world/domain/enemy-scaling';

import { buildExploreLocationIntentStateKey } from '../command-intent-state';

export class ExploreLocation {
  public constructor(
    private readonly repository: GameRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<BattleView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const commandKey = 'EXPLORE_LOCATION' as const;
    const scopedIntent = intentSource === 'legacy_text'
      ? null
      : resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (scopedIntent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleView>(
        player.playerId,
        scopedIntent.intentId,
        [commandKey],
        scopedIntent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<BattleView>(
        player.playerId,
        intentId,
        [commandKey],
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const intent = intentSource === 'legacy_text'
      ? resolveCommandIntent(intentId, undefined, intentSource, false)
      : scopedIntent;
    const recoveryCommandOptions = intent
      ? {
          commandKey,
          intentId: intent.intentId,
          intentStateKey: intent.intentStateKey,
          currentStateKey: intent.intentStateKey,
        } as const
      : undefined;

    const activeBattle = await this.repository.getActiveBattle(player.playerId);

    if (activeBattle) {
      const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player, activeBattle, this.random, recoveryCommandOptions);
      return recoveredBattle.recovered ? recoveredBattle.battle : activeBattle;
    }

    const currentStateKey = buildExploreLocationIntentStateKey(player);
    const scopedCreateIntent = intentSource === 'legacy_text'
      ? { intentId: resolveCommandIntent(intentId, undefined, intentSource, false)?.intentId as string, intentStateKey: currentStateKey }
      : scopedIntent;

    if (intentSource !== 'legacy_text' && scopedCreateIntent && scopedCreateIntent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Я вернул актуальный контекст приключения.');
    }

    const commandOptions = {
      commandKey,
      intentId: scopedCreateIntent?.intentId,
      intentStateKey: scopedCreateIntent?.intentStateKey,
      currentStateKey,
    } as const;

    const currentPlayer = player;

    const locationLevel = resolveEncounterLocationLevel(currentPlayer);
    const currentSchoolCode = getSchoolDefinitionForArchetype(getEquippedRune(currentPlayer)?.archetypeCode)?.code ?? null;
    const biome = await this.repository.findBiomeForLocationLevel(locationLevel);
    if (!biome) {
      throw new AppError('biome_not_found', 'Для текущего уровня локации не найден биом.');
    }

    const templates = await this.repository.listMobTemplatesForBiome(biome.code);
    const template = pickEncounterTemplate(templates, locationLevel, currentSchoolCode, this.random);
    const playerStats = derivePlayerStats(currentPlayer);
    const enemy = buildEnemySnapshot(template, locationLevel);
    const turnOwner = resolveInitialTurnOwner(playerStats.dexterity, enemy.dexterity);
    const battle = await this.repository.createBattle(currentPlayer.playerId, {
      status: 'ACTIVE',
      battleType: 'PVE',
      actionRevision: 0,
      locationLevel,
      biomeCode: biome.code,
      enemyCode: template.code,
      turnOwner,
      player: buildBattlePlayerSnapshot(currentPlayer.playerId, vkId, playerStats, currentPlayer),
      enemy,
      log: [describeEncounter(biome, enemy, currentSchoolCode)],
      result: null,
      rewards: null,
    }, turnOwner === 'PLAYER' ? commandOptions : undefined);

    if (battle.turnOwner === 'ENEMY') {
      const resolved = BattleEngine.resolveEnemyTurn(battle);
      if (resolved.status === 'COMPLETED') {
        const finalized = await this.repository.finalizeBattle(currentPlayer.playerId, resolved, commandOptions);
        return finalized.battle;
      }

      return this.repository.saveBattle(resolved, commandOptions);
    }

    return battle;
  }
}
