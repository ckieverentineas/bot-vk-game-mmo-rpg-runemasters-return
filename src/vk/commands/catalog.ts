import type { StatKey } from '../../shared/types/game';
import type { AlchemyConsumableCode } from '../../modules/consumables/domain/alchemy-consumables';
import type { CraftingRecipeCode } from '../../modules/crafting/domain/crafting-recipes';
import type { TrophyActionCode } from '../../modules/rewards/domain/trophy-actions';
import { runeCollectionPageSize } from '../../modules/runes/domain/rune-collection';
import {
  isWorkshopBlueprintCode,
  type WorkshopBlueprintCode,
} from '../../modules/workshop/domain/workshop-catalog';

export const gameCommands = {
  start: 'начать',
  backToMenu: 'назад',
  deletePlayer: 'удалить персонажа',
  confirmDeletePlayer: '__confirm_delete_player__',
  profile: 'профиль',
  inventory: 'инвентарь',
  dailyTrace: 'след дня',
  questBook: 'книга путей',
  mastery: 'мастерство',
  bestiary: 'бестиарий',
  party: 'отряд',
  createParty: 'создать отряд',
  leaveParty: 'выйти из отряда',
  disbandParty: 'расформировать отряд',
  exploreParty: 'исследовать отрядом',
  claimQuestReward: 'забрать награду',
  location: 'локация',
  skipTutorial: 'пропустить обучение',
  returnToAdventure: 'в приключения',
  explore: 'исследовать',
  pendingReward: 'добыча',
  collectAllReward: 'забрать добычу',
  skinBeastReward: 'свежевать',
  carefulSkinningReward: 'аккуратно снять',
  gatherSlimeReward: 'собрать слизь',
  extractEssenceReward: 'извлечь эссенцию',
  drawEmberSignReward: 'вытянуть знак',
  refineSlimeCoreReward: 'отделить реагент',
  stabilizeEssenceReward: 'стабилизировать эссенцию',
  salvageArmorReward: 'разобрать доспех',
  stripGoblinGearReward: 'разобрать снаряжение',
  crackTrollGrowthsReward: 'сколоть наросты',
  unmakePhylacteryReward: 'рассеять филактерию',
  bindAbyssIchorReward: 'сковать искру',
  harvestDragonScaleReward: 'снять чешую',
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
  workshop: 'мастерская',
  craftRune: 'создать',
  craftVitalCharm: 'пилюля восстановления',
  craftKeenEdge: 'пилюля ясности',
  craftGuardPlate: 'пилюля стойкости',
  craftRuneFocus: 'пилюля фокуса',
  useHealingPill: 'выпить пилюлю восстановления',
  useFocusPill: 'выпить пилюлю фокуса',
  useGuardPill: 'выпить пилюлю стойкости',
  useClarityPill: 'выпить пилюлю ясности',
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

export const bestiaryPageCommandPrefix = 'бестиарий страница ';
export const bestiaryLocationCommandPrefix = 'бестиарий локация ';
export const bestiaryEnemyCommandPrefix = 'бестиарий моб ';
export const bestiaryLocationRewardCommandPrefix = 'бестиарий награда локация ';
export const bestiaryEnemyRewardCommandPrefix = 'бестиарий награда моб ';
export const questBookPageCommandPrefix = 'книга путей страница ';
export const workshopCraftCommandPrefix = 'мастерская чертеж ';
export const workshopRepairCommandPrefix = 'мастерская ремонт ';
export const partyJoinCommandPrefix = 'отряд ';

export const workshopEquipCommandPrefix = 'workshop equip ';
export const workshopUnequipCommandPrefix = 'workshop unequip ';

export type StaticGameCommand = (typeof gameCommands)[keyof typeof gameCommands];
export type BestiaryPageCommand = `${typeof bestiaryPageCommandPrefix}${number}`;
export type BestiaryLocationCommand = `${typeof bestiaryLocationCommandPrefix}${string}`;
export type BestiaryEnemyCommand = `${typeof bestiaryEnemyCommandPrefix}${string} ${string}`;
export type BestiaryLocationRewardCommand = `${typeof bestiaryLocationRewardCommandPrefix}${string}`;
export type BestiaryEnemyRewardCommand = `${typeof bestiaryEnemyRewardCommandPrefix}${string} ${string}`;
export type QuestBookPageCommand = `${typeof questBookPageCommandPrefix}${number}`;
export type WorkshopCraftCommand = `${typeof workshopCraftCommandPrefix}${WorkshopBlueprintCode}`;
export type WorkshopRepairCommand = `${typeof workshopRepairCommandPrefix}${string} ${WorkshopBlueprintCode}`;
export type WorkshopEquipCommand = `${typeof workshopEquipCommandPrefix}${string}`;
export type WorkshopUnequipCommand = `${typeof workshopUnequipCommandPrefix}${string}`;
export type PartyJoinCommand = `${typeof partyJoinCommandPrefix}${string}`;
export type GameCommand =
  | StaticGameCommand
  | BestiaryPageCommand
  | BestiaryLocationCommand
  | BestiaryEnemyCommand
  | BestiaryLocationRewardCommand
  | BestiaryEnemyRewardCommand
  | QuestBookPageCommand
  | WorkshopCraftCommand
  | WorkshopRepairCommand
  | WorkshopEquipCommand
  | WorkshopUnequipCommand
  | PartyJoinCommand;

export interface WorkshopRepairCommandPayload {
  readonly itemId: string;
  readonly repairBlueprintCode: WorkshopBlueprintCode;
}

export interface BestiaryLocationCommandPayload {
  readonly biomeCode: string;
  readonly enemyPageNumber: number;
}

export interface BestiaryEnemyCommandPayload {
  readonly biomeCode: string;
  readonly enemyCode: string;
}

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
type CraftingRecipeCommand =
  | typeof gameCommands.craftVitalCharm
  | typeof gameCommands.craftKeenEdge
  | typeof gameCommands.craftGuardPlate
  | typeof gameCommands.craftRuneFocus;
type UseConsumableCommand =
  | typeof gameCommands.useHealingPill
  | typeof gameCommands.useFocusPill
  | typeof gameCommands.useGuardPill
  | typeof gameCommands.useClarityPill;
type TrophyActionCommand =
  | typeof gameCommands.collectAllReward
  | typeof gameCommands.skinBeastReward
  | typeof gameCommands.carefulSkinningReward
  | typeof gameCommands.gatherSlimeReward
  | typeof gameCommands.extractEssenceReward
  | typeof gameCommands.drawEmberSignReward
  | typeof gameCommands.refineSlimeCoreReward
  | typeof gameCommands.stabilizeEssenceReward
  | typeof gameCommands.salvageArmorReward
  | typeof gameCommands.stripGoblinGearReward
  | typeof gameCommands.crackTrollGrowthsReward
  | typeof gameCommands.unmakePhylacteryReward
  | typeof gameCommands.bindAbyssIchorReward
  | typeof gameCommands.harvestDragonScaleReward;

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

const craftingRecipeCommandMap = {
  [gameCommands.craftVitalCharm]: 'vital_charm',
  [gameCommands.craftKeenEdge]: 'keen_edge',
  [gameCommands.craftGuardPlate]: 'guard_plate',
  [gameCommands.craftRuneFocus]: 'rune_focus',
} satisfies Readonly<Record<CraftingRecipeCommand, CraftingRecipeCode>>;

const craftingRecipeCodeCommandMap = {
  vital_charm: gameCommands.craftVitalCharm,
  keen_edge: gameCommands.craftKeenEdge,
  guard_plate: gameCommands.craftGuardPlate,
  rune_focus: gameCommands.craftRuneFocus,
} satisfies Readonly<Record<CraftingRecipeCode, CraftingRecipeCommand>>;

const useConsumableCommandMap = {
  [gameCommands.useHealingPill]: 'healing_pill',
  [gameCommands.useFocusPill]: 'focus_pill',
  [gameCommands.useGuardPill]: 'guard_pill',
  [gameCommands.useClarityPill]: 'clarity_pill',
} satisfies Readonly<Record<UseConsumableCommand, AlchemyConsumableCode>>;

const useConsumableCodeCommandMap = {
  healing_pill: gameCommands.useHealingPill,
  focus_pill: gameCommands.useFocusPill,
  guard_pill: gameCommands.useGuardPill,
  clarity_pill: gameCommands.useClarityPill,
} satisfies Readonly<Record<AlchemyConsumableCode, UseConsumableCommand>>;

const trophyActionCommandMap = {
  [gameCommands.collectAllReward]: 'claim_all',
  [gameCommands.skinBeastReward]: 'skin_beast',
  [gameCommands.carefulSkinningReward]: 'careful_skinning',
  [gameCommands.gatherSlimeReward]: 'gather_slime',
  [gameCommands.extractEssenceReward]: 'extract_essence',
  [gameCommands.drawEmberSignReward]: 'draw_ember_sign',
  [gameCommands.refineSlimeCoreReward]: 'refine_slime_core',
  [gameCommands.stabilizeEssenceReward]: 'stabilize_essence',
  [gameCommands.salvageArmorReward]: 'salvage_armor',
  [gameCommands.stripGoblinGearReward]: 'strip_goblin_gear',
  [gameCommands.crackTrollGrowthsReward]: 'crack_troll_growths',
  [gameCommands.unmakePhylacteryReward]: 'unmake_phylactery',
  [gameCommands.bindAbyssIchorReward]: 'bind_abyss_ichor',
  [gameCommands.harvestDragonScaleReward]: 'harvest_dragon_scale',
} satisfies Readonly<Record<TrophyActionCommand, TrophyActionCode>>;

const trophyActionCodeCommandMap = {
  claim_all: gameCommands.collectAllReward,
  skin_beast: gameCommands.skinBeastReward,
  careful_skinning: gameCommands.carefulSkinningReward,
  gather_slime: gameCommands.gatherSlimeReward,
  extract_essence: gameCommands.extractEssenceReward,
  draw_ember_sign: gameCommands.drawEmberSignReward,
  refine_slime_core: gameCommands.refineSlimeCoreReward,
  stabilize_essence: gameCommands.stabilizeEssenceReward,
  salvage_armor: gameCommands.salvageArmorReward,
  strip_goblin_gear: gameCommands.stripGoblinGearReward,
  crack_troll_growths: gameCommands.crackTrollGrowthsReward,
  unmake_phylactery: gameCommands.unmakePhylacteryReward,
  bind_abyss_ichor: gameCommands.bindAbyssIchorReward,
  harvest_dragon_scale: gameCommands.harvestDragonScaleReward,
} satisfies Readonly<Record<TrophyActionCode, TrophyActionCommand>>;

export const commandAliases: Readonly<Record<string, GameCommand>> = {
  '/start': gameCommands.start,
  'start': gameCommands.start,
  'меню': gameCommands.backToMenu,
  'удалить перса': gameCommands.deletePlayer,
  'обучение': gameCommands.location,
  'в мир': gameCommands.returnToAdventure,
  'награды': gameCommands.pendingReward,
  'трофеи': gameCommands.pendingReward,
  'лут': gameCommands.pendingReward,
  'мягкий след': gameCommands.dailyTrace,
  'тихий след': gameCommands.dailyTrace,
  'квесты': gameCommands.questBook,
  'задания': gameCommands.questBook,
  'летопись пути': gameCommands.questBook,
  'вехи': gameCommands.mastery,
  'путь школы': gameCommands.mastery,
  'школа': gameCommands.mastery,
  'книга зверей': gameCommands.bestiary,
  'монстры': gameCommands.bestiary,
  'враги': gameCommands.bestiary,
  'кооп': gameCommands.party,
  'пати': gameCommands.party,
  'группа': gameCommands.party,
  'создать группу': gameCommands.createParty,
  'создать пати': gameCommands.createParty,
  'покинуть отряд': gameCommands.leaveParty,
  'выйти из пати': gameCommands.leaveParty,
  'распустить отряд': gameCommands.disbandParty,
  'распустить пати': gameCommands.disbandParty,
  'кооп бой': gameCommands.exploreParty,
  'проверить школу': gameCommands.explore,
  'испытать знак': gameCommands.explore,
  'цель печати': gameCommands.explore,
  'испытать печать': gameCommands.explore,
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
  'оберег': gameCommands.craftVitalCharm,
  'заточка': gameCommands.craftKeenEdge,
  'пластина': gameCommands.craftGuardPlate,
  'фокус': gameCommands.craftRuneFocus,
  'выпить': gameCommands.useHealingPill,
  'хил': gameCommands.useHealingPill,
  'лечение': gameCommands.useHealingPill,
  'выпить фокус': gameCommands.useFocusPill,
  'выпить стойкость': gameCommands.useGuardPill,
  'выпить ясность': gameCommands.useClarityPill,
  'крафт': gameCommands.workshop,
  'кузница': gameCommands.workshop,
  'ремонт': gameCommands.workshop,
  'чертежи': gameCommands.workshop,
  'мастерская': gameCommands.workshop,
  'живучесть': gameCommands.craftVitalCharm,
  'восстановление': gameCommands.craftVitalCharm,
  'удар': gameCommands.craftKeenEdge,
  'ясность': gameCommands.craftKeenEdge,
  'стойкость': gameCommands.craftGuardPlate,
  'пилюля живучесть': gameCommands.craftVitalCharm,
  'пилюля восстановления': gameCommands.craftVitalCharm,
  'пилюля удар': gameCommands.craftKeenEdge,
  'пилюля ясность': gameCommands.craftKeenEdge,
  'пилюля стойкость': gameCommands.craftGuardPlate,
  'пилюля фокус': gameCommands.craftRuneFocus,
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

export const resolveCraftingRecipeCommand = (command: string): CraftingRecipeCode | null => {
  if (!hasOwn(craftingRecipeCommandMap, command)) {
    return null;
  }

  return craftingRecipeCommandMap[command];
};

export const resolveCraftingRecipeCodeCommand = (recipeCode: CraftingRecipeCode): CraftingRecipeCommand => (
  craftingRecipeCodeCommandMap[recipeCode]
);

export const resolveUseConsumableCommand = (command: string): AlchemyConsumableCode | null => {
  if (!hasOwn(useConsumableCommandMap, command)) {
    return null;
  }

  return useConsumableCommandMap[command];
};

export const resolveUseConsumableCodeCommand = (consumableCode: AlchemyConsumableCode): UseConsumableCommand => (
  useConsumableCodeCommandMap[consumableCode]
);

export const createBestiaryPageCommand = (pageNumber: number): BestiaryPageCommand => {
  const safePageNumber = Number.isFinite(pageNumber)
    ? Math.max(1, Math.floor(pageNumber))
    : 1;

  return `${bestiaryPageCommandPrefix}${safePageNumber}` as BestiaryPageCommand;
};

export const resolveBestiaryPageCommand = (command: string): number | null => {
  const match = /^бестиарий(?: страница)? ([1-9]\d*)$/.exec(command);

  if (!match) {
    return null;
  }

  return Number(match[1]);
};

export const createBestiaryLocationCommand = (
  biomeCode: string,
  enemyPageNumber = 1,
): BestiaryLocationCommand => {
  const safeEnemyPageNumber = Number.isFinite(enemyPageNumber)
    ? Math.max(1, Math.floor(enemyPageNumber))
    : 1;
  const pageSuffix = safeEnemyPageNumber > 1 ? ` страница ${safeEnemyPageNumber}` : '';

  return `${bestiaryLocationCommandPrefix}${biomeCode}${pageSuffix}` as BestiaryLocationCommand;
};

export const resolveBestiaryLocationCommand = (command: string): BestiaryLocationCommandPayload | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(bestiaryLocationCommandPrefix)) {
    return null;
  }

  const suffix = trimmedCommand.slice(bestiaryLocationCommandPrefix.length).trim();
  const match = /^(\S+)(?: страница ([1-9]\d*))?$/.exec(suffix);

  if (!match) {
    return null;
  }

  return {
    biomeCode: match[1],
    enemyPageNumber: match[2] ? Number(match[2]) : 1,
  };
};

export const createBestiaryEnemyCommand = (
  biomeCode: string,
  enemyCode: string,
): BestiaryEnemyCommand => (
  `${bestiaryEnemyCommandPrefix}${biomeCode} ${enemyCode}` as BestiaryEnemyCommand
);

export const resolveBestiaryEnemyCommand = (command: string): BestiaryEnemyCommandPayload | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(bestiaryEnemyCommandPrefix)) {
    return null;
  }

  const match = /^(\S+)\s+(\S+)$/.exec(trimmedCommand.slice(bestiaryEnemyCommandPrefix.length).trim());

  return match ? { biomeCode: match[1], enemyCode: match[2] } : null;
};

export const createBestiaryLocationRewardCommand = (biomeCode: string): BestiaryLocationRewardCommand => (
  `${bestiaryLocationRewardCommandPrefix}${biomeCode}` as BestiaryLocationRewardCommand
);

export const resolveBestiaryLocationRewardCommand = (command: string): string | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(bestiaryLocationRewardCommandPrefix)) {
    return null;
  }

  const biomeCode = trimmedCommand.slice(bestiaryLocationRewardCommandPrefix.length).trim();
  return biomeCode.length > 0 ? biomeCode : null;
};

export const createBestiaryEnemyRewardCommand = (
  biomeCode: string,
  enemyCode: string,
): BestiaryEnemyRewardCommand => (
  `${bestiaryEnemyRewardCommandPrefix}${biomeCode} ${enemyCode}` as BestiaryEnemyRewardCommand
);

export const resolveBestiaryEnemyRewardCommand = (command: string): BestiaryEnemyCommandPayload | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(bestiaryEnemyRewardCommandPrefix)) {
    return null;
  }

  const match = /^(\S+)\s+(\S+)$/.exec(trimmedCommand.slice(bestiaryEnemyRewardCommandPrefix.length).trim());

  return match ? { biomeCode: match[1], enemyCode: match[2] } : null;
};

export const createQuestBookPageCommand = (pageNumber: number): QuestBookPageCommand => {
  const safePageNumber = Number.isFinite(pageNumber)
    ? Math.max(1, Math.floor(pageNumber))
    : 1;

  return `${questBookPageCommandPrefix}${safePageNumber}` as QuestBookPageCommand;
};

export const resolveQuestBookPageCommand = (command: string): number | null => {
  const match = /^книга путей(?: страница)? ([1-9]\d*)$/.exec(command);

  if (!match) {
    return null;
  }

  return Number(match[1]);
};

export const createWorkshopCraftCommand = (blueprintCode: WorkshopBlueprintCode): WorkshopCraftCommand => (
  `${workshopCraftCommandPrefix}${blueprintCode}` as WorkshopCraftCommand
);

export const resolveWorkshopCraftCommand = (command: string): WorkshopBlueprintCode | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(workshopCraftCommandPrefix)) {
    return null;
  }

  const blueprintCode = trimmedCommand.slice(workshopCraftCommandPrefix.length).trim();
  return isWorkshopBlueprintCode(blueprintCode) ? blueprintCode : null;
};

export const createWorkshopRepairCommand = (
  itemId: string,
  repairBlueprintCode: WorkshopBlueprintCode,
): WorkshopRepairCommand => (
  `${workshopRepairCommandPrefix}${itemId} ${repairBlueprintCode}` as WorkshopRepairCommand
);

export const resolveWorkshopRepairCommand = (command: string): WorkshopRepairCommandPayload | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(workshopRepairCommandPrefix)) {
    return null;
  }

  const suffix = trimmedCommand.slice(workshopRepairCommandPrefix.length).trim();
  const [itemId, repairBlueprintCode, ...extraParts] = suffix.split(/\s+/);

  if (!itemId || !repairBlueprintCode || extraParts.length > 0 || !isWorkshopBlueprintCode(repairBlueprintCode)) {
    return null;
  }

  return { itemId, repairBlueprintCode };
};

export const createWorkshopEquipCommand = (itemId: string): WorkshopEquipCommand => (
  `${workshopEquipCommandPrefix}${itemId}` as WorkshopEquipCommand
);

export const resolveWorkshopEquipCommand = (command: string): string | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(workshopEquipCommandPrefix)) {
    return null;
  }

  const itemId = trimmedCommand.slice(workshopEquipCommandPrefix.length).trim();
  return itemId.length > 0 ? itemId : null;
};

export const createWorkshopUnequipCommand = (itemId: string): WorkshopUnequipCommand => (
  `${workshopUnequipCommandPrefix}${itemId}` as WorkshopUnequipCommand
);

export const resolveWorkshopUnequipCommand = (command: string): string | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(workshopUnequipCommandPrefix)) {
    return null;
  }

  const itemId = trimmedCommand.slice(workshopUnequipCommandPrefix.length).trim();
  return itemId.length > 0 ? itemId : null;
};

export const createPartyJoinCommand = (inviteCode: string): PartyJoinCommand => (
  `${partyJoinCommandPrefix}${inviteCode}` as PartyJoinCommand
);

export const resolvePartyJoinCommand = (command: string): string | null => {
  const trimmedCommand = command.trim();

  if (!trimmedCommand.startsWith(partyJoinCommandPrefix)) {
    return null;
  }

  const inviteCode = trimmedCommand.slice(partyJoinCommandPrefix.length).trim();
  return inviteCode.length > 0 ? inviteCode : null;
};

export const resolveTrophyActionCommand = (command: string): TrophyActionCode | null => {
  if (!hasOwn(trophyActionCommandMap, command)) {
    return null;
  }

  return trophyActionCommandMap[command];
};

export const resolveTrophyActionCodeCommand = (actionCode: TrophyActionCode): TrophyActionCommand => (
  trophyActionCodeCommandMap[actionCode]
);

