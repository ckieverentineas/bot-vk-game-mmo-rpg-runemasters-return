import { gameBalance } from '../../../config/game-balance';
import { emptyStats } from '../../player/domain/player-stats';
import type { RuneDraft, RuneRarity, RuneView, StatKey } from '../../../shared/types/game';

import { applyRuneArchetype, getRuneArchetype, listRuneArchetypes } from './rune-abilities';
import { getRuneSchoolPresentation } from './rune-schools';

const defaultStatPool: readonly StatKey[] = ['health', 'attack', 'defence', 'magicDefence', 'dexterity', 'intelligence'];
const naturalRarityOrder: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const randomItem = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];

const createArchetypeStatPool = (archetypeCode: string): readonly StatKey[] => {
  const archetype = getRuneArchetype(archetypeCode);

  return [
    ...defaultStatPool,
    ...archetype.preferredStats,
    ...archetype.preferredStats,
  ];
};

export class RuneFactory {
  public static create(locationLevel: number, forcedRarity?: RuneRarity, forcedArchetypeCode?: string): RuneDraft {
    const rarity = forcedRarity ?? this.rollRarity(this.resolveNaturalRarityCap(locationLevel));
    const profile = gameBalance.runes.profiles[rarity];
    const archetype = forcedArchetypeCode ? getRuneArchetype(forcedArchetypeCode) : randomItem(listRuneArchetypes());
    const school = getRuneSchoolPresentation(archetype.code);
    const statPool = createArchetypeStatPool(archetype.code);
    const rune = applyRuneArchetype({
      ...emptyStats(),
      name: `${profile.title} руна ${school?.runeTitle ?? archetype.name}`,
      rarity,
      isEquipped: false,
    }, archetype.code);

    const bonusLines = locationLevel >= 25 && rarity !== 'USUAL' ? 1 : 0;
    const lineCount = profile.lines + bonusLines;

    for (let index = 0; index < lineCount; index += 1) {
      const statKey = randomItem(statPool);
      rune[statKey] += this.rollStatValue(rarity, locationLevel);
    }

    return rune;
  }

  public static rerollStat(rune: RuneDraft | RuneView, statKey: StatKey, locationLevel: number): RuneDraft {
    const nextRune: RuneDraft = {
      runeCode: rune.runeCode,
      archetypeCode: rune.archetypeCode,
      activeAbilityCodes: rune.activeAbilityCodes ? [...rune.activeAbilityCodes] : undefined,
      passiveAbilityCodes: rune.passiveAbilityCodes ? [...rune.passiveAbilityCodes] : undefined,
      name: rune.name,
      rarity: rune.rarity,
      isEquipped: rune.isEquipped,
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    };

    nextRune[statKey] = this.rollStatValue(rune.rarity, locationLevel);
    return nextRune;
  }

  private static rollRarity(maxRarity: RuneRarity): RuneRarity {
    const maxIndex = naturalRarityOrder.indexOf(maxRarity);
    const allowedRarities = naturalRarityOrder.slice(0, maxIndex + 1);
    const entries = allowedRarities.map((rarity) => [rarity, gameBalance.runes.profiles[rarity]] as const);
    const totalWeight = entries.reduce((sum, [, profile]) => sum + profile.weight, 0);
    let roll = randomInt(1, totalWeight);

    for (const [rarity, profile] of entries) {
      roll -= profile.weight;
      if (roll <= 0) {
        return rarity;
      }
    }

    return 'USUAL';
  }

  private static rollStatValue(rarity: RuneRarity, locationLevel: number): number {
    const profile = gameBalance.runes.profiles[rarity];
    const levelBonus = Math.floor(locationLevel / 10);
    return randomInt(1, profile.maxStatRoll + levelBonus);
  }

  private static resolveNaturalRarityCap(locationLevel: number): RuneRarity {
    if (locationLevel >= 120) {
      return 'MYTHICAL';
    }

    if (locationLevel >= 70) {
      return 'LEGENDARY';
    }

    if (locationLevel >= 35) {
      return 'EPIC';
    }

    if (locationLevel >= 15) {
      return 'RARE';
    }

    return 'UNUSUAL';
  }
}
