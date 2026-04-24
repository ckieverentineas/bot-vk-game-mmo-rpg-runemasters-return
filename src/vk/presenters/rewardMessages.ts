import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import { listPlayerFacingTrophyActions } from '../trophy-action-presentation';
import {
  formatBattleReward,
  formatInventoryDelta,
  renderAcquisitionSummary,
  renderHintBlock,
  renderNextGoalSummary,
} from './message-formatting';
import {
  formatPlayerSkillGainLine,
  formatPlayerSkillTitles,
} from './player-skill-formatting';

const formatBaseRewardLine = (pendingReward: PendingRewardView): string => {
  return formatBattleReward(pendingReward.snapshot.baseReward);
};

const formatTrophyActionPreview = (
  action: PendingRewardView['snapshot']['trophyActions'][number],
): string => {
  const rewardLine = action.reward ? formatInventoryDelta(action.reward.inventoryDelta) : 'добыча без предпросмотра';
  return `${action.label} — ${rewardLine} · ${formatPlayerSkillTitles(action.skillCodes)}`;
};

export const renderPendingReward = (
  pendingReward: PendingRewardView,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  const sourceLine = pendingReward.source
    ? `✅ ${pendingReward.source.enemyName} повержен.`
    : '✅ Победа зафиксирована.';

  return [
    '🏁 Трофеи победы',
    '',
    sourceLine,
    `🎁 Уже ваше: ${formatBaseRewardLine(pendingReward)}.`,
    ...renderAcquisitionSummary(acquisitionSummary),
    ...renderHintBlock(['Выберите действие с добычей']),
    ...listPlayerFacingTrophyActions(pendingReward.snapshot.trophyActions).map(formatTrophyActionPreview),
  ].join('\n');
};

export const renderCollectedPendingReward = (result: CollectPendingRewardView): string => {
  const selectedAction = result.pendingReward.snapshot.trophyActions.find((action) => (
    action.code === result.selectedActionCode
  ));
  const skillLines = result.appliedResult.skillUps.map(formatPlayerSkillGainLine);
  const sourceLine = result.pendingReward.source
    ? `Трофей разобран: ${result.pendingReward.source.enemyName}.`
    : 'Трофей разобран.';

  return [
    selectedAction?.label ?? '🎒 Добыча собрана',
    '',
    `✅ ${sourceLine}`,
    `🎒 ${formatInventoryDelta(result.appliedResult.inventoryDelta)}.`,
    ...(skillLines.length > 0 ? ['', '🧰 Ремесло', ...skillLines] : []),
    ...renderNextGoalSummary(buildPlayerNextGoalView(result.player), '👉 Дальше'),
  ].join('\n');
};
