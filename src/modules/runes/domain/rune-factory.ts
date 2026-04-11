import { gameBalance } from '../../../config/game-balance';
import { emptyStats } from '../../player/domain/player-stats';
import type { RuneDraft, RuneRarity, RuneView, StatKey } from '../../../shared/types/game';

const statPool: StatKey[] = ['health', 'attack', 'defence', 'magicDefence', 'dexterity', 'intelligence'];

const runeThemes: Record<StatKey, string[]> = {
  health: ['Живучести', 'Крови', 'Стойкости'],
  attack: ['Натиска', 'Клинка', 'Ярости'],
  defence: ['Щита', 'Оплота', 'Камня'],
  magicDefence: ['Покрова', 'Завесы', 'Печати'],
  dexterity: ['Ветра', 'Шага', 'Рывка'],
  intelligence: ['Разума', 'Эха', 'Тайны'],
};

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const randomItem = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];

export class RuneFactory {
  public static create(locationLevel: number, forcedRarity?: RuneRarity): RuneDraft {
    const rarity = forcedRarity ?? this.rollRarity();
    const profile = gameBalance.runes.profiles[rarity];
    const rune: RuneDraft = {
      ...emptyStats(),
      name: profile.title,
      rarity,
      isEquipped: false,
    };

    const bonusLines = locationLevel >= 25 && rarity !== 'USUAL' ? 1 : 0;
    const lineCount = profile.lines + bonusLines;

    for (let index = 0; index < lineCount; index += 1) {
      const statKey = randomItem(statPool);
      rune[statKey] += this.rollStatValue(rarity, locationLevel);
    }

    const dominantStat = this.resolveDominantStat(rune);
    rune.name = `${profile.title} ${randomItem(runeThemes[dominantStat])}`;

    return rune;
  }

  public static rerollStat(rune: RuneDraft | RuneView, statKey: StatKey, locationLevel: number): RuneDraft {
    const nextRune: RuneDraft = {
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

  private static rollRarity(): RuneRarity {
    const entries = Object.entries(gameBalance.runes.profiles) as Array<[RuneRarity, typeof gameBalance.runes.profiles[RuneRarity]]>;
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

  private static resolveDominantStat(rune: RuneDraft): StatKey {
    return statPool.reduce<StatKey>((best, current) => (rune[current] > rune[best] ? current : best), 'attack');
  }
}

