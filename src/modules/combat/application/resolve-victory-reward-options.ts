import { gameBalance } from '../../../config/game-balance';
import type { BattleView, PlayerState, RuneRarity } from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import { systemGameRandom } from '../../shared/infrastructure/random/SystemGameRandom';
import { RuneFactory } from '../../runes/domain/rune-factory';
import type { VictoryRewardOptions } from '../domain/reward-engine';

const schoolEliteRewards: Partial<Record<string, { schoolCode: string; archetypeCode: string; rarity: RuneRarity }>> = {
  'ash-seer': {
    schoolCode: 'ember',
    archetypeCode: 'ember',
    rarity: 'UNUSUAL',
  },
  'stonehorn-ram': {
    schoolCode: 'stone',
    archetypeCode: 'stone',
    rarity: 'UNUSUAL',
  },
};

const rarityOrder: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];

const hasRuneOfSchoolAtLeastRarity = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
  minimumRarity: RuneRarity,
): boolean => {
  const minimumIndex = rarityOrder.indexOf(minimumRarity);
  return player.runes.some((rune) => {
    const runeSchoolCode = getSchoolDefinitionForArchetype(rune.archetypeCode)?.code ?? null;
    const runeRarityIndex = rarityOrder.indexOf(rune.rarity);
    return runeSchoolCode === schoolCode && runeRarityIndex >= minimumIndex;
  });
};

export const resolveVictoryRewardOptions = (
  player: Pick<PlayerState, 'tutorialState' | 'runes'>,
  battle: BattleView,
  random: GameRandom = systemGameRandom,
): VictoryRewardOptions => {
  if (
    player.tutorialState === 'ACTIVE'
    && player.runes.length === 0
    && battle.locationLevel === gameBalance.world.introLocationLevel
    && battle.enemy.code === 'training-wisp'
  ) {
    return {
      forcedRune: RuneFactory.create(gameBalance.world.minAdventureLocationLevel, 'UNUSUAL', 'ember', random),
    };
  }

  const schoolEliteReward = schoolEliteRewards[battle.enemy.code];
  if (schoolEliteReward) {
    const currentSchoolCode = battle.player.runeLoadout?.schoolCode
      ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
      ?? null;

    if (
      currentSchoolCode === schoolEliteReward.schoolCode
      && !hasRuneOfSchoolAtLeastRarity(player, schoolEliteReward.schoolCode, schoolEliteReward.rarity)
    ) {
      return {
        forcedRune: RuneFactory.create(
          Math.max(gameBalance.world.minAdventureLocationLevel, battle.locationLevel),
          schoolEliteReward.rarity,
          schoolEliteReward.archetypeCode,
          random,
        ),
      };
    }
  }

  return {};
};
