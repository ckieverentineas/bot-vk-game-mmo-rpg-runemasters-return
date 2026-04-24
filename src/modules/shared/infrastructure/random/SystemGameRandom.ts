import type { GameRandom } from '../../../../shared/domain/GameRandom';

const nextInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export class SystemGameRandom implements GameRandom {
  public nextInt(min: number, max: number): number {
    return nextInt(min, max);
  }

  public rollPercentage(chancePercent: number): boolean {
    return Math.random() * 100 <= chancePercent;
  }

  public pickOne<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)]!;
  }
}
