import { gameContent } from '../../content/game-content';
import { buildBattleClarityView } from '../../modules/combat/application/read-models/battle-clarity';
import {
  type EnemyIntentReading,
  isEnemyIntentReadable,
} from '../../modules/combat/domain/enemy-intent-reading';
import { buildBattleRuneActionReadinessView } from '../../modules/combat/application/read-models/battle-rune-action-readiness';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import { listBattleRuneLoadouts } from '../../modules/combat/domain/battle-rune-loadouts';
import {
  resolveStoneGuardGainBonus,
  resolveStoneHoldIntentGuardBonus,
  resolveStoneMasteryGuardGainBonus,
  resolveStoneSealGuardBonus,
} from '../../modules/combat/domain/battle-rune-passives';
import { resolveDefendGuardGain, resolveIntentDefendGuardBonus } from '../../modules/combat/domain/battle-tactics';
import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildDefeatFlowView } from '../../modules/player/application/read-models/defeat-flow';
import { buildBattleResultNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { getRuneSchoolPresentation } from '../../modules/runes/domain/rune-schools';
import type { BattleRuneActionSnapshot, BattleView, PlayerState, StatBlock } from '../../shared/types/game';
import {
  formatBattleReward,
  formatRuneDisplayName,
  renderAcquisitionSummary,
  renderHintBlock,
  renderHintLine,
  renderNextGoalSummary,
} from './message-formatting';

const meterEmptySegment = '⬛';
const partyBattleSize = 2;

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

const resolveBattlePartyPerspective = (viewerPlayerId: number | undefined, memberPlayerId: number): string | null => {
  if (viewerPlayerId === undefined) {
    return null;
  }

  return memberPlayerId === viewerPlayerId ? 'вы' : 'союзник';
};

const resolveBattleLocationName = (biomeCode: string): string => (
  gameContent.world.biomes.find((biome) => biome.code === biomeCode)?.name ?? biomeCode
);

const findPartyBattleViewerMember = (
  battle: BattleView,
  viewerPlayerId: number,
): NonNullable<BattleView['party']>['members'][number] | null => (
  battle.party?.members.find((member) => member.playerId === viewerPlayerId) ?? null
);

const renderBattlePartyLines = (battle: BattleView, viewerPlayerId?: number): string[] => {
  if (!battle.party) {
    return [];
  }

  return [
    'Отряд',
    ...battle.party.members.map((member) => {
      const marker = member.playerId === battle.party?.currentTurnPlayerId ? '▶' : '•';
      const health = `${member.snapshot.currentHealth}/${member.snapshot.maxHealth} HP`;
      const perspective = resolveBattlePartyPerspective(viewerPlayerId, member.playerId);
      return perspective
        ? `${marker} ${member.name} · ${perspective} · ${health}`
        : `${marker} ${member.name} · ${health}`;
    }),
    '',
  ];
};

const renderPartyBattleOverview = (battle: BattleView, viewerPlayerId?: number): string[] => {
  if (!battle.party || viewerPlayerId === undefined) {
    return [];
  }

  const viewerMember = findPartyBattleViewerMember(battle, viewerPlayerId);
  if (!viewerMember) {
    return [];
  }

  const allyBlocks = battle.party.members
    .filter((member) => member.playerId !== viewerPlayerId)
    .flatMap((member, index) => ([
      renderBattleActorBlock(
        index === 0 ? '👤 Товарищ' : `👤 Союзник ${index + 1}`,
        member.snapshot,
        { guardPoints: member.snapshot.guardPoints },
      ),
      '',
    ]));

  return [
    `🌐 Локация: ${resolveBattleLocationName(battle.biomeCode)} [Отряд ${battle.party.members.length}/${partyBattleSize}]`,
    '',
    renderBattleActorBlock('👤 Вы', viewerMember.snapshot, { guardPoints: viewerMember.snapshot.guardPoints }),
    '',
    ...allyBlocks,
    renderBattleActorBlock('Враг', battle.enemy),
    '',
  ];
};

const isPartyBattleViewerTurn = (battle: BattleView, viewerPlayerId?: number): boolean => (
  battle.party === undefined
  || battle.party === null
  || viewerPlayerId === undefined
  || battle.party.currentTurnPlayerId === viewerPlayerId
);

const renderPartyBattleWaitLine = (battle: BattleView, viewerPlayerId?: number): string | null => {
  if (!battle.party || viewerPlayerId === undefined) {
    return null;
  }

  if (battle.turnOwner === 'ENEMY') {
    return '🕒 Ход врага. Дождитесь развязки.';
  }

  if (battle.party.currentTurnPlayerId === null || battle.party.currentTurnPlayerId === viewerPlayerId) {
    return null;
  }

  const actingMember = battle.party.members.find((member) => member.playerId === battle.party?.currentTurnPlayerId);
  return `🕒 Ход товарища: ${actingMember?.name ?? 'союзник'}. После его действия бот пришлет обновление.`;
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

const renderBattleEnemyIntent = (reading: EnemyIntentReading): string | null => {
  const intent = reading.intent;
  if (!intent) {
    return null;
  }

  if (reading.precision === 'exact') {
    const sourceLabel = reading.source === 'divination' ? '🔮 Прорицание' : '🧪 Анализ';
    return `${sourceLabel}: ${intent.title}. ${intent.description}`;
  }

  if (isEnemyIntentReadable(reading)) {
    const patternLabel = intent.code === 'HEAVY_STRIKE' ? 'силовой удар' : 'приём против стойки';
    return `👁️ Чтение: ${patternLabel}. Точный жест скрыт.`;
  }

  return '👁️ Чтение: опасный замысел. Точный ход не прочитан.';
};

const renderBattleRuneActionLabel = (
  battle: BattleView,
  slot: number,
  activeAbility: BattleRuneActionSnapshot,
): string => {
  const readiness = buildBattleRuneActionReadinessView(battle, activeAbility);
  return `🌀 ${slot + 1}: ${activeAbility.name}${readiness.buttonSuffix}`;
};

const renderBattleActionState = (battle: BattleView, reading: EnemyIntentReading): string => {
  const readableIntent = isEnemyIntentReadable(reading) ? reading.intent : null;
  const defendGain = [
    resolveDefendGuardGain(battle.player),
    resolveIntentDefendGuardBonus(readableIntent),
    resolveStoneGuardGainBonus(battle),
    resolveStoneHoldIntentGuardBonus(battle),
    resolveStoneSealGuardBonus(battle),
    resolveStoneMasteryGuardGainBonus(battle),
  ].reduce((total, gain) => total + gain, 0);
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
  const encounterTitle = battle.encounter?.title ?? 'Встреча';
  const encounterDescription = battle.encounter?.description
    ?? `${battle.enemy.name} замечает вас на маршруте.`;
  const encounterEffectLine = battle.encounter?.effectLine ?? null;
  const firstMoveLine = battle.encounter?.initialTurnOwner === 'PLAYER'
    ? 'Если вступить в бой, первый ход будет за вами.'
    : 'Если вступить в бой, враг успеет начать первым.';

  return [
    `👁️ ${encounterTitle}: ${encounterDescription}`,
    `Угроза: ${resolveBattleEnemyRankLabel(battle)} · ${battle.enemy.kind}.`,
    ...(encounterEffectLine ? [`🧭 Условие встречи: ${encounterEffectLine}`] : []),
    `💨 Тропа назад: ${fleeChancePercent}% · ваша ЛВК ${battle.player.dexterity}, враг ${battle.enemy.dexterity}.`,
    ...renderHintBlock([
      firstMoveLine,
      'До первой стычки ещё можно принять бой или уйти в сторону.',
    ]),
  ];
};

const renderBattleNextGoal = (battle: BattleView, player?: PlayerState): string[] => {
  const nextGoal = buildBattleResultNextGoalView(battle, player);
  if (!nextGoal) {
    return [];
  }

  return renderNextGoalSummary(nextGoal, '👉 Дальше');
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

const splitBattleLogHint = (text: string): { readonly eventLine: string; readonly hintLine: string | null } => {
  const hintMarker = ' Подсказка:';
  const hintIndex = text.indexOf(hintMarker);

  if (hintIndex < 0) {
    return { eventLine: text, hintLine: null };
  }

  return {
    eventLine: text.slice(0, hintIndex).trim(),
    hintLine: text.slice(hintIndex + 1).trim(),
  };
};

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

  const { eventLine, hintLine } = splitBattleLogHint(line.text);

  return [
    `• ${eventLine}`,
    ...(hintLine ? [`  ${renderHintLine(hintLine)}`] : []),
  ].join('\n');
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
    `Добыча: ${formatBattleReward(battle.rewards, { includeDroppedRune: false, includeShards: false })}`,
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
    '🛡️ После поражения',
    defeatFlow.consequenceLine,
    defeatFlow.preservedLine,
    defeatFlow.recoveryLine,
    ...renderHintBlock([defeatFlow.safeRouteLine]),
  ];
};

export const renderBattle = (
  battle: BattleView,
  player?: PlayerState,
  acquisitionSummary?: AcquisitionSummaryView | null,
  viewerPlayerId?: number,
): string => {
  const battleLogLines = selectBattleLogLines(battle.log);
  const clarity = buildBattleClarityView(battle);
  const enemyIntentLine = renderBattleEnemyIntent(clarity.enemyIntentReading);
  const isEncounterOffered = battle.status === 'ACTIVE' && isBattleEncounterOffered(battle);
  const battleStateLine = resolveBattleStateLine(battle, isEncounterOffered);
  const partyOverviewLines = renderPartyBattleOverview(battle, viewerPlayerId);
  const isViewerTurn = isPartyBattleViewerTurn(battle, viewerPlayerId);
  const partyWaitLine = renderPartyBattleWaitLine(battle, viewerPlayerId);
  const rewardLines = renderBattleRewardLines(battle);
  const defeatFlowLines = renderBattleDefeatFlowLines(battle, player);
  const postSessionLines = battle.status === 'COMPLETED' ? renderBattleNextGoal(battle, player) : [];

  return [
    ...(partyOverviewLines.length > 0
      ? [
          ...(battle.status === 'COMPLETED' ? [battleStateLine, ''] : []),
          ...partyOverviewLines,
        ]
      : [
          battleStateLine,
          '',
          'Поле боя',
          ...renderBattlePartyLines(battle, viewerPlayerId),
          renderBattleActorBlock(battle.party ? 'Сейчас действует' : 'Вы', battle.player, { guardPoints: battle.player.guardPoints }),
          renderBattleActorBlock('Враг', battle.enemy),
          '',
        ]),
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
          ...(partyWaitLine ? [partyWaitLine] : []),
          ...(isViewerTurn ? renderHintBlock([clarity.choiceLine, clarity.schoolHintLine]) : []),
          ...(isViewerTurn ? [renderBattleRuneState(battle)] : []),
          ...(isViewerTurn && battle.turnOwner === 'PLAYER' ? [renderBattleActionState(battle, clarity.enemyIntentReading)] : []),
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
