import type { BattleRuneLoadoutSnapshot, RuneView } from '../../../../shared/types/game';

import { describeRuneContent } from '../../../runes/domain/rune-abilities';

import { hasSchemaVersion, isJsonRecord } from './versioned-contract';

export const LOADOUT_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface LoadoutActionSnapshotV1 {
  readonly code: string;
  readonly name: string;
  readonly manaCost: number;
  readonly cooldownTurns: number;
}

export interface LoadoutSnapshotV1 {
  readonly schemaVersion: typeof LOADOUT_SNAPSHOT_SCHEMA_VERSION;
  readonly runeId: string;
  readonly runeName: string;
  readonly archetypeCode: string | null;
  readonly schoolCode?: string | null;
  readonly schoolMasteryRank?: number;
  readonly passiveAbilityCodes: readonly string[];
  readonly activeAbility: LoadoutActionSnapshotV1 | null;
}

export type LoadoutSnapshot = LoadoutSnapshotV1;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isPositiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isLoadoutActionSnapshotV1 = (value: unknown): value is LoadoutActionSnapshotV1 => (
  isJsonRecord(value)
  && isString(value.code)
  && isString(value.name)
  && isPositiveNumber(value.manaCost)
  && isPositiveNumber(value.cooldownTurns)
);

export const isLoadoutSnapshot = (value: unknown): value is LoadoutSnapshot => (
  hasSchemaVersion(value, LOADOUT_SNAPSHOT_SCHEMA_VERSION)
  && isString(value.runeId)
  && isString(value.runeName)
  && isNullableString(value.archetypeCode)
  && (value.schoolCode === undefined || isNullableString(value.schoolCode))
  && (value.schoolMasteryRank === undefined || isPositiveNumber(value.schoolMasteryRank))
  && isStringArray(value.passiveAbilityCodes)
  && (value.activeAbility === null || isLoadoutActionSnapshotV1(value.activeAbility))
);

export const buildLoadoutSnapshot = (
  equippedRune: RuneView | null,
  options: { schoolCode?: string | null; schoolMasteryRank?: number } = {},
): LoadoutSnapshot | null => {
  if (!equippedRune) {
    return null;
  }

  const runeContent = describeRuneContent(equippedRune);
  const activeAbility = runeContent.activeAbilities[0] ?? null;

  return {
    schemaVersion: LOADOUT_SNAPSHOT_SCHEMA_VERSION,
    runeId: equippedRune.id,
    runeName: equippedRune.name,
    archetypeCode: equippedRune.archetypeCode ?? null,
    schoolCode: options.schoolCode ?? null,
    schoolMasteryRank: options.schoolMasteryRank ?? 0,
    passiveAbilityCodes: [...(equippedRune.passiveAbilityCodes ?? [])],
    activeAbility: activeAbility
      ? {
          code: activeAbility.code,
          name: activeAbility.name,
          manaCost: activeAbility.manaCost,
          cooldownTurns: activeAbility.cooldownTurns,
        }
      : null,
  };
};

export const buildLoadoutSnapshotFromBattle = (
  loadout: BattleRuneLoadoutSnapshot | null | undefined,
): LoadoutSnapshot | null => {
  if (!loadout) {
    return null;
  }

  return {
    schemaVersion: LOADOUT_SNAPSHOT_SCHEMA_VERSION,
    runeId: loadout.runeId,
    runeName: loadout.runeName,
    archetypeCode: loadout.archetypeCode,
    schoolCode: loadout.schoolCode ?? null,
    schoolMasteryRank: loadout.schoolMasteryRank ?? 0,
    passiveAbilityCodes: [...loadout.passiveAbilityCodes],
    activeAbility: loadout.activeAbility
      ? {
          code: loadout.activeAbility.code,
          name: loadout.activeAbility.name,
          manaCost: loadout.activeAbility.manaCost,
          cooldownTurns: loadout.activeAbility.cooldownTurns,
        }
      : null,
  };
};

export const projectBattleRuneLoadout = (
  snapshot: LoadoutSnapshot | null,
  currentCooldown = 0,
): BattleRuneLoadoutSnapshot | null => {
  if (!snapshot) {
    return null;
  }

  const runeContent = describeRuneContent({
    archetypeCode: snapshot.archetypeCode,
    activeAbilityCodes: snapshot.activeAbility ? [snapshot.activeAbility.code] : [],
    passiveAbilityCodes: [...snapshot.passiveAbilityCodes],
  });

  return {
    runeId: snapshot.runeId,
    runeName: snapshot.runeName,
    archetypeCode: snapshot.archetypeCode,
    archetypeName: runeContent.archetype?.name ?? null,
    schoolCode: snapshot.schoolCode ?? null,
    schoolMasteryRank: snapshot.schoolMasteryRank ?? 0,
    passiveAbilityCodes: [...snapshot.passiveAbilityCodes],
    activeAbility: snapshot.activeAbility
      ? {
          code: snapshot.activeAbility.code,
          name: snapshot.activeAbility.name,
          manaCost: snapshot.activeAbility.manaCost,
          cooldownTurns: snapshot.activeAbility.cooldownTurns,
          currentCooldown,
        }
      : null,
  };
};
