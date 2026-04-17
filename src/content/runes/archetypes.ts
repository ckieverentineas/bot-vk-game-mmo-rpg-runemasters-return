import type { RuneArchetypeSeedDefinition } from './types';

export const runeArchetypeSeed = [
  {
    code: 'ember',
    name: 'Штурм',
    description: 'Атакующий архетип школы Пламени с упором в давление и прямой урон.',
    passiveAbilityCodes: ['ember_heart'],
    activeAbilityCodes: ['ember_pulse'],
    preferredStats: ['attack', 'health'],
  },
  {
    code: 'stone',
    name: 'Страж',
    description: 'Защитный архетип школы Тверди, усиливающий стойкость и контроль поля боя.',
    passiveAbilityCodes: ['stone_guard'],
    activeAbilityCodes: ['stone_bastion'],
    preferredStats: ['defence', 'health', 'magicDefence'],
  },
  {
    code: 'gale',
    name: 'Налётчик',
    description: 'Темповый архетип школы Бури с уклоном в ловкость и ход боя.',
    passiveAbilityCodes: [],
    activeAbilityCodes: ['gale_step'],
    preferredStats: ['dexterity', 'attack'],
  },
  {
    code: 'echo',
    name: 'Провидец',
    description: 'Мистический архетип школы Прорицания, который читает угрозы и обращает их в пользу игрока.',
    passiveAbilityCodes: ['echo_mind'],
    activeAbilityCodes: [],
    preferredStats: ['intelligence', 'magicDefence'],
  },
] satisfies readonly RuneArchetypeSeedDefinition[];
