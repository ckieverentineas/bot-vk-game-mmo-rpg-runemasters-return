import type { BattleView, PlayerState } from '../../../../shared/types/game';
import {
  derivePlayerStats,
  derivePlayerVitals,
  resolveAdaptiveAdventureLocationLevel,
} from '../../domain/player-stats';

export interface DefeatFlowView {
  readonly consequenceLine: string;
  readonly preservedLine: string;
  readonly recoveryLine: string;
  readonly safeRouteLine: string;
}

const renderFallbackRecoveryLine = (): string => (
  `Восстановление: вы приходите в себя после удара. Следующая встреча начнётся уже не с нуля HP.`
);

const renderPlayerRecoveryLine = (player: PlayerState): string => {
  const vitals = derivePlayerVitals(player, derivePlayerStats(player));

  return [
    'Восстановление:',
    `вы поднялись до ${vitals.currentHealth}/${vitals.maxHealth} HP`,
    `и ${vitals.currentMana}/${vitals.maxMana} маны.`,
  ].join(' ');
};

const renderSafeRouteLine = (player?: PlayerState): string => {
  const threatLine = player
    ? `текущий зов угрозы ${resolveAdaptiveAdventureLocationLevel(player)}`
    : 'угроза следующей встречи смягчена';

  return [
    'Безопасный путь:',
    'сначала «🔮 Руны» для проверки знаков,',
    'затем «⚔️ Осторожно дальше» —',
    `${threatLine}, без школьного испытания и верхнего бродяги сразу после поражения.`,
  ].join(' ');
};

export const buildDefeatFlowView = (
  battle: BattleView,
  player?: PlayerState,
): DefeatFlowView | null => {
  if (battle.status !== 'COMPLETED' || battle.result !== 'DEFEAT') {
    return null;
  }

  return {
    consequenceLine: `Не получено: победная добыча за «${battle.enemy.name}» не начислена; трофеи и шанс руны не открылись.`,
    preservedLine: 'Сохранено: руны, пыль, материалы, уровень, школа и задания остаются у вас.',
    recoveryLine: player ? renderPlayerRecoveryLine(player) : renderFallbackRecoveryLine(),
    safeRouteLine: renderSafeRouteLine(player),
  };
};
