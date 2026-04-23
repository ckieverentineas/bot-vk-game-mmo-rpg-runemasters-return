import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import {
  formatInventoryDelta,
  formatRuneDisplayName,
  renderAcquisitionSummary,
  renderNextGoalSummary,
} from './message-formatting';
import {
  formatPlayerSkillGainLine,
  formatPlayerSkillTitles,
} from './player-skill-formatting';

const formatBaseRewardLine = (pendingReward: PendingRewardView): string => {
  const { baseReward } = pendingReward.snapshot;
  const parts = [
    `+${baseReward.experience} опыта`,
    `+${baseReward.gold} пыли`,
    formatInventoryDelta(baseReward.shards),
    baseReward.droppedRune ? `руна: ${formatRuneDisplayName(baseReward.droppedRune)}` : null,
  ].filter((part): part is string => Boolean(part) && part !== 'без дополнительных материалов');

  return parts.join(' · ');
};

const formatTrophyActionPreview = (
  action: PendingRewardView['snapshot']['trophyActions'][number],
): string => {
  const rewardLine = action.reward ? formatInventoryDelta(action.reward.inventoryDelta) : 'добыча без предпросмотра';
  return `${action.label} — ${rewardLine}; мастерство: ${formatPlayerSkillTitles(action.skillCodes)}.`;
};

export const renderPendingReward = (
  pendingReward: PendingRewardView,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  const sourceLine = pendingReward.source
    ? [
        `${pendingReward.source.enemyName} повержен.`,
        'На поле остался трофей: можно забрать всё как есть или обработать добычу.',
      ].join(' ')
    : 'Победа уже зафиксирована. Трофей ждёт: можно забрать всё как есть или обработать добычу.';

  return [
    '🏁 Трофеи победы',
    '',
    sourceLine,
    `Уже ваше: ${formatBaseRewardLine(pendingReward)}.`,
    ...renderAcquisitionSummary(acquisitionSummary),
    'Трофей поддастся только одному подходу; повторный жест не принесёт второй добычи.',
    '',
    'Подход к трофею:',
    ...pendingReward.snapshot.trophyActions.map(formatTrophyActionPreview),
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
    sourceLine,
    `В сумке: ${formatInventoryDelta(result.appliedResult.inventoryDelta)}.`,
    ...(skillLines.length > 0 ? ['', 'Ремесло:', ...skillLines] : []),
    '',
    ...renderNextGoalSummary(buildPlayerNextGoalView(result.player), '👉 Дальше'),
  ].join('\n');
};
