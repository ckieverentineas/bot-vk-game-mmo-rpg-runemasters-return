import type { BattleEnemyIntentCode } from '../types/game';

export type EnemyTacticalPatternCode = BattleEnemyIntentCode | 'BASIC_PRESSURE';

export interface EnemyTacticalProfileInput {
  readonly kind: string;
  readonly isElite: boolean;
  readonly isBoss: boolean;
}

export interface EnemyTacticalProfile {
  readonly code: EnemyTacticalPatternCode;
  readonly habitLine: string;
  readonly answerLine: string;
}

const heavyStrikeEnemyKinds = new Set<string>([
  'wolf',
  'boar',
  'goblin',
  'knight',
  'dragon',
  'demon',
]);

const guardBreakEnemyKinds = new Set<string>([
  'slime',
  'mage',
  'lich',
]);

export const enemySupportsHeavyStrike = (enemy: EnemyTacticalProfileInput): boolean => (
  enemy.isBoss || enemy.isElite || heavyStrikeEnemyKinds.has(enemy.kind)
);

export const enemySupportsGuardBreak = (enemy: EnemyTacticalProfileInput): boolean => (
  enemy.isBoss || guardBreakEnemyKinds.has(enemy.kind)
);

export const resolveEnemyTacticalProfile = (enemy: EnemyTacticalProfileInput): EnemyTacticalProfile => {
  if (enemySupportsGuardBreak(enemy)) {
    return {
      code: 'GUARD_BREAK',
      habitLine: 'на просадке готовит пробивающий удар и сбивает накопленную защиту',
      answerLine: 'отвечайте атакой или готовой руной; чистую стойку оставьте на другой ход',
    };
  }

  if (enemySupportsHeavyStrike(enemy)) {
    return {
      code: 'HEAVY_STRIKE',
      habitLine: 'на просадке готовит тяжёлый удар сильнее обычного',
      answerLine: 'встречайте угрозу защитой; готовая руна тоже хорошо бьёт по раскрытому замыслу',
    };
  }

  return {
    code: 'BASIC_PRESSURE',
    habitLine: 'особого предупреждения нет: давит обычными ударами',
    answerLine: 'чередуйте атаку и защиту, если бой начинает затягиваться',
  };
};
