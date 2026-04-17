import type { BattlePlayerSnapshot, RuneView, StatBlock } from '../../../shared/types/game';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from '../../shared/domain/contracts/loadout-snapshot';

export const buildBattlePlayerSnapshot = (
  playerId: number,
  vkId: number,
  stats: StatBlock,
  equippedRune: RuneView | null,
): BattlePlayerSnapshot => {
  const loadoutSnapshot = buildLoadoutSnapshot(equippedRune);

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
    runeLoadout: projectBattleRuneLoadout(loadoutSnapshot),
    guardPoints: 0,
  };
};
