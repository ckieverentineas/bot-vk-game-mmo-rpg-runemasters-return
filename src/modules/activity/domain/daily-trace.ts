import type { MaterialField, ResourceReward } from '../../../shared/types/game';

export const dailyTraceActivityCode = 'soft_daily_trace' as const;
export type DailyTraceActivityCode = typeof dailyTraceActivityCode;

interface DailyTraceTemplate {
  readonly title: string;
  readonly description: string;
  readonly materialField: MaterialField;
}

export interface DailyTraceView {
  readonly activityCode: DailyTraceActivityCode;
  readonly gameDay: string;
  readonly title: string;
  readonly description: string;
  readonly reward: ResourceReward;
}

const dailyTraceTemplates: readonly DailyTraceTemplate[] = [
  {
    title: 'Тёплый след у костра',
    description: 'На стоянке вспыхивает короткая искра: достаточно поднять её и идти дальше своим темпом.',
    materialField: 'herb',
  },
  {
    title: 'Заметка на старой карте',
    description: 'На полях карты проступает тихая пометка: маленькая польза без долга и расписания.',
    materialField: 'leather',
  },
  {
    title: 'Скол рунического камня',
    description: 'Под ногой звенит крошечный осколок маршрута: он не зовёт завтра, он помогает сейчас.',
    materialField: 'crystal',
  },
  {
    title: 'Пыль у порога алтаря',
    description: 'У алтаря лежит горсть полезной пыли: забрать можно, пропустить тоже нормально.',
    materialField: 'metal',
  },
];

const dailyTraceGoldReward = 6;
const dailyTraceRadianceReward = 1;

export const formatGameDay = (date: Date): string => date.toISOString().slice(0, 10);

const hashGameDay = (gameDay: string): number => (
  [...gameDay].reduce((sum, char) => sum + char.charCodeAt(0), 0)
);

const buildDailyTraceReward = (materialField: MaterialField): ResourceReward => ({
  gold: dailyTraceGoldReward,
  radiance: dailyTraceRadianceReward,
  inventoryDelta: {
    usualShards: 1,
    [materialField]: 1,
  },
});

export const resolveDailyTrace = (now: Date): DailyTraceView => {
  const gameDay = formatGameDay(now);
  const template = dailyTraceTemplates[hashGameDay(gameDay) % dailyTraceTemplates.length];

  return {
    activityCode: dailyTraceActivityCode,
    gameDay,
    title: template.title,
    description: template.description,
    reward: buildDailyTraceReward(template.materialField),
  };
};
