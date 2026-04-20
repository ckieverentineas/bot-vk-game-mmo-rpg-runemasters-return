import type { BiomeSeedDefinition } from './types';

export const biomeSeed = [
  {
    code: 'initium',
    name: 'Порог Инициации',
    description: 'Нулевая зона для только что пробудившихся мастеров рун.',
    minLevel: 0,
    maxLevel: 0,
  },
  {
    code: 'dark-forest',
    name: 'Тёмный лес',
    description: 'Стартовая чаща для новых мастеров рун.',
    minLevel: 1,
    maxLevel: 15,
  },
  {
    code: 'forgotten-caves',
    name: 'Забытые пещеры',
    description: 'Пещеры, где гоблины воруют руны и металл.',
    minLevel: 16,
    maxLevel: 35,
  },
  {
    code: 'cursed-citadel',
    name: 'Проклятая цитадель',
    description: 'Цитадель рыцарей и магов, не нашедших покоя.',
    minLevel: 36,
    maxLevel: 70,
  },
  {
    code: 'abyss',
    name: 'Бездна',
    description: 'Финальный раскол мира, в котором живут демоны и драконы.',
    minLevel: 71,
    maxLevel: 200,
  },
] satisfies readonly BiomeSeedDefinition[];
