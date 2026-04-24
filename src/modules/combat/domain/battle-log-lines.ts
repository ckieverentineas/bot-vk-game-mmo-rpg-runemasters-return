export const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

export const messageWhen = (condition: boolean, message: string): readonly string[] => (
  condition ? [message] : []
);

export const formatBattleActor = (name: string): string => `[${name}]`;

export const formatDamageLine = (
  actorName: string,
  targetName: string,
  damage: number | string,
): string => `${formatBattleActor(actorName)} наносит ${damage} урона ${formatBattleActor(targetName)}.`;

export const formatEnemyAttackLine = (
  enemyName: string,
  attackText: string,
  targetName: string,
  damage: number | string,
): string => `${formatBattleActor(enemyName)} ${attackText} ${formatBattleActor(targetName)} и наносит ${damage} урона.`;

export const formatSkillLine = (
  actorName: string,
  skillName: string,
  targetName: string,
  outcome: string,
): string => `${formatBattleActor(actorName)} применяет «${skillName}» против ${formatBattleActor(targetName)}: ${outcome}.`;
