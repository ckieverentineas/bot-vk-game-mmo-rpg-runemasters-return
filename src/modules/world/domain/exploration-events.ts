import type { BiomeView } from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';

export interface ExplorationEventContext {
  readonly biome: BiomeView;
  readonly currentSchoolCode: string | null;
  readonly locationLevel: number;
}

interface ExplorationEventDefinition {
  readonly code: string;
  readonly minLocationLevel: number;
  readonly schoolCode?: string;
  readonly line: string;
}

export type ExplorationSceneKind =
  | 'rest'
  | 'resource_find'
  | 'school_clue'
  | 'trial_master'
  | 'danger_sign';

export interface ExplorationSceneView {
  readonly code: string;
  readonly kind: ExplorationSceneKind;
  readonly kindLabel: string;
  readonly title: string;
  readonly description: string;
  readonly outcomeLine: string;
  readonly nextStepLine: string;
}

interface ExplorationSceneDefinition extends ExplorationSceneView {
  readonly minLocationLevel: number;
  readonly schoolCode?: string;
}

const explorationSceneKindLabels: Readonly<Record<ExplorationSceneKind, string>> = {
  rest: 'передышка',
  resource_find: 'находка',
  school_clue: 'школьный след',
  trial_master: 'Мастер испытаний',
  danger_sign: 'опасный знак',
};

const explorationEvents: readonly ExplorationEventDefinition[] = [
  {
    code: 'quiet-trail',
    minLocationLevel: 1,
    line: '🧭 Путевой эпизод: вы находите свежие следы и заранее понимаете, откуда придёт угроза.',
  },
  {
    code: 'old-rune-marker',
    minLocationLevel: 1,
    line: '🧭 Путевой эпизод: на камне вспыхивает старый рунный знак. Он не даёт силы, но помогает прочитать настроение места.',
  },
  {
    code: 'safe-crossing',
    minLocationLevel: 2,
    line: '🧭 Путевой эпизод: вы отмечаете безопасный проход для будущих экспедиций и идёте дальше без лишнего шума.',
  },
  {
    code: 'ember-scent',
    minLocationLevel: 1,
    schoolCode: 'ember',
    line: '🧭 Путевой эпизод: Пламя в руне откликается на запах пепла. Впереди бой, где давление важнее ожидания.',
  },
  {
    code: 'stone-tremor',
    minLocationLevel: 1,
    schoolCode: 'stone',
    line: '🧭 Путевой эпизод: Твердь под ногами дрожит. Впереди лучше держать стойку и не тратить защиту вслепую.',
  },
  {
    code: 'gale-shift',
    minLocationLevel: 1,
    schoolCode: 'gale',
    line: '🧭 Путевой эпизод: Буря меняет направление ветра. Впереди пригодится ход, который сразу готовит следующий ответ.',
  },
  {
    code: 'echo-sign',
    minLocationLevel: 1,
    schoolCode: 'echo',
    line: '🧭 Путевой эпизод: Прорицание ловит короткий знак будущего. Впереди важно читать угрозу, а не угадывать.',
  },
];

const standaloneExplorationScenes: readonly ExplorationSceneDefinition[] = [
  {
    code: 'quiet-rest',
    kind: 'rest',
    kindLabel: explorationSceneKindLabels.rest,
    minLocationLevel: 1,
    title: '🌿 Тихая передышка',
    description: 'Вы находите сухой уступ под корнями и на несколько минут уходите с линии угрозы.',
    outcomeLine: 'Боя нет: экспедиция получает паузу без штрафов, таймеров и скрытого давления возвращаться быстрее.',
    nextStepLine: 'Когда будете готовы, можно снова двинуться глубже.',
  },
  {
    code: 'broken-ward',
    kind: 'danger_sign',
    kindLabel: explorationSceneKindLabels.danger_sign,
    minLocationLevel: 1,
    title: '🔎 Сломанная печать',
    description: 'На камне проступает старый защитный узор. Он уже не держит силу, зато ясно показывает, где раньше проходила безопасная тропа.',
    outcomeLine: 'Боя нет: вы лучше понимаете местность и не тратите ход на случайную стычку.',
    nextStepLine: 'Следующая вылазка может привести к настоящей встрече.',
  },
  {
    code: 'abandoned-camp',
    kind: 'resource_find',
    kindLabel: explorationSceneKindLabels.resource_find,
    minLocationLevel: 1,
    title: '🎒 Брошенный привал',
    description: 'Под навесом из корней лежат следы чужой экспедиции: пустые фляги, сухие травы и крошка рунной пыли на ткани.',
    outcomeLine: 'Боя нет: вы понимаете, какие материалы чаще встречаются здесь, но не получаете награду просто за удачный шаг.',
    nextStepLine: 'Дальше можно искать бой, след школы или явную добычу в обычной системе наград.',
  },
  {
    code: 'fresh-clawmarks',
    kind: 'danger_sign',
    kindLabel: explorationSceneKindLabels.danger_sign,
    minLocationLevel: 2,
    title: '⚠️ Свежие зарубки',
    description: 'На коре видны глубокие отметины. Угроза рядом, но сейчас вы замечаете её раньше, чем она замечает вас.',
    outcomeLine: 'Боя нет: сцена предупреждает о роли будущего врага и не превращает опасность в внезапный штраф.',
    nextStepLine: 'Следующий шаг может привести к стычке, где это предупреждение поможет прочитать первый ход.',
  },
  {
    code: 'trial-master-mark',
    kind: 'trial_master',
    kindLabel: explorationSceneKindLabels.trial_master,
    minLocationLevel: 2,
    title: '🎲 След Мастера испытаний',
    description: 'На старом указателе вы замечаете пометку Мастера испытаний: не приказ, а короткую подсказку к тому, какой вопрос задаёт эта местность.',
    outcomeLine: 'Мастер не раздаёт силу, не ставит таймер и не требует зайти позже: это только честный PvE-framing будущей сцены.',
    nextStepLine: 'Продолжайте маршрут в своём темпе.',
  },
  {
    code: 'ember-crosswind',
    kind: 'school_clue',
    kindLabel: explorationSceneKindLabels.school_clue,
    minLocationLevel: 1,
    schoolCode: 'ember',
    title: '🔥 Пепельная развилка',
    description: 'Руна Пламени ловит запах старого кострища. Тропа подсказывает: впереди полезнее давить темпом, чем ждать идеального момента.',
    outcomeLine: 'Боя нет: вы получаете school-aware clue без награды за срочность и без обязательного боя.',
    nextStepLine: 'Следующая встреча лучше проверит давление Пламени.',
  },
  {
    code: 'stone-shelter',
    kind: 'school_clue',
    kindLabel: explorationSceneKindLabels.school_clue,
    minLocationLevel: 1,
    schoolCode: 'stone',
    title: '🪨 Каменная ниша',
    description: 'Твердь отзывается в стене старого прохода. Здесь удобно переждать шум и ещё раз почувствовать ритм защитной стойки.',
    outcomeLine: 'Боя нет: сцена укрепляет чтение школы, а не выдаёт силу за посещение.',
    nextStepLine: 'Следующий бой покажет, где защита нужна, а где её будут ломать.',
  },
  {
    code: 'gale-updraft',
    kind: 'school_clue',
    kindLabel: explorationSceneKindLabels.school_clue,
    minLocationLevel: 1,
    schoolCode: 'gale',
    title: '🌪️ Встречный поток',
    description: 'Буря резко меняет направление ветра и открывает обходную тропу. Вы проходите место риска без лишнего шума.',
    outcomeLine: 'Боя нет: событие подчёркивает темп школы без новой initiative-системы.',
    nextStepLine: 'Дальше можно искать встречу, где быстрый ответ решит больше.',
  },
  {
    code: 'echo-omen',
    kind: 'school_clue',
    kindLabel: explorationSceneKindLabels.school_clue,
    minLocationLevel: 1,
    schoolCode: 'echo',
    title: '🧠 Тихое предзнаменование',
    description: 'Прорицание собирает короткий узор из следов, ветра и чужого молчания. Угроза рядом, но сейчас её можно обойти.',
    outcomeLine: 'Боя нет: вы выигрываете понимание, а не случайную награду.',
    nextStepLine: 'Следующая сцена лучше проверит чтение намерений.',
  },
];

const isEventAvailable = (event: ExplorationEventDefinition, context: ExplorationEventContext): boolean => (
  context.locationLevel >= event.minLocationLevel
  && (!event.schoolCode || event.schoolCode === context.currentSchoolCode)
);

const isSceneAvailable = (event: ExplorationSceneDefinition, context: ExplorationEventContext): boolean => (
  context.locationLevel >= event.minLocationLevel
  && (!event.schoolCode || event.schoolCode === context.currentSchoolCode)
);

const toSceneView = (event: ExplorationSceneDefinition): ExplorationSceneView => ({
  code: event.code,
  kind: event.kind,
  kindLabel: event.kindLabel,
  title: event.title,
  description: event.description,
  outcomeLine: event.outcomeLine,
  nextStepLine: event.nextStepLine,
});

export const resolveStandaloneExplorationEvent = (
  context: ExplorationEventContext,
  random: Pick<GameRandom, 'rollPercentage' | 'pickOne'>,
): ExplorationSceneView | null => {
  if (context.biome.code === 'initium' || !random.rollPercentage(25)) {
    return null;
  }

  const availableEvents = standaloneExplorationScenes.filter((event) => isSceneAvailable(event, context));
  if (availableEvents.length === 0) {
    return null;
  }

  return toSceneView(random.pickOne(availableEvents));
};

export const resolveExplorationEventLine = (
  context: ExplorationEventContext,
  random: Pick<GameRandom, 'rollPercentage' | 'pickOne'>,
): string | null => {
  if (context.biome.code === 'initium' || !random.rollPercentage(35)) {
    return null;
  }

  const availableEvents = explorationEvents.filter((event) => isEventAvailable(event, context));
  if (availableEvents.length === 0) {
    return null;
  }

  return random.pickOne(availableEvents).line;
};
