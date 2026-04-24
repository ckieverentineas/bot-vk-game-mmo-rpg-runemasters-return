import type {
  RunicTavernBoardView,
  RunicTavernThreatView,
} from '../../modules/quests/application/read-models/runic-tavern-board';
import { formatBattleReward } from './message-formatting';

const renderBoardSummary = (board: RunicTavernBoardView): string => (
  `Доска угроз: ${board.namedCount} именная · ${board.calamityCount} бедствие`
);

const renderThreatAdvice = (threat: RunicTavernThreatView): string => (
  threat.recommendedParty
    ? 'Лучше идти отрядом.'
    : 'Можно выследить в исследовании.'
);

const renderThreatLine = (
  threat: RunicTavernThreatView,
  index: number,
): string => [
  `${index + 1}. ${threat.displayName}`,
  `Ранг: ${threat.rankLabel} · ${threat.currentBiomeName} · рост +${threat.levelBonus}`,
  `Премия Дозора: ${formatBattleReward({
    ...threat.bountyReward,
    droppedRune: null,
  }, { includeDroppedRune: false })}`,
  renderThreatAdvice(threat),
].join('\n');

const renderEmptyBoard = (): string => [
  'Доска угроз пуста.',
  'Слухи ещё не стали именами.',
  'Ищите следы в исследовании.',
].join('\n');

export const renderRunicTavern = (board: RunicTavernBoardView): string => [
  '🏠 Трактир Рунного дозора',
  renderBoardSummary(board),
  '',
  board.threats.length > 0
    ? board.threats.map(renderThreatLine).join('\n\n')
    : renderEmptyBoard(),
].join('\n');
