import type { StatKey } from '../../shared/types/game';
import { runeCollectionPageSize } from '../../modules/runes/domain/rune-collection';

export const gameCommands = {
  start: 'начать',
  backToMenu: 'назад',
  deletePlayer: 'удалить персонажа',
  profile: 'профиль',
  inventory: 'инвентарь',
  location: 'локация',
  skipTutorial: 'пропустить обучение',
  returnToAdventure: 'в приключения',
  resetStats: 'сброс',
  explore: 'исследовать',
  attack: 'атака',
  defend: 'защита',
  skills: 'навыки',
  spell: 'спелл',
  runeCollection: 'руна',
  equipRune: 'надеть',
  unequipRune: 'снять',
  altar: 'алтарь',
  craftRune: 'создать',
  rerollRuneMenu: 'изменить руну',
  destroyRune: 'сломать',
  nextRune: '+руна',
  previousRune: '-руна',
  nextRunePage: 'руны >',
  previousRunePage: 'руны <',
  selectRuneSlot1: 'руна слот 1',
  selectRuneSlot2: 'руна слот 2',
  selectRuneSlot3: 'руна слот 3',
  selectRuneSlot4: 'руна слот 4',
  increaseAttack: '+атк',
  increaseHealth: '+здр',
  increaseDefence: '+фзащ',
  increaseMagicDefence: '+мзащ',
  increaseDexterity: '+лвк',
  increaseIntelligence: '+инт',
  rerollAttack: '~атк',
  rerollHealth: '~здр',
  rerollDefence: '~фзащ',
  rerollMagicDefence: '~мзащ',
  rerollDexterity: '~лвк',
  rerollIntelligence: '~инт',
} as const;

export type GameCommand = (typeof gameCommands)[keyof typeof gameCommands];

type StatAllocationCommand =
  | typeof gameCommands.increaseAttack
  | typeof gameCommands.increaseHealth
  | typeof gameCommands.increaseDefence
  | typeof gameCommands.increaseMagicDefence
  | typeof gameCommands.increaseDexterity
  | typeof gameCommands.increaseIntelligence;

type RuneStatRerollCommand =
  | typeof gameCommands.rerollAttack
  | typeof gameCommands.rerollHealth
  | typeof gameCommands.rerollDefence
  | typeof gameCommands.rerollMagicDefence
  | typeof gameCommands.rerollDexterity
  | typeof gameCommands.rerollIntelligence;

type RuneCursorCommand =
  | typeof gameCommands.nextRune
  | typeof gameCommands.previousRune
  | typeof gameCommands.nextRunePage
  | typeof gameCommands.previousRunePage;

type RuneSlotCommand =
  | typeof gameCommands.selectRuneSlot1
  | typeof gameCommands.selectRuneSlot2
  | typeof gameCommands.selectRuneSlot3
  | typeof gameCommands.selectRuneSlot4;

type RuneCursorDelta = number;

const hasOwn = <T extends object>(record: T, key: PropertyKey): key is keyof T => Object.prototype.hasOwnProperty.call(record, key);

const statAllocationCommandMap = {
  [gameCommands.increaseAttack]: 'attack',
  [gameCommands.increaseHealth]: 'health',
  [gameCommands.increaseDefence]: 'defence',
  [gameCommands.increaseMagicDefence]: 'magicDefence',
  [gameCommands.increaseDexterity]: 'dexterity',
  [gameCommands.increaseIntelligence]: 'intelligence',
} satisfies Readonly<Record<StatAllocationCommand, StatKey>>;

const runeStatRerollCommandMap = {
  [gameCommands.rerollAttack]: 'attack',
  [gameCommands.rerollHealth]: 'health',
  [gameCommands.rerollDefence]: 'defence',
  [gameCommands.rerollMagicDefence]: 'magicDefence',
  [gameCommands.rerollDexterity]: 'dexterity',
  [gameCommands.rerollIntelligence]: 'intelligence',
} satisfies Readonly<Record<RuneStatRerollCommand, StatKey>>;

const runeCursorCommandMap = {
  [gameCommands.nextRune]: 1,
  [gameCommands.previousRune]: -1,
  [gameCommands.nextRunePage]: runeCollectionPageSize,
  [gameCommands.previousRunePage]: -runeCollectionPageSize,
} satisfies Readonly<Record<RuneCursorCommand, RuneCursorDelta>>;

const runePageSlotCommandMap = {
  [gameCommands.selectRuneSlot1]: 0,
  [gameCommands.selectRuneSlot2]: 1,
  [gameCommands.selectRuneSlot3]: 2,
  [gameCommands.selectRuneSlot4]: 3,
} satisfies Readonly<Record<RuneSlotCommand, 0 | 1 | 2 | 3>>;

export const commandAliases: Readonly<Record<string, GameCommand>> = {
  'меню': gameCommands.backToMenu,
  'удалить перса': gameCommands.deletePlayer,
  'обучение': gameCommands.location,
  'в мир': gameCommands.returnToAdventure,
  'блок': gameCommands.defend,
  '++руна': gameCommands.nextRune,
  '--руна': gameCommands.previousRune,
  '>>руна': gameCommands.nextRunePage,
  '<<руна': gameCommands.previousRunePage,
  '~+руна': gameCommands.nextRune,
  '~-руна': gameCommands.previousRune,
};

export const resolveStatAllocationCommand = (command: string): StatKey | null => {
  if (!hasOwn(statAllocationCommandMap, command)) {
    return null;
  }

  return statAllocationCommandMap[command];
};

export const resolveRuneStatRerollCommand = (command: string): StatKey | null => {
  if (!hasOwn(runeStatRerollCommandMap, command)) {
    return null;
  }

  return runeStatRerollCommandMap[command];
};

export const resolveRuneCursorDeltaCommand = (command: string): RuneCursorDelta | null => {
  if (!hasOwn(runeCursorCommandMap, command)) {
    return null;
  }

  return runeCursorCommandMap[command];
};

export const resolveRunePageSlotCommand = (command: string): 0 | 1 | 2 | 3 | null => {
  if (!hasOwn(runePageSlotCommandMap, command)) {
    return null;
  }

  return runePageSlotCommandMap[command];
};

