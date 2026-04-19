import type { BattlePlayerSnapshot, PlayerState, StatBlock } from '../../../shared/types/game';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from '../../shared/domain/contracts/loadout-snapshot';
import { getPlayerSchoolMasteryForArchetype } from '../../player/domain/school-mastery';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import { getEquippedRune } from '../../player/domain/player-stats';

export const buildBattlePlayerSnapshot = (
  playerId: number,
  vkId: number,
  stats: StatBlock,
  player: Pick<PlayerState, 'runes' | 'schoolMasteries'>,
): BattlePlayerSnapshot => {
  const equippedRune = getEquippedRune(player as PlayerState, 0);
  const supportRune = getEquippedRune(player as PlayerState, 1);
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  const mastery = player ? getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode) : null;
  const loadoutSnapshot = buildLoadoutSnapshot(equippedRune, {
    schoolCode: school?.code ?? null,
    schoolMasteryRank: mastery?.rank ?? 0,
  });
  const supportSchool = getSchoolDefinitionForArchetype(supportRune?.archetypeCode);
  const supportMastery = supportRune ? getPlayerSchoolMasteryForArchetype(player, supportRune.archetypeCode) : null;
  const supportLoadoutSnapshot = buildLoadoutSnapshot(supportRune, {
    schoolCode: supportSchool?.code ?? null,
    schoolMasteryRank: supportMastery?.rank ?? 0,
  });
  const projectedLoadout = projectBattleRuneLoadout(loadoutSnapshot);
  const projectedSupportLoadout = projectBattleRuneLoadout(supportLoadoutSnapshot);

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
    supportRuneLoadout: projectedSupportLoadout,
    guardPoints: 0,
  };
};
