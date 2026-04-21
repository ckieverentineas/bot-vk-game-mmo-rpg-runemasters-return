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

const isEventAvailable = (event: ExplorationEventDefinition, context: ExplorationEventContext): boolean => (
  context.locationLevel >= event.minLocationLevel
  && (!event.schoolCode || event.schoolCode === context.currentSchoolCode)
);

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
