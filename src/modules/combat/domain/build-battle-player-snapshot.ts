import type { BattlePlayerSnapshot, RuneView, StatBlock } from '../../../shared/types/game';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from '../../shared/domain/contracts/loadout-snapshot';
import { getPlayerSchoolMasteryForArchetype } from '../../player/domain/school-mastery';
import type { PlayerState } from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';

export const buildBattlePlayerSnapshot = (
  playerId: number,
  vkId: number,
  stats: StatBlock,
  equippedRune: RuneView | null,
  player?: Pick<PlayerState, 'schoolMasteries'>,
): BattlePlayerSnapshot => {
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  const mastery = player ? getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode) : null;
  const loadoutSnapshot = buildLoadoutSnapshot(equippedRune, {
    schoolCode: school?.code ?? null,
    schoolMasteryRank: mastery?.rank ?? 0,
  });
  const projectedLoadout = projectBattleRuneLoadout(loadoutSnapshot);

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
    guardPoints: 0,
  };
};
