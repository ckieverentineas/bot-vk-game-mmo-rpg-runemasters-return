import type { RuneArchetypeSeedDefinition } from './types';

export const runeArchetypeSeed = [
  {
    code: 'ember',
    name: 'Уголь',
    description: 'Атакующий архетип с упором в давление и прямой урон.',
    passiveAbilityCodes: ['ember_heart'],
    activeAbilityCodes: ['ember_pulse'],
    preferredStats: ['attack', 'health'],
  },
  {
    code: 'stone',
    name: 'Камень',
    description: 'Защитный архетип, усиливающий стойкость и контроль поля боя.',
    passiveAbilityCodes: ['stone_guard'],
    activeAbilityCodes: [],
    preferredStats: ['defence', 'health', 'magicDefence'],
  },
  {
    code: 'gale',
    name: 'Шквал',
    description: 'Темповый архетип с уклоном в ловкость и ход боя.',
    passiveAbilityCodes: [],
    activeAbilityCodes: ['gale_step'],
    preferredStats: ['dexterity', 'attack'],
  },
  {
    code: 'echo',
    name: 'Эхо',
    description: 'Мистический архетип, который готовит основу под магические рунные эффекты.',
    passiveAbilityCodes: ['echo_mind'],
    activeAbilityCodes: [],
    preferredStats: ['intelligence', 'magicDefence'],
  },
] satisfies readonly RuneArchetypeSeedDefinition[];
