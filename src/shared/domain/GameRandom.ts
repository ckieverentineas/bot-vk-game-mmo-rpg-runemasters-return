export interface GameRandom {
  nextInt(min: number, max: number): number;
  rollPercentage(chancePercent: number): boolean;
  pickOne<T>(items: readonly T[]): T;
}
