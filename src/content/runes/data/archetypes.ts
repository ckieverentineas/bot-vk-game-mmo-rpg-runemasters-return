import type { RuneArchetypeSeedDefinition } from '../types';

export const runeArchetypeSeed = [
  {
    code: 'ember',
    schoolCode: 'ember',
    name: 'Штурм',
    description: 'Пламенная руна для давления, прямого удара и добивания.',
    passiveAbilityCodes: ['ember_heart'],
    activeAbilityCodes: ['ember_pulse'],
    preferredStats: ['attack', 'health'],
  },
  {
    code: 'stone',
    schoolCode: 'stone',
    name: 'Страж',
    description: 'Каменная руна для стойки, щита и спокойного ответа.',
    passiveAbilityCodes: ['stone_guard'],
    activeAbilityCodes: ['stone_bastion'],
    preferredStats: ['defence', 'health', 'magicDefence'],
  },
  {
    code: 'gale',
    schoolCode: 'gale',
    name: 'Налётчик',
    description: 'Бурная руна для быстрого удара и подготовленного ответа.',
    passiveAbilityCodes: [],
    activeAbilityCodes: ['gale_step'],
    preferredStats: ['dexterity', 'attack'],
  },
  {
    code: 'echo',
    schoolCode: 'echo',
    name: 'Провидец',
    description: 'Руна Прорицания для чтения угроз и точного ответа.',
    passiveAbilityCodes: ['echo_mind'],
    activeAbilityCodes: [],
    preferredStats: ['intelligence', 'magicDefence'],
  },
] satisfies readonly RuneArchetypeSeedDefinition[];
