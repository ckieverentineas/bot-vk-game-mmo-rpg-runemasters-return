import { describeRuneContent } from '../../runes/domain/rune-abilities';
import type { BattlePlayerSnapshot, RuneView, StatBlock } from '../../../shared/types/game';

export const buildBattlePlayerSnapshot = (
  playerId: number,
  vkId: number,
  stats: StatBlock,
  equippedRune: RuneView | null,
): BattlePlayerSnapshot => {
  const runeContent = equippedRune ? describeRuneContent(equippedRune) : null;
  const activeAbility = runeContent?.activeAbilities[0] ?? null;

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
    runeLoadout: equippedRune
      ? {
          runeId: equippedRune.id,
          runeName: equippedRune.name,
          archetypeCode: equippedRune.archetypeCode ?? null,
          archetypeName: runeContent?.archetype?.name ?? null,
          passiveAbilityCodes: [...(equippedRune.passiveAbilityCodes ?? [])],
          activeAbility: activeAbility
            ? {
                code: activeAbility.code,
                name: activeAbility.name,
                manaCost: activeAbility.manaCost,
                cooldownTurns: activeAbility.cooldownTurns,
                currentCooldown: 0,
              }
            : null,
        }
      : null,
    guardPoints: 0,
  };
};
