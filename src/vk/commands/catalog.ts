import type { StatKey } from '../../shared/types/game';
import { runeCollectionPageSize } from '../../modules/runes/domain/rune-collection';

export const gameCommands = {
  start: 'начать',
  backToMenu: 'назад',
  deletePlayer: 'удалить персонажа',
  confirmDeletePlayer: '__confirm_delete_player__',
  profile: 'профиль',
  inventory: 'инвентарь',
  location: 'локация',
  skipTutorial: 'пропустить обучение',
  returnToAdventure: 'в приключения',
  explore: 'исследовать',
  engageBattle: 'в бой',
  fleeBattle: 'отступить',
  attack: 'атака',
  defend: 'защита',
  skills: 'навыки',
  skillSlot1: 'навык 1',
  skillSlot2: 'навык 2',
  spell: 'спелл',
  runeCollection: 'руна',
  equipRune: 'надеть',
  equipRuneSlot1: 'надеть слот 1',
  equipRuneSlot2: 'надеть слот 2',
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
  selectRuneSlot5: 'руна слот 5',
  rerollAttack: '~атк',
  rerollHealth: '~здр',
  rerollDefence: '~фзащ',
  rerollMagicDefence: '~мзащ',
  rerollDexterity: '~лвк',
  rerollIntelligence: '~инт',
} as const;

export type GameCommand = (typeof gameCommands)[keyof typeof gameCommands];

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
  | typeof gameCommands.selectRuneSlot4
  | typeof gameCommands.selectRuneSlot5;

type RuneCursorDelta = number;

const hasOwn = <T extends object>(record: T, key: PropertyKey): key is keyof T => Object.prototype.hasOwnProperty.call(record, key);

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
  [gameCommands.selectRuneSlot5]: 4,
} satisfies Readonly<Record<RuneSlotCommand, 0 | 1 | 2 | 3 | 4>>;

export const commandAliases: Readonly<Record<string, GameCommand>> = {
  'меню': gameCommands.backToMenu,
  'удалить перса': gameCommands.deletePlayer,
  'обучение': gameCommands.location,
  'в мир': gameCommands.returnToAdventure,
  'проверить школу': gameCommands.explore,
  'испытать знак': gameCommands.explore,
  'бой': gameCommands.engageBattle,
  'начать бой': gameCommands.engageBattle,
  'сражаться': gameCommands.engageBattle,
  'бежать': gameCommands.fleeBattle,
  'отступление': gameCommands.fleeBattle,
  'блок': gameCommands.defend,
  'навык': gameCommands.skillSlot1,
  'спелл 1': gameCommands.skillSlot1,
  'спелл 2': gameCommands.skillSlot2,
  'надеть в слот 1': gameCommands.equipRuneSlot1,
  'надеть в слот 2': gameCommands.equipRuneSlot2,
  'надеть в поддержку': gameCommands.equipRuneSlot2,
  '++руна': gameCommands.nextRune,
  '--руна': gameCommands.previousRune,
  '>>руна': gameCommands.nextRunePage,
  '<<руна': gameCommands.previousRunePage,
  '~+руна': gameCommands.nextRune,
  '~-руна': gameCommands.previousRune,
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

export const resolveRunePageSlotCommand = (command: string): 0 | 1 | 2 | 3 | 4 | null => {
  if (!hasOwn(runePageSlotCommandMap, command)) {
    return null;
  }

  return runePageSlotCommandMap[command];
};

