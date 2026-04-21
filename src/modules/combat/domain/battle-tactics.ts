import type {
  BattleEnemyIntentSnapshot,
  BattleEnemySnapshot,
  BattlePlayerSnapshot,
} from '../../../shared/types/game';

const heavyStrikeEnemyKinds = new Set<BattleEnemySnapshot['kind']>([
  'wolf',
  'boar',
  'goblin',
  'knight',
  'dragon',
  'demon',
]);

const guardBreakEnemyKinds = new Set<BattleEnemySnapshot['kind']>([
  'slime',
  'mage',
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

export const resolveManaRegeneration = (player: Pick<BattlePlayerSnapshot, 'intelligence' | 'maxMana'>): number => {
  if (player.maxMana <= 0) {
    return 0;
  }

  return Math.min(3, Math.max(1, Math.floor(player.intelligence / 4)));
};

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

export const enemySupportsGuardBreak = (enemy: Pick<BattleEnemySnapshot, 'kind' | 'isElite' | 'isBoss'>): boolean => (
  enemy.isBoss || guardBreakEnemyKinds.has(enemy.kind)
);

export const shouldEnemyPrepareGuardBreak = (enemy: BattleEnemySnapshot): boolean => (
  enemySupportsGuardBreak(enemy)
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

export const createGuardBreakIntent = (enemy: Pick<BattleEnemySnapshot, 'attack' | 'kind'>): BattleEnemyIntentSnapshot => ({
  code: 'GUARD_BREAK',
  title: enemy.kind === 'slime' ? 'Кислотный прорыв' : 'Пробивающий удар',
  description: 'Следующий удар разобьёт защиту. Лучше давить уроном сейчас, а не тратить ход на защиту.',
  bonusAttack: Math.max(1, Math.floor(enemy.attack * 0.35)),
  shattersGuard: true,
});
