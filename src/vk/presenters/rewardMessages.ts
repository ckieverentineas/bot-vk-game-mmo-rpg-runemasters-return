import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';
import type { PendingRewardWorkshopItemDurabilityChangeSnapshot } from '../../modules/rewards/domain/pending-reward-snapshot';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import { isWorkshopItemCode } from '../../modules/workshop/domain/workshop-catalog';
import { listPlayerFacingTrophyActions } from '../trophy-action-presentation';
import {
  formatBattleReward,
  formatInventoryDelta,
  renderAcquisitionSummary,
  renderHintBlock,
} from './message-formatting';
import {
  formatPlayerSkillGainLine,
  formatPlayerSkillTitles,
} from './player-skill-formatting';
import { resolveWorkshopItemTitle } from './workshopLabels';

const formatBaseRewardLine = (pendingReward: PendingRewardView): string => {
  return formatBattleReward(pendingReward.snapshot.baseReward);
};

const formatTrophyActionPreview = (
  action: PendingRewardView['snapshot']['trophyActions'][number],
): string => {
  const rewardLine = action.reward ? formatInventoryDelta(action.reward.inventoryDelta) : 'добыча без предпросмотра';
  return `${action.label} — ${rewardLine} · ${formatPlayerSkillTitles(action.skillCodes)}`;
};

const resolveDurabilityChangeItemTitle = (
  change: PendingRewardWorkshopItemDurabilityChangeSnapshot,
): string => (
  isWorkshopItemCode(change.itemCode)
    ? resolveWorkshopItemTitle(change.itemCode)
    : 'Предмет мастерской'
);

const formatDurabilityStatusSuffix = (
  change: PendingRewardWorkshopItemDurabilityChangeSnapshot,
): string => {
  if (change.statusAfter === 'BROKEN') {
    return ' · сломан';
  }

  if (change.statusAfter === 'DESTROYED') {
    return ' · разрушен';
  }

  return '';
};

const formatWorkshopItemDurabilityChangeLine = (
  change: PendingRewardWorkshopItemDurabilityChangeSnapshot,
): string => (
  `🧰 ${resolveDurabilityChangeItemTitle(change)}: прочность `
  + `${change.durabilityBefore} → ${change.durabilityAfter}/${change.maxDurability}`
  + `${formatDurabilityStatusSuffix(change)}.`
);

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
  const durabilityLines = (result.appliedResult.workshopItemDurabilityChanges ?? [])
    .map(formatWorkshopItemDurabilityChangeLine);
  const sourceLine = result.pendingReward.source
    ? `Трофей разобран: ${result.pendingReward.source.enemyName}.`
    : 'Трофей разобран.';

  return [
    selectedAction?.label ?? '🎒 Добыча собрана',
    '',
    `✅ ${sourceLine}`,
    `🎒 ${formatInventoryDelta(result.appliedResult.inventoryDelta)}.`,
    ...durabilityLines,
    ...(skillLines.length > 0 ? ['', '🧰 Ремесло', ...skillLines] : []),
  ].join('\n');
};
