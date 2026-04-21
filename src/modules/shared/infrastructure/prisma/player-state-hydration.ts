import { gameBalance } from '../../../../config/game-balance';
import type {
  InventoryView,
  PlayerSkillCode,
  PlayerSkillView,
  PlayerState,
  RuneRarity,
  RuneView,
  StatBlock,
} from '../../../../shared/types/game';
import { parseJson } from '../../../../shared/utils/json';
import {
  DEFAULT_UNLOCKED_RUNE_SLOT_COUNT,
  emptyInventory,
  getRuneEquippedSlot,
} from '../../../player/domain/player-stats';
import {
  createSchoolMasteryView,
  listMissingStarterSchoolMasteries,
  resolveUnlockedRuneSlotCountFromSchoolMasteries,
} from '../../../player/domain/school-mastery';
import { createPlayerSkillView, isPlayerSkillCode } from '../../../player/domain/player-skills';

const validTutorialStates: readonly PlayerState['tutorialState'][] = ['ACTIVE', 'SKIPPED', 'COMPLETED'];

export interface PersistedPlayerStateHydrationInput {
  readonly userId: number;
  readonly vkId: number;
  readonly playerId: number;
  readonly level: number;
  readonly experience: number;
  readonly gold: number;
  readonly baseStats: StatBlock;
  readonly progress?: {
    readonly locationLevel?: number | null;
    readonly currentRuneIndex?: number | null;
    readonly unlockedRuneSlotCount?: number | null;
    readonly activeBattleId?: string | null;
    readonly tutorialState?: string | null;
    readonly victories?: number | null;
    readonly victoryStreak?: number | null;
    readonly defeats?: number | null;
    readonly defeatStreak?: number | null;
    readonly mobsKilled?: number | null;
    readonly highestLocationLevel?: number | null;
  } | null;
  readonly inventory?: Partial<InventoryView> | null;
  readonly schoolMasteries?: readonly {
    readonly schoolCode: string;
    readonly experience: number;
  }[];
  readonly skills?: readonly {
    readonly skillCode: string;
    readonly experience: number;
  }[];
  readonly runes: readonly {
    readonly id: string;
    readonly runeCode?: string | null;
    readonly archetypeCode?: string | null;
    readonly passiveAbilityCodes?: string | readonly string[] | null;
    readonly activeAbilityCodes?: string | readonly string[] | null;
    readonly name: string;
    readonly rarity: string;
    readonly health: number;
    readonly attack: number;
    readonly defence: number;
    readonly magicDefence: number;
    readonly dexterity: number;
    readonly intelligence: number;
    readonly isEquipped: boolean;
    readonly equippedSlot?: number | null;
    readonly createdAt: string;
  }[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

const clampNonNegativeInteger = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
};

const normalizeTutorialState = (value: string | null | undefined): PlayerState['tutorialState'] => (
  validTutorialStates.includes(value as PlayerState['tutorialState'])
    ? value as PlayerState['tutorialState']
    : 'ACTIVE'
);

const normalizeInventory = (inventory: Partial<InventoryView> | null | undefined): InventoryView => {
  const fallback = emptyInventory();

  return {
    usualShards: clampNonNegativeInteger(inventory?.usualShards, fallback.usualShards),
    unusualShards: clampNonNegativeInteger(inventory?.unusualShards, fallback.unusualShards),
    rareShards: clampNonNegativeInteger(inventory?.rareShards, fallback.rareShards),
    epicShards: clampNonNegativeInteger(inventory?.epicShards, fallback.epicShards),
    legendaryShards: clampNonNegativeInteger(inventory?.legendaryShards, fallback.legendaryShards),
    mythicalShards: clampNonNegativeInteger(inventory?.mythicalShards, fallback.mythicalShards),
    leather: clampNonNegativeInteger(inventory?.leather, fallback.leather),
    bone: clampNonNegativeInteger(inventory?.bone, fallback.bone),
    herb: clampNonNegativeInteger(inventory?.herb, fallback.herb),
    essence: clampNonNegativeInteger(inventory?.essence, fallback.essence),
    metal: clampNonNegativeInteger(inventory?.metal, fallback.metal),
    crystal: clampNonNegativeInteger(inventory?.crystal, fallback.crystal),
  };
};

const normalizeAbilityCodes = (value: string | readonly string[] | null | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    return parseJson<string[]>(value, []);
  }

  return [];
};

const normalizeRunes = (
  runes: PersistedPlayerStateHydrationInput['runes'],
): RuneView[] => runes.map((rune) => ({
  id: rune.id,
  runeCode: rune.runeCode ?? null,
  archetypeCode: rune.archetypeCode ?? null,
  passiveAbilityCodes: normalizeAbilityCodes(rune.passiveAbilityCodes),
  activeAbilityCodes: normalizeAbilityCodes(rune.activeAbilityCodes),
  name: rune.name,
  rarity: rune.rarity as RuneRarity,
  health: rune.health,
  attack: rune.attack,
  defence: rune.defence,
  magicDefence: rune.magicDefence,
  dexterity: rune.dexterity,
  intelligence: rune.intelligence,
  isEquipped: getRuneEquippedSlot({ equippedSlot: rune.equippedSlot, isEquipped: rune.isEquipped }) !== null,
  equippedSlot: getRuneEquippedSlot({ equippedSlot: rune.equippedSlot, isEquipped: rune.isEquipped }),
  createdAt: rune.createdAt,
}));

const normalizeCurrentRuneIndex = (requestedIndex: number | null | undefined, runeCount: number): number => {
  const fallback = 0;
  if (runeCount <= 0) {
    return fallback;
  }

  const normalized = clampNonNegativeInteger(requestedIndex, fallback);
  return Math.min(normalized, runeCount - 1);
};

const normalizePlayerSkills = (
  skills: PersistedPlayerStateHydrationInput['skills'],
): PlayerSkillView[] => (skills ?? [])
  .filter((entry): entry is { readonly skillCode: PlayerSkillCode; readonly experience: number } => isPlayerSkillCode(entry.skillCode))
  .map((entry) => createPlayerSkillView(entry.skillCode, clampNonNegativeInteger(entry.experience, 0)))
  .sort((left, right) => left.skillCode.localeCompare(right.skillCode));

export const hydratePlayerStateFromPersistence = (
  persisted: PersistedPlayerStateHydrationInput,
): PlayerState => {
  const runes = normalizeRunes(persisted.runes);
  const skills = normalizePlayerSkills(persisted.skills);
  const schoolMasteries = [
    ...((persisted.schoolMasteries ?? []).map((entry) => createSchoolMasteryView(entry.schoolCode, clampNonNegativeInteger(entry.experience, 0)))),
  ];
  const mergedSchoolMasteries = [
    ...schoolMasteries,
    ...listMissingStarterSchoolMasteries({ schoolMasteries }),
  ].sort((left, right) => left.schoolCode.localeCompare(right.schoolCode));

  const locationLevel = clampNonNegativeInteger(persisted.progress?.locationLevel, gameBalance.world.introLocationLevel);
  const highestLocationLevel = Math.max(
    locationLevel,
    clampNonNegativeInteger(persisted.progress?.highestLocationLevel, gameBalance.world.introLocationLevel),
  );

  const player: PlayerState = {
    userId: persisted.userId,
    vkId: persisted.vkId,
    playerId: persisted.playerId,
    level: persisted.level,
    experience: persisted.experience,
    gold: persisted.gold,
    baseStats: persisted.baseStats,
    locationLevel,
    currentRuneIndex: normalizeCurrentRuneIndex(persisted.progress?.currentRuneIndex, runes.length),
    unlockedRuneSlotCount: resolveUnlockedRuneSlotCountFromSchoolMasteries(
      { schoolMasteries: mergedSchoolMasteries },
      clampNonNegativeInteger(persisted.progress?.unlockedRuneSlotCount, DEFAULT_UNLOCKED_RUNE_SLOT_COUNT)
        || DEFAULT_UNLOCKED_RUNE_SLOT_COUNT,
    ),
    activeBattleId: typeof persisted.progress?.activeBattleId === 'string' ? persisted.progress.activeBattleId : null,
    victories: clampNonNegativeInteger(persisted.progress?.victories, 0),
    victoryStreak: clampNonNegativeInteger(persisted.progress?.victoryStreak, 0),
    defeats: clampNonNegativeInteger(persisted.progress?.defeats, 0),
    defeatStreak: clampNonNegativeInteger(persisted.progress?.defeatStreak, 0),
    mobsKilled: clampNonNegativeInteger(persisted.progress?.mobsKilled, 0),
    highestLocationLevel,
    tutorialState: normalizeTutorialState(persisted.progress?.tutorialState),
    inventory: normalizeInventory(persisted.inventory),
    schoolMasteries: mergedSchoolMasteries,
    runes,
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
  };

  return skills.length > 0
    ? {
        ...player,
        skills,
      }
    : player;
};
