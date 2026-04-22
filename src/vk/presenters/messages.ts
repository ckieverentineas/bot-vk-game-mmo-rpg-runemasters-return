import { gameBalance } from '../../config/game-balance';
import {
  derivePlayerStats,
  getEquippedRune,
  normalizeRuneIndex,
  getRuneEquippedSlot,
  getSelectedRune,
  getUnlockedRuneSlotCount,
  isPlayerInTutorial,
  resolveAdaptiveAdventureLocationLevel,
} from '../../modules/player/domain/player-stats';
import {
  getPlayerSchoolMasteryForArchetype,
  getSchoolMasteryDefinition,
  resolveNextSchoolMasteryThreshold,
} from '../../modules/player/domain/school-mastery';
import { type AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildBattleClarityView } from '../../modules/combat/application/read-models/battle-clarity';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import { listBattleRuneLoadouts } from '../../modules/combat/domain/battle-rune-loadouts';
import {
  buildBattleResultNextGoalView,
  buildPlayerNextGoalView,
} from '../../modules/player/application/read-models/next-goal';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import { resolveDefendGuardGain } from '../../modules/combat/domain/battle-tactics';
import { describeRuneContent } from '../../modules/runes/domain/rune-abilities';
import { buildRuneCollectionPage } from '../../modules/runes/domain/rune-collection';
import {
  getRuneSchoolPresentation,
  getSchoolDefinitionForArchetype,
  listSchoolDefinitions,
} from '../../modules/runes/domain/rune-schools';
import {
  getPlayerSkillDefinition,
  resolveNextPlayerSkillThreshold,
} from '../../modules/player/domain/player-skills';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import {
  getExplorationSceneEffectLine,
  type ExplorationSceneView,
} from '../../modules/world/domain/exploration-events';
import type { AbilityDefinition, BattleView, PlayerState, RuneDraft, RuneView, StatBlock } from '../../shared/types/game';

const formatStatBlock = (stats: StatBlock): string => [
  `❤️ Здоровье: ${stats.health}`,
  `⚔️ Атака: ${stats.attack}`,
  `🛡️ Физ. защита: ${stats.defence}`,
  `🔮 Маг. защита: ${stats.magicDefence}`,
  `💨 Ловкость: ${stats.dexterity}`,
  `🧠 Интеллект: ${stats.intelligence}`,
].join('\n');

const runeStatSummaryOrder: readonly (keyof StatBlock)[] = [
  'attack',
  'health',
  'defence',
  'dexterity',
  'magicDefence',
  'intelligence',
];

const runeStatSummaryLabels: Record<keyof StatBlock, string> = {
  health: 'ЗДР',
  attack: 'АТК',
  defence: 'ФЗАЩ',
  magicDefence: 'МЗАЩ',
  dexterity: 'ЛВК',
  intelligence: 'ИНТ',
};

const formatRuneStatSummary = (stats: StatBlock, limit = 3): string => {
  const parts = runeStatSummaryOrder
    .filter((key) => stats[key] > 0)
    .sort((left, right) => stats[right] - stats[left])
    .slice(0, limit)
    .map((key) => `${runeStatSummaryLabels[key]} +${stats[key]}`);

  return parts.length > 0 ? parts.join(' · ') : 'Без бонусов';
};

const schoolIconByCode: Readonly<Record<string, string>> = {
  ember: '🔥',
  stone: '🪨',
  gale: '🌪️',
  echo: '🧠',
};

const archetypeIconByCode: Readonly<Record<string, string>> = {
  ember: '⚔️',
  stone: '🛡️',
  gale: '💨',
  echo: '👁️',
};

const normalizeRuneDisplayName = (name: string): string => (
  name.replace(/руна\s+руна/gi, 'руна')
);

const formatRuneDisplayName = (rune: Pick<RuneDraft, 'name'> | null | undefined): string => (
  rune ? normalizeRuneDisplayName(rune.name) : 'нет руны'
);

const resolveRuneSchoolIcon = (rune: Pick<RuneDraft, 'archetypeCode'>): string => {
  const school = getSchoolDefinitionForArchetype(rune.archetypeCode);
  return school ? schoolIconByCode[school.code] ?? '🔹' : '🔹';
};

const resolveRuneArchetypeIcon = (rune: Pick<RuneDraft, 'archetypeCode'>): string | null => {
  if (!rune.archetypeCode) {
    return null;
  }

  return archetypeIconByCode[rune.archetypeCode] ?? null;
};

const renderStarterSchoolLine = (): string => {
  const schoolNames = listSchoolDefinitions().map(({ name }) => name);
  return schoolNames.length > 0
    ? `Стартовые школы: ${schoolNames.join(', ')}.`
    : 'Стартовые школы уже ждут первую боевую руну.';
};

const withSentencePeriod = (text: string): string => /[.!?]$/.test(text) ? text : `${text}.`;

const formatActiveAbilityCost = (ability: AbilityDefinition): string => [
  `${ability.manaCost} маны`,
  ability.cooldownTurns > 0 ? `КД ${ability.cooldownTurns}` : null,
].filter((part): part is string => part !== null).join(' · ');

const formatActiveAbilityDetails = (ability: AbilityDefinition): string => (
  `🌀 ${ability.name} · ${formatActiveAbilityCost(ability)}\n${withSentencePeriod(ability.description)}`
);

const formatPassiveAbilityDetails = (ability: AbilityDefinition): string => (
  `🛡️ ${ability.name}\n${withSentencePeriod(ability.description)}`
);

const formatRuneStatDetails = (stats: StatBlock): string[] => {
  const lines = runeStatSummaryOrder
    .filter((key) => stats[key] > 0)
    .map((key) => `${runeStatSummaryLabels[key]} +${stats[key]}`);

  return lines.length > 0
    ? ['Бонусы:', ...lines]
    : ['Бонусы: нет'];
};

const inventoryFieldLabels = {
  USUAL: 'обычные осколки',
  UNUSUAL: 'необычные осколки',
  RARE: 'редкие осколки',
  EPIC: 'эпические осколки',
  LEGENDARY: 'легендарные осколки',
  MYTHICAL: 'мифические осколки',
  usualShards: 'обычные осколки',
  unusualShards: 'необычные осколки',
  rareShards: 'редкие осколки',
  epicShards: 'эпические осколки',
  legendaryShards: 'легендарные осколки',
  mythicalShards: 'мифические осколки',
  leather: 'кожа',
  bone: 'кость',
  herb: 'трава',
  essence: 'эссенция',
  metal: 'металл',
  crystal: 'кристалл',
} as const;

const formatRuneAbilityDetails = (runeContent: ReturnType<typeof describeRuneContent>): string[] => [
  ...(runeContent.activeAbilities.length > 0
    ? ['Активный навык:', ...runeContent.activeAbilities.map(formatActiveAbilityDetails)]
    : []),
  ...(runeContent.passiveAbilities.length > 0
    ? ['Пассивные эффекты:', ...runeContent.passiveAbilities.map(formatPassiveAbilityDetails)]
    : []),
];

const renderAcquisitionSummary = (summary: AcquisitionSummaryView | null | undefined): string[] => {
  if (!summary) {
    return [];
  }

  return [
    '',
    `✨ Перемена: ${withSentencePeriod(summary.title)}`,
    ...(summary.nextStepLine ? [`👉 Следом: ${withSentencePeriod(summary.nextStepLine)}`] : []),
  ];
};

const renderNextGoalSummary = (
  nextGoal: ReturnType<typeof buildPlayerNextGoalView>,
  actionPrefix = '👉 Сделать шаг',
): string[] => [
  `🎯 След: ${withSentencePeriod(nextGoal.objectiveText)}`,
  ...(nextGoal.whyText ? [`🜂 Зачем идти: ${withSentencePeriod(nextGoal.whyText)}`] : []),
  `${actionPrefix}: «${nextGoal.primaryActionLabel}».`,
];

const renderSchoolFirstLoopLine = (): string => 'Путь первого входа: базовая атака → первая боевая руна → школа рун → новый стиль боя.';
const renderSchoolFirstRarityLine = (): string => 'Сначала первая руна открывает школу рун, а новая редкость позже расширяет сборку.';

const formatInventoryDelta = (delta: Record<string, number | undefined>): string => {
  const parts = Object.entries(delta)
    .filter(([, amount]) => amount !== undefined && amount > 0)
    .map(([field, amount]) => {
      const label = inventoryFieldLabels[field as keyof typeof inventoryFieldLabels] ?? field;
      return `+${amount} ${label}`;
    });

  return parts.length > 0 ? parts.join(' · ') : 'без дополнительных материалов';
};

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

const formatSkillTitles = (skillCodes: readonly string[]): string => {
  const titles = skillCodes
    .map((skillCode) => getPlayerSkillDefinition(skillCode)?.title ?? skillCode);

  return titles.length > 0 ? titles.join(', ') : 'без роста навыка';
};

const formatTrophyActionPreview = (action: PendingRewardView['snapshot']['trophyActions'][number]): string => {
  const rewardLine = action.reward ? formatInventoryDelta(action.reward.inventoryDelta) : 'добыча без предпросмотра';
  return `${action.label} — ${rewardLine}; мастерство: ${formatSkillTitles(action.skillCodes)}.`;
};

const formatPlayerSkillProgress = (skill: NonNullable<PlayerState['skills']>[number]): string => {
  const definition = getPlayerSkillDefinition(skill.skillCode);
  const nextThreshold = resolveNextPlayerSkillThreshold(skill.rank);
  const progress = nextThreshold === null
    ? `${skill.experience} опыта`
    : `${skill.experience}/${nextThreshold}`;

  return `${definition?.title ?? skill.skillCode}: ранг ${skill.rank} · ${progress}`;
};

const renderPlayerSkillsBlock = (player: PlayerState): readonly string[] => {
  const skills = [...(player.skills ?? [])].sort((left, right) => (
    right.experience - left.experience || left.skillCode.localeCompare(right.skillCode)
  ));

  if (skills.length === 0) {
    return ['Навыки: пока нет опыта обработки трофеев.'];
  }

  return [
    'Навыки:',
    ...skills.map(formatPlayerSkillProgress),
  ];
};

export const renderPendingReward = (
  pendingReward: PendingRewardView,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  const sourceLine = pendingReward.source
    ? `${pendingReward.source.enemyName} повержен. На поле остался трофей: можно забрать всё как есть или обработать добычу.`
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
  const selectedAction = result.pendingReward.snapshot.trophyActions.find((action) => action.code === result.selectedActionCode);
  const skillLines = result.appliedResult.skillUps.map((skillUp) => {
    const title = getPlayerSkillDefinition(skillUp.skillCode)?.title ?? skillUp.skillCode;
    return `${title}: ${skillUp.experienceBefore} → ${skillUp.experienceAfter}`;
  });
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

const renderSchoolMasteryLine = (player: PlayerState): string => {
  if (player.runes.length === 0) {
    return 'Мастерство школы: откроется после первой боевой руны.';
  }

  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const mastery = getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode);
  if (!equippedRune || !equippedSchool || !mastery) {
    return 'Мастерство школы: наденьте руну, чтобы начать путь конкретной школы.';
  }

  const definition = getSchoolMasteryDefinition(mastery.schoolCode);
  const nextThreshold = resolveNextSchoolMasteryThreshold(mastery.rank);
  const nextUnlock = definition?.unlocks.find((entry) => entry.rank === mastery.rank + 1) ?? null;
  const currentUnlock = definition?.unlocks.find((entry) => entry.rank === mastery.rank) ?? null;

  if (nextThreshold === null) {
    return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank}${currentUnlock ? ` · открыто: ${currentUnlock.title}.` : '.'}`;
  }

  return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank} · ${mastery.experience}/${nextThreshold} до «${nextUnlock?.title ?? 'новой вехи'}».`;
};

const resolveReturnStateLine = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return 'Путь: учебная тропа ещё горит · до первой руны и школы остался один бой.';
  }

  if (isPlayerInTutorial(player)) {
    return 'Путь: учебная зона остаётся безопасной стоянкой, но настоящая сила ждёт в приключениях.';
  }

  return `Путь: уровень ${player.level} · зов угрозы ${resolveAdaptiveAdventureLocationLevel(player)} · самый дальний след ${player.highestLocationLevel}.`;
};

const resolveReturnStyleLine = (player: PlayerState): string => {
  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);

  if (!player.runes.length) {
    return 'Стиль: первая школа рун откроется после первой боевой руны.';
  }

  if (!equippedRune) {
    return 'Стиль: руны уже собраны, но ни одна ещё не надета.';
  }

  if (equippedSchool) {
    return `Стиль: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`;
  }

  return `Стиль: экипирована руна ${formatRuneDisplayName(equippedRune)}.`;
};

export const renderReturnRecap = (player: PlayerState, title = '🧭 Возвращение'): string => {
  const nextGoal = buildPlayerNextGoalView(player);
  const recognition = buildPlayerSchoolRecognitionView(player);

  return [
    title,
    '',
    resolveReturnStateLine(player),
    resolveReturnStyleLine(player),
    ...(recognition ? [`Статус школы: ${withSentencePeriod(recognition.statusLine)}`] : []),
    ...renderNextGoalSummary(nextGoal, '🧭 Дальше'),
  ].join('\n');
};

const formatRune = (rune: RuneView | null): string => {
  if (!rune) {
    return 'Выбрано: нет руны.';
  }

  const runeContent = describeRuneContent(rune);
  const school = getRuneSchoolPresentation(rune.archetypeCode);

  return [
    (() => {
      const equippedSlot = getRuneEquippedSlot(rune);
      if (equippedSlot !== null) {
        return `✅ Надета: слот ${equippedSlot + 1}`;
      }
      return '🎯 Выбрана';
    })(),
    `Руна: ${formatRuneDisplayName(rune)}`,
    `Редкость: ${gameBalance.runes.profiles[rune.rarity].title}${school ? ` · ${school.name}` : ''}`,
    ...(school ? [`Стиль: ${school.playPatternLine}`] : []),
    ...formatRuneStatDetails({
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    }),
    ...formatRuneAbilityDetails(runeContent),
  ].join('\n');
};

const formatRunePageEntryStatus = (equippedSlot: number | null): string | null => {
  if (equippedSlot !== null) {
    return `✅ слот ${equippedSlot + 1}`;
  }

  return null;
};

const formatRunePageEntryRole = (rune: RuneView): string | null => {
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const archetypeIcon = resolveRuneArchetypeIcon(rune);

  if (!school) {
    return null;
  }

  return archetypeIcon ? `${archetypeIcon} ${school.roleName}` : school.roleName;
};

const formatRunePageEntry = (
  slot: number,
  rune: RuneView,
): string => {
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const status = formatRunePageEntryStatus(getRuneEquippedSlot(rune));

  return [
    `${slot + 1}. ${resolveRuneSchoolIcon(rune)} ${formatRuneDisplayName(rune)}`,
    ...(status ? [status] : []),
    school?.name ?? 'без школы',
    formatRunePageEntryRole(rune),
    formatRuneStatSummary(rune),
  ].filter((part): part is string => Boolean(part)).join(' · ');
};

export const renderWelcome = (player: PlayerState, created: boolean): string => {
  if (created) {
    const nextGoal = buildPlayerNextGoalView(player);

    return [
      '🎮 Добро пожаловать в Runemasters Return!',
      '',
      'Ваш мастер создан.',
      'Сначала — короткий учебный бой.',
      renderSchoolFirstLoopLine(),
      renderSchoolFirstRarityLine(),
      renderStarterSchoolLine(),
      `Стартовые осколки: обычные ${player.inventory.usualShards}, необычные ${player.inventory.unusualShards}, редкие ${player.inventory.rareShards}.`,
      '',
      ...renderNextGoalSummary(nextGoal, '▶ Начать'),
    ].join('\n');
  }

  return renderReturnRecap(player);
};

export const renderMainMenu = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const equippedRune = getEquippedRune(player);
  const inTutorial = isPlayerInTutorial(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const nextGoal = buildPlayerNextGoalView(player);
  const recognition = buildPlayerSchoolRecognitionView(player);

  return [
    '🏰 Стоянка рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    inTutorial
      ? '📘 Учебный круг: открыт'
      : `🎯 Зов угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `💰 Руная пыль: ${player.gold}`,
    `🧭 Самый дальний след: ${player.highestLocationLevel}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
    `🔮 Экипирована: ${formatRuneDisplayName(equippedRune)}`,
    renderSchoolMasteryLine(player),
    ...(player.tutorialState === 'ACTIVE' ? ['🜂 Первый бой ведёт к первой руне, а первая руна открывает школу рун.'] : []),
    ...(equippedSchool ? [`🜂 Ваш путь: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`] : []),
    player.defeatStreak > 0
      ? `🛡️ Поражений подряд: ${player.defeatStreak}. Сложность уже смягчена.`
      : `🔥 Побед подряд: ${player.victoryStreak}`,
    ...(recognition ? [`⭐ ${recognition.title}: ${withSentencePeriod(recognition.statusLine)}`] : []),
    ...renderNextGoalSummary(nextGoal),
    '',
    `⚔️ Боевая мощь: АТК ${stats.attack} / ЗДР ${stats.health}`,
  ].join('\n');
};

export const renderProfile = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const nextLevelXp = gameBalance.progression.experienceForNextLevel(player.level);

  return [
    '👤 Летопись рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    `📊 Опыт: ${player.experience}/${nextLevelXp}`,
    `💰 Руная пыль: ${player.gold}`,
    `🏆 Победы / Поражения: ${player.victories}/${player.defeats}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
    renderSchoolMasteryLine(player),
    'Сила растёт через руны, школу и мастерство, а не через сухую раздачу чисел.',
    '',
    ...renderPlayerSkillsBlock(player),
    '',
    formatStatBlock(stats),
  ].join('\n');
};

export const renderInventory = (player: PlayerState): string => [
  '🎒 Инвентарь',
  '',
  `Обычные осколки: ${player.inventory.usualShards}`,
  `Необычные осколки: ${player.inventory.unusualShards}`,
  `Редкие осколки: ${player.inventory.rareShards}`,
  `Эпические осколки: ${player.inventory.epicShards}`,
  `Легендарные осколки: ${player.inventory.legendaryShards}`,
  `Мифические осколки: ${player.inventory.mythicalShards}`,
  '',
  `Кожа: ${player.inventory.leather}, Кость: ${player.inventory.bone}, Трава: ${player.inventory.herb}`,
  `Эссенция: ${player.inventory.essence}, Металл: ${player.inventory.metal}, Кристалл: ${player.inventory.crystal}`,
].join('\n');

export const renderLocation = (player: PlayerState): string => [
  '📘 Учебный круг',
  '',
  player.tutorialState === 'ACTIVE'
    ? 'Учебный круг ещё открыт: первый бой безопасен, а первая руна покажет школу.'
    : player.tutorialState === 'SKIPPED'
      ? 'Учебный круг оставлен позади. Дорога силы идёт через «⚔️ Исследовать».'
      : 'Учебный круг завершён. Дорога силы идёт через «⚔️ Исследовать».',
  '',
  player.tutorialState === 'ACTIVE'
    ? `Сначала мастер проходит бой базовой атакой, затем забирает первую руну и видит, как школа меняет стиль боя. ${renderStarterSchoolLine()}`
    : 'Старые учебные тропы больше не тянут героя назад. Дальше идут обычные приключения.',
  '',
  isPlayerInTutorial(player)
    ? 'Учебная зона тише большого мира: здесь удобно почувствовать первый бой.'
    : 'Дороги открыты. Угроза подстраивается под вашу силу и след последних боёв.',
  `🎯 Зов угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
  `🧭 Максимально пройденная сложность: ${player.highestLocationLevel}`,
  player.defeatStreak > 0
    ? `🛡️ После поражений подряд (${player.defeatStreak}) враги становятся слабее, чтобы следующий бой читался спокойнее.`
    : `🔥 Серия побед подряд: ${player.victoryStreak}`,
  ...renderNextGoalSummary(buildPlayerNextGoalView(player)),
].join('\n');

export const renderExplorationEvent = (event: ExplorationSceneView, player: PlayerState): string => {
  const effectLine = getExplorationSceneEffectLine(event);

  return [
    '🧭 Исследование',
    '',
    event.title,
    ...(event.kindLabel ? [`Знак: ${event.kindLabel}`] : []),
    ...(event.directorLine ? [event.directorLine] : []),
    event.description,
    '',
    event.outcomeLine,
    ...(effectLine ? [effectLine] : []),
    event.nextStepLine,
    '',
    ...renderNextGoalSummary(buildPlayerNextGoalView(player), '👉 Продолжить'),
  ].join('\n');
};

const renderEquippedRuneSlots = (player: PlayerState): string => {
  const slotLines = Array.from({ length: getUnlockedRuneSlotCount(player) }, (_, slot) => {
    const rune = getEquippedRune(player, slot);
    return `${slot + 1}. ${rune ? formatRuneDisplayName(rune) : 'пусто'}`;
  });

  return `Надето: ${slotLines.join(' · ')}`;
};

const countEquippedRunes = (player: PlayerState): number => (
  Array.from({ length: getUnlockedRuneSlotCount(player) }, (_, slot) => getEquippedRune(player, slot))
    .filter((rune): rune is RuneView => rune !== null)
    .length
);

const renderEquippedRuneCounter = (player: PlayerState): string => {
  const unlockedSlotCount = getUnlockedRuneSlotCount(player);
  return `🧩 Рун надето ✅${countEquippedRunes(player)}/${unlockedSlotCount}`;
};

export const renderRuneScreen = (player: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const page = buildRuneCollectionPage(player);

  if (player.runes.length === 0) {
    return [
      '🔮 Руны',
      '',
      'У вас пока нет рун.',
      'Первая боевая руна откроет школу рун и задаст ваш ранний стиль боя.',
      renderStarterSchoolLine(),
      `Создание руны стоит ${gameBalance.runes.craftCost} осколков одной редкости.`,
      'Новая редкость позже расширит сборку, а сейчас важнее открыть первую школу рун.',
      'Победы и алтарь помогут собрать первую руну.',
    ].join('\n');
  }

  return [
    '🔮 Руны:',
    renderEquippedRuneCounter(player),
    ...renderAcquisitionSummary(acquisitionSummary),
    '',
    ...page.entries.map((entry) => formatRunePageEntry(entry.slot, entry.rune)),
    '',
    `Страница ${page.pageNumber} из ${page.totalPages}`,
  ].join('\n');
};

export const renderRuneDetailScreen = (
  player: PlayerState,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  if (player.runes.length === 0) {
    return renderRuneScreen(player, acquisitionSummary);
  }

  const selectedRune = getSelectedRune(player);
  const selectedRuneNumber = normalizeRuneIndex(player.currentRuneIndex, player.runes.length) + 1;

  return [
    '🔮 Руна',
    '',
    `Руна ${selectedRuneNumber} из ${player.runes.length}`,
    renderEquippedRuneSlots(player),
    ...renderAcquisitionSummary(acquisitionSummary),
    '',
    formatRune(selectedRune),
  ].join('\n');
};

export const renderAltar = (player: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => (
  renderRuneDetailScreen(player, acquisitionSummary)
);

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

const renderBattleActorStats = (actor: Pick<StatBlock, 'attack' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence'>): string => (
  `📊 Черты: ⚔️ ${actor.attack} · 🛡️ ${actor.defence} · 🔮 ${actor.magicDefence} · 💨 ${actor.dexterity} · 🧠 ${actor.intelligence}`
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
  const healthLine = `❤️ ${renderMeter(actor.currentHealth, actor.maxHealth, 10, resolveHealthMeterSegment(actor.currentHealth, actor.maxHealth))} ${actor.currentHealth}/${actor.maxHealth} HP`;
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
      return `🔮 Слот ${slot + 1}: ${loadout.runeName} · тихий знак держит силу.`;
    }

    const state = activeAbility.currentCooldown > 0
      ? `откат ${activeAbility.currentCooldown} хода`
      : battle.player.currentMana < activeAbility.manaCost
        ? `нужно ${activeAbility.manaCost} маны`
        : 'готово';

    return `🌀 Слот ${slot + 1}: ${activeAbility.name} — ${state}`;
  }).join('\n');
};

const renderBattleEnemyIntent = (battle: BattleView): string | null => {
  const intent = battle.enemy.intent;
  if (!intent) {
    return null;
  }

  return `⚠️ Враг выдаёт замысел: ${intent.title}. ${intent.description}`;
};

const renderBattleActionState = (battle: BattleView): string => {
  const defendGain = resolveDefendGuardGain(battle.player);
  const actions = ['⚔️ Атака', `🛡️ Защита (+${defendGain} щит)`];

  actions.push(
    ...listBattleRuneLoadouts(battle.player)
      .flatMap(({ slot, loadout }) => (
        loadout.activeAbility ? [`🌀 ${slot + 1}: ${loadout.activeAbility.name}`] : []
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
    return `… ещё ${line.omittedCount} ${formatBattleEventWord(line.omittedCount)} между нынешним мигом и началом схватки`;
  }

  return `• ${line.text}`;
};

export const renderBattle = (battle: BattleView, player?: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const battleLogLines = selectBattleLogLines(battle.log);
  const clarity = buildBattleClarityView(battle);
  const enemyIntentLine = renderBattleEnemyIntent(battle);
  const isEncounterOffered = battle.status === 'ACTIVE' && isBattleEncounterOffered(battle);
  const battleStateLine = isEncounterOffered
    ? '🧭 Встреча'
    : battle.status === 'ACTIVE'
    ? battle.turnOwner === 'PLAYER'
      ? '⚔️ Бой — ваш ход'
      : '⚔️ Бой — ход врага'
    : battle.result === 'VICTORY'
      ? '🏁 Победа'
      : battle.result === 'FLED'
        ? '💨 Отступление'
        : '💥 Поражение';

  const rewardLines = battle.status === 'COMPLETED' && battle.rewards
    ? [
        '',
        `Добыча: +${battle.rewards.experience} опыта · +${battle.rewards.gold} пыли`,
        ...(battle.rewards.droppedRune ? (() => {
          const droppedSchool = getRuneSchoolPresentation(battle.rewards?.droppedRune?.archetypeCode);
          return [
            `Руна: ${formatRuneDisplayName(battle.rewards.droppedRune)}`,
            ...(droppedSchool ? [`Школа: ${droppedSchool.name}.`] : []),
          ];
        })() : []),
      ]
    : [];

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
          ...(clarity.schoolHintLine ? [clarity.schoolHintLine] : []),
          renderBattleRuneState(battle),
          ...(battle.turnOwner === 'PLAYER' ? [renderBattleActionState(battle)] : []),
          '',
        ]
      : []),
    'Летопись схватки',
    ...battleLogLines.map(renderBattleLogLine),
    ...rewardLines,
    ...renderAcquisitionSummary(acquisitionSummary),
    ...postSessionLines,
  ].join('\n');
};
