import type {
  BattleEnemyIntentSnapshot,
  BattleEnemySnapshot,
  BattlePlayerSnapshot,
} from '../../../shared/types/game';

const heavyStrikeEnemyKinds = new Set<BattleEnemySnapshot['kind']>([
  'wolf',
  'goblin',
  'knight',
  'dragon',
  'demon',
]);

export const resolveGuardCap = (player: Pick<BattlePlayerSnapshot, 'defence' | 'dexterity'>): number => (
  4 + player.defence + Math.floor(player.dexterity / 2)
);

export const resolveDefendGuardGain = (player: Pick<BattlePlayerSnapshot, 'defence'>): number => (
  1 + Math.floor(player.defence / 2)
);

export const resolveGaleGuardGain = (player: Pick<BattlePlayerSnapshot, 'dexterity'>): number => (
  2 + Math.floor(player.dexterity / 2)
);

export const enemySupportsHeavyStrike = (enemy: Pick<BattleEnemySnapshot, 'kind' | 'isElite' | 'isBoss'>): boolean => (
  enemy.isBoss || enemy.isElite || heavyStrikeEnemyKinds.has(enemy.kind)
);

export const shouldEnemyPrepareHeavyStrike = (enemy: BattleEnemySnapshot): boolean => (
  enemySupportsHeavyStrike(enemy)
  && !enemy.intent
  && !(enemy.hasUsedSignatureMove ?? false)
  && enemy.currentHealth > 0
  && enemy.currentHealth <= Math.ceil(enemy.maxHealth * 0.6)
);

export const createHeavyStrikeIntent = (enemy: Pick<BattleEnemySnapshot, 'attack'>): BattleEnemyIntentSnapshot => ({
  code: 'HEAVY_STRIKE',
  title: 'Тяжёлый удар',
  description: 'Следующая атака врага будет сильнее обычной. Защита поможет пережить этот ход.',
  bonusAttack: Math.max(2, Math.floor(enemy.attack * 0.75)),
});
