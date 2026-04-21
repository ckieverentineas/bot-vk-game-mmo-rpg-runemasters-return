import type { BattlePlayerSnapshot, PlayerState, StatBlock } from '../../../shared/types/game';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from '../../shared/domain/contracts/loadout-snapshot';
import { getSchoolNovicePathDefinition, hasRuneOfSchoolAtLeastRarity } from '../../player/domain/school-novice-path';
import { getPlayerSchoolMasteryForArchetype } from '../../player/domain/school-mastery';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import { getEquippedRune } from '../../player/domain/player-stats';

const resolveSchoolProgressStage = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string | null | undefined,
  equippedRuneRarity: PlayerState['runes'][number]['rarity'] | undefined,
): 'FIRST_SIGN' | 'SEAL' | null => {
  const novicePath = getSchoolNovicePathDefinition(schoolCode ?? null);
  if (!novicePath || !equippedRuneRarity) {
    return null;
  }

  if (novicePath.minibossRewardRarity && equippedRuneRarity === novicePath.minibossRewardRarity) {
    return 'SEAL';
  }

  if (
    equippedRuneRarity === novicePath.rewardRarity
    && (!novicePath.minibossRewardRarity || !hasRuneOfSchoolAtLeastRarity(player as PlayerState, novicePath.schoolCode, novicePath.minibossRewardRarity))
  ) {
    return 'FIRST_SIGN';
  }

  return null;
};

export const buildBattlePlayerSnapshot = (
  playerId: number,
  vkId: number,
  stats: StatBlock,
  player: Pick<PlayerState, 'runes' | 'schoolMasteries'>,
): BattlePlayerSnapshot => {
  const equippedRune = getEquippedRune(player as PlayerState, 0);
  const secondaryRune = getEquippedRune(player as PlayerState, 1);
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  const mastery = player ? getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode) : null;
  const loadoutSnapshot = buildLoadoutSnapshot(equippedRune, {
    schoolCode: school?.code ?? null,
    schoolMasteryRank: mastery?.rank ?? 0,
    schoolProgressStage: resolveSchoolProgressStage(player, school?.code, equippedRune?.rarity),
  });
  const secondarySchool = getSchoolDefinitionForArchetype(secondaryRune?.archetypeCode);
  const secondaryMastery = secondaryRune ? getPlayerSchoolMasteryForArchetype(player, secondaryRune.archetypeCode) : null;
  const secondaryLoadoutSnapshot = buildLoadoutSnapshot(secondaryRune, {
    schoolCode: secondarySchool?.code ?? null,
    schoolMasteryRank: secondaryMastery?.rank ?? 0,
    schoolProgressStage: resolveSchoolProgressStage(player, secondarySchool?.code, secondaryRune?.rarity),
  });
  const projectedLoadout = projectBattleRuneLoadout(loadoutSnapshot);
  const projectedSecondaryLoadout = projectBattleRuneLoadout(secondaryLoadoutSnapshot);

  return {
    playerId,
    name: `Рунный мастер #${vkId}`,
    attack: stats.attack,
    defence: stats.defence,
    magicDefence: stats.magicDefence,
    dexterity: stats.dexterity,
    intelligence: stats.intelligence,
    maxHealth: stats.health,
    currentHealth: stats.health,
    maxMana: stats.intelligence * 4,
    currentMana: stats.intelligence * 4,
    runeLoadout: projectedLoadout,
    supportRuneLoadout: projectedSecondaryLoadout,
    guardPoints: 0,
  };
};
