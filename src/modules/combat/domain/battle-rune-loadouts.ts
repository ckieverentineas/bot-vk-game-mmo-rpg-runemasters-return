import type {
  BattleActionType,
  BattlePlayerSnapshot,
  BattleRuneLoadoutSnapshot,
  BattleView,
} from '../../../shared/types/game';

export type BattleRuneSlotIndex = 0 | 1;

export interface BattleRuneSlotLoadout {
  readonly slot: BattleRuneSlotIndex;
  readonly loadout: BattleRuneLoadoutSnapshot;
}

export const battleRuneSlotIndexes = [0, 1] as const satisfies readonly BattleRuneSlotIndex[];

export const isRuneSkillAction = (action: BattleActionType): boolean => (
  action === 'RUNE_SKILL'
  || action === 'RUNE_SKILL_SLOT_1'
  || action === 'RUNE_SKILL_SLOT_2'
);

export const resolveBattleRuneSkillAction = (slot: BattleRuneSlotIndex): BattleActionType => (
  slot === 1 ? 'RUNE_SKILL_SLOT_2' : 'RUNE_SKILL_SLOT_1'
);

export const resolveBattleRuneSlotIndexFromAction = (action: BattleActionType): BattleRuneSlotIndex => (
  action === 'RUNE_SKILL_SLOT_2' ? 1 : 0
);

export const getBattleRuneLoadout = (
  player: BattlePlayerSnapshot,
  slot: BattleRuneSlotIndex,
): BattleRuneLoadoutSnapshot | null => (
  slot === 0
    ? player.runeLoadout ?? null
    : player.supportRuneLoadout ?? null
);

export const getBattleRuneLoadoutForAction = (
  battle: BattleView,
  action: BattleActionType,
): BattleRuneLoadoutSnapshot | null => getBattleRuneLoadout(
  battle.player,
  resolveBattleRuneSlotIndexFromAction(action),
);

export const listBattleRuneLoadouts = (player: BattlePlayerSnapshot): readonly BattleRuneSlotLoadout[] => (
  battleRuneSlotIndexes
    .map((slot): BattleRuneSlotLoadout | null => {
      const loadout = getBattleRuneLoadout(player, slot);
      return loadout ? { slot, loadout } : null;
    })
    .filter((entry): entry is BattleRuneSlotLoadout => entry !== null)
);
