import type {
  BattleEnemyIntentSnapshot,
  BattleEnemySnapshot,
  BattlePlayerSnapshot,
} from '../../../shared/types/game';
import {
  enemySupportsGuardBreak,
  enemySupportsHeavyStrike,
} from '../../../shared/domain/enemy-tactical-profile';

const intentPreparationHealthRatio = 0.75;
const heavyStrikeDefendGuardBonus = 2;
const revealedIntentRuneDamageBonus = 1;
const signatureReactionBaseChancePercent = 50;
const signatureReactionStatStepPercent = 8;
const signatureReactionMinChancePercent = 15;
const signatureReactionMaxChancePercent = 85;
const signatureReactionElitePenaltyPercent = 10;
const signatureReactionBossPenaltyPercent = 20;

const clampSignatureReactionChance = (chancePercent: number): number => (
  Math.max(
    signatureReactionMinChancePercent,
    Math.min(signatureReactionMaxChancePercent, chancePercent),
  )
);

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

const isEnemyInIntentWindow = (enemy: Pick<BattleEnemySnapshot, 'currentHealth' | 'maxHealth'>): boolean => (
  enemy.currentHealth > 0
  && enemy.currentHealth <= Math.ceil(enemy.maxHealth * intentPreparationHealthRatio)
);

const resolveSignatureReactionScore = (
  actor: Pick<BattlePlayerSnapshot | BattleEnemySnapshot, 'dexterity' | 'intelligence'>,
): number => actor.dexterity + Math.floor(actor.intelligence / 2);

const resolveEnemySignatureReactionPenalty = (
  enemy: Pick<BattleEnemySnapshot, 'isElite' | 'isBoss'>,
): number => {
  if (enemy.isBoss) {
    return signatureReactionBossPenaltyPercent;
  }

  if (enemy.isElite) {
    return signatureReactionElitePenaltyPercent;
  }

  return 0;
};

export const shouldEnemyPrepareHeavyStrike = (enemy: BattleEnemySnapshot): boolean => (
  enemySupportsHeavyStrike(enemy)
  && !enemy.intent
  && !(enemy.hasUsedSignatureMove ?? false)
  && isEnemyInIntentWindow(enemy)
);

export const shouldEnemyPrepareGuardBreak = (enemy: BattleEnemySnapshot): boolean => (
  enemySupportsGuardBreak(enemy)
  && !enemy.intent
  && !(enemy.hasUsedSignatureMove ?? false)
  && isEnemyInIntentWindow(enemy)
);

export const shouldEnemyPrepareSignatureIntent = (enemy: BattleEnemySnapshot): boolean => (
  shouldEnemyPrepareGuardBreak(enemy) || shouldEnemyPrepareHeavyStrike(enemy)
);

export const resolvePlayerSignatureReactionChancePercent = (
  player: Pick<BattlePlayerSnapshot, 'dexterity' | 'intelligence'>,
  enemy: Pick<BattleEnemySnapshot, 'dexterity' | 'intelligence' | 'isElite' | 'isBoss'>,
): number => {
  const reactionDifference = resolveSignatureReactionScore(player) - resolveSignatureReactionScore(enemy);
  const rankPenalty = resolveEnemySignatureReactionPenalty(enemy);

  return clampSignatureReactionChance(
    signatureReactionBaseChancePercent + reactionDifference * signatureReactionStatStepPercent - rankPenalty,
  );
};

export const resolveIntentDefendGuardBonus = (
  intent: Pick<BattleEnemyIntentSnapshot, 'code'> | null | undefined,
): number => (
  intent?.code === 'HEAVY_STRIKE' ? heavyStrikeDefendGuardBonus : 0
);

export const resolveRuneIntentDamageBonus = (
  intent: Pick<BattleEnemyIntentSnapshot, 'code'> | null | undefined,
): number => (
  intent ? revealedIntentRuneDamageBonus : 0
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
