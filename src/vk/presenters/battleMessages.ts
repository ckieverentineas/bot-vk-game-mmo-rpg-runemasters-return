import { buildBattleClarityView } from '../../modules/combat/application/read-models/battle-clarity';
import { buildBattleRuneActionReadinessView } from '../../modules/combat/application/read-models/battle-rune-action-readiness';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import { listBattleRuneLoadouts } from '../../modules/combat/domain/battle-rune-loadouts';
import { resolveDefendGuardGain, resolveIntentDefendGuardBonus } from '../../modules/combat/domain/battle-tactics';
import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildDefeatFlowView } from '../../modules/player/application/read-models/defeat-flow';
import { buildBattleResultNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { getRuneSchoolPresentation } from '../../modules/runes/domain/rune-schools';
import type { BattleRuneActionSnapshot, BattleView, PlayerState, StatBlock } from '../../shared/types/game';
import {
  formatRuneDisplayName,
  renderAcquisitionSummary,
  withSentencePeriod,
} from './message-formatting';

const meterEmptySegment = '⬛';

const renderMeter = (current: number, max: number, width: number, filledSegment: string): string => {
  if (max <= 0) {
    return meterEmptySegment.repeat(width);
  }

  const filled = Math.max(0, Math.min(width, Math.round((current / max) * width)));
  return `${filledSegment.repeat(filled)}${meterEmptySegment.repeat(width - filled)}`;
};

const resolveHealthMeterSegment = (current: number, max: number): string => {
  if (max <= 0) {
    return '🟥';
  }

  const ratio = current / max;
  if (ratio <= 0.25) {
    return '🟥';
  }

  if (ratio <= 0.5) {
    return '🟨';
  }

  return '🟩';
};

const renderBattleActorStats = (
  actor: Pick<StatBlock, 'attack' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence'>,
): string => (
  [
    `📊 Черты: ⚔️ ${actor.attack}`,
    `🛡️ ${actor.defence}`,
    `🔮 ${actor.magicDefence}`,
    `💨 ${actor.dexterity}`,
    `🧠 ${actor.intelligence}`,
  ].join(' · ')
);

const renderBattleActorBlock = (
  title: string,
  actor: {
    name: string;
    attack: number;
    defence: number;
    magicDefence: number;
    dexterity: number;
    intelligence: number;
    currentHealth: number;
    maxHealth: number;
    currentMana?: number;
    maxMana?: number;
  },
  options: { guardPoints?: number } = {},
): string => {
  const healthLine = [
    '❤️',
    renderMeter(
      actor.currentHealth,
      actor.maxHealth,
      10,
      resolveHealthMeterSegment(actor.currentHealth, actor.maxHealth),
    ),
    `${actor.currentHealth}/${actor.maxHealth} HP`,
  ].join(' ');
  const manaLine = typeof actor.currentMana === 'number' && typeof actor.maxMana === 'number'
    ? `🔷 ${renderMeter(actor.currentMana, actor.maxMana, 6, '🟦')} ${actor.currentMana}/${actor.maxMana} маны`
    : null;
  const guardLine = options.guardPoints && options.guardPoints > 0
    ? ` · 🛡️ щит ${options.guardPoints}`
    : '';

  return [
    `${title}: ${actor.name}`,
    `${healthLine}${guardLine}`,
    ...(manaLine ? [manaLine] : []),
    renderBattleActorStats(actor),
  ].join('\n');
};

const renderBattleRuneState = (battle: BattleView): string => {
  const runeLoadouts = listBattleRuneLoadouts(battle.player);
  if (runeLoadouts.length === 0) {
    return '🔮 Руна молчит: остаётся сталь и простой удар.';
  }

  return runeLoadouts.map(({ slot, loadout }) => {
    const activeAbility = loadout.activeAbility;
    if (!activeAbility) {
      return `🔮 Слот ${slot + 1}: ${loadout.runeName} · активного действия нет, знак держит пассивную силу.`;
    }

    const readiness = buildBattleRuneActionReadinessView(battle, activeAbility);

    return `🌀 Слот ${slot + 1}: ${activeAbility.name} — ${readiness.screenState}`;
  }).join('\n');
};

const renderBattleEnemyIntent = (battle: BattleView): string | null => {
  const intent = battle.enemy.intent;
  if (!intent) {
    return null;
  }

  return `⚠️ Враг выдаёт замысел: ${intent.title}. ${intent.description}`;
};

const renderBattleRuneActionLabel = (
  battle: BattleView,
  slot: number,
  activeAbility: BattleRuneActionSnapshot,
): string => {
  const readiness = buildBattleRuneActionReadinessView(battle, activeAbility);
  return `🌀 ${slot + 1}: ${activeAbility.name}${readiness.buttonSuffix}`;
};

const renderBattleActionState = (battle: BattleView): string => {
  const defendGain = resolveDefendGuardGain(battle.player) + resolveIntentDefendGuardBonus(battle.enemy.intent);
  const actions = ['⚔️ Атака', `🛡️ Защита (+${defendGain} щит)`];

  actions.push(
    ...listBattleRuneLoadouts(battle.player)
      .flatMap(({ slot, loadout }) => (
        loadout.activeAbility
          ? [renderBattleRuneActionLabel(battle, slot, loadout.activeAbility)]
          : []
      )),
  );

  return `⚔️ Ответ мастера: ${actions.join(' · ')}`;
};

const resolveBattleEnemyRankLabel = (battle: BattleView): string => {
  if (battle.enemy.isBoss) {
    return 'босс';
  }

  if (battle.enemy.isElite) {
    return 'элита';
  }

  return 'обычный враг';
};

const renderBattleEncounterChoice = (battle: BattleView): string[] => {
  const fleeChancePercent = battle.encounter?.fleeChancePercent ?? 0;
  const firstMoveLine = battle.encounter?.initialTurnOwner === 'PLAYER'
    ? 'Если вступить в бой, первый ход будет за вами.'
    : 'Если вступить в бой, враг успеет начать первым.';

  return [
    `👁️ Встреча: ${battle.enemy.name} замечает вас на маршруте.`,
    `Угроза: ${resolveBattleEnemyRankLabel(battle)} · ${battle.enemy.kind}.`,
    `💨 Тропа назад: ${fleeChancePercent}% · ваша ЛВК ${battle.player.dexterity}, враг ${battle.enemy.dexterity}.`,
    firstMoveLine,
    'До первой стычки ещё можно принять бой или уйти в сторону.',
  ];
};

const renderBattleNextGoal = (battle: BattleView, player?: PlayerState): string[] => {
  const nextGoal = buildBattleResultNextGoalView(battle, player);
  if (!nextGoal) {
    return [];
  }

  return [
    `🎯 След: ${withSentencePeriod(nextGoal.objectiveText)}`,
    `👉 Дальше: «${nextGoal.primaryActionLabel}».`,
  ];
};

type BattleLogPresentationLine =
  | { readonly kind: 'entry'; readonly text: string }
  | { readonly kind: 'omission'; readonly omittedCount: number };

const visibleBattleLogEntryLimit = 8;
const leadingBattleLogEntryCount = 1;

const formatBattleEventWord = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'событие';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'события';
  }

  return 'событий';
};

const toBattleLogEntryLine = (text: string): BattleLogPresentationLine => ({
  kind: 'entry',
  text,
});

const selectBattleLogLines = (log: readonly string[]): readonly BattleLogPresentationLine[] => {
  if (log.length === 0) {
    return [toBattleLogEntryLine('Поле ещё молчит.')];
  }

  if (log.length <= visibleBattleLogEntryLimit) {
    return [...log].reverse().map(toBattleLogEntryLine);
  }

  const trailingEntryCount = visibleBattleLogEntryLimit - leadingBattleLogEntryCount;
  const omittedCount = log.length - visibleBattleLogEntryLimit;

  return [
    ...log.slice(-trailingEntryCount).reverse().map(toBattleLogEntryLine),
    { kind: 'omission', omittedCount },
    ...log.slice(0, leadingBattleLogEntryCount).reverse().map(toBattleLogEntryLine),
  ];
};

const renderBattleLogLine = (line: BattleLogPresentationLine): string => {
  if (line.kind === 'omission') {
    const eventWord = formatBattleEventWord(line.omittedCount);
    return `… ещё ${line.omittedCount} ${eventWord} между нынешним мигом и началом схватки`;
  }

  return `• ${line.text}`;
};

const resolveBattleStateLine = (battle: BattleView, isEncounterOffered: boolean): string => {
  if (isEncounterOffered) {
    return '🧭 Встреча';
  }

  if (battle.status === 'ACTIVE') {
    return battle.turnOwner === 'PLAYER'
      ? '⚔️ Бой — ваш ход'
      : '⚔️ Бой — ход врага';
  }

  if (battle.result === 'VICTORY') {
    return '🏁 Победа';
  }

  if (battle.result === 'FLED') {
    return '💨 Отступление';
  }

  return '💥 Поражение';
};

const renderBattleRewardLines = (battle: BattleView): string[] => {
  if (battle.status !== 'COMPLETED' || !battle.rewards) {
    return [];
  }

  const droppedRune = battle.rewards.droppedRune;
  const droppedSchool = droppedRune
    ? getRuneSchoolPresentation(droppedRune.archetypeCode)
    : null;

  return [
    '',
    `Добыча: +${battle.rewards.experience} опыта · +${battle.rewards.gold} пыли`,
    ...(droppedRune ? [`Руна: ${formatRuneDisplayName(droppedRune)}`] : []),
    ...(droppedSchool ? [`Школа: ${droppedSchool.name}.`] : []),
  ];
};

const renderBattleDefeatFlowLines = (battle: BattleView, player?: PlayerState): string[] => {
  const defeatFlow = buildDefeatFlowView(battle, player);
  if (!defeatFlow) {
    return [];
  }

  return [
    '',
    '🛟 После поражения',
    defeatFlow.consequenceLine,
    defeatFlow.preservedLine,
    defeatFlow.recoveryLine,
    defeatFlow.safeRouteLine,
  ];
};

export const renderBattle = (
  battle: BattleView,
  player?: PlayerState,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  const battleLogLines = selectBattleLogLines(battle.log);
  const clarity = buildBattleClarityView(battle);
  const enemyIntentLine = renderBattleEnemyIntent(battle);
  const isEncounterOffered = battle.status === 'ACTIVE' && isBattleEncounterOffered(battle);
  const battleStateLine = resolveBattleStateLine(battle, isEncounterOffered);
  const rewardLines = renderBattleRewardLines(battle);
  const defeatFlowLines = renderBattleDefeatFlowLines(battle, player);
  const postSessionLines = battle.status === 'COMPLETED'
    ? ['', ...renderBattleNextGoal(battle, player)]
    : [];

  return [
    battleStateLine,
    '',
    'Поле боя',
    renderBattleActorBlock('Вы', battle.player, { guardPoints: battle.player.guardPoints }),
    renderBattleActorBlock('Враг', battle.enemy),
    '',
    ...(isEncounterOffered
      ? [
          'Развилка',
          ...renderBattleEncounterChoice(battle),
          '',
        ]
      : battle.status === 'ACTIVE'
      ? [
          'Чтение боя',
          ...(enemyIntentLine ? [enemyIntentLine] : []),
          ...(clarity.choiceLine ? [clarity.choiceLine] : []),
          ...(clarity.schoolHintLine ? [clarity.schoolHintLine] : []),
          renderBattleRuneState(battle),
          ...(battle.turnOwner === 'PLAYER' ? [renderBattleActionState(battle)] : []),
          '',
        ]
      : []),
    'Летопись схватки',
    ...battleLogLines.map(renderBattleLogLine),
    ...rewardLines,
    ...defeatFlowLines,
    ...renderAcquisitionSummary(acquisitionSummary),
    ...postSessionLines,
  ].join('\n');
};
