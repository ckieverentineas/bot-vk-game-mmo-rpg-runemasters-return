import type { BattleRuneActionSnapshot, BattleView } from '../../../../shared/types/game';
import { isBattleEncounterOffered } from '../../domain/battle-encounter';

export type BattleRuneActionReadinessReason =
  | 'ready'
  | 'cooldown'
  | 'not_enough_mana'
  | 'wrong_moment';

export interface BattleRuneActionReadinessView {
  readonly reason: BattleRuneActionReadinessReason;
  readonly isReady: boolean;
  readonly buttonSuffix: string;
  readonly screenState: string;
}

const formatTurnWord = (turns: number): string => {
  const mod10 = turns % 10;
  const mod100 = turns % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'ход';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'хода';
  }

  return 'ходов';
};

const resolveMomentBlocker = (battle: BattleView): string | null => {
  if (battle.status !== 'ACTIVE') {
    return 'бой уже завершён';
  }

  if (isBattleEncounterOffered(battle)) {
    return 'сначала решите встречу';
  }

  if (battle.turnOwner !== 'PLAYER') {
    return 'сейчас ход врага';
  }

  return null;
};

const resolveReadinessReason = (
  battle: BattleView,
  ability: BattleRuneActionSnapshot,
): BattleRuneActionReadinessReason => {
  if (resolveMomentBlocker(battle)) {
    return 'wrong_moment';
  }

  if (ability.currentCooldown > 0) {
    return 'cooldown';
  }

  if (battle.player.currentMana < ability.manaCost) {
    return 'not_enough_mana';
  }

  return 'ready';
};

const formatCooldown = (currentCooldown: number): string => (
  currentCooldown > 0
    ? `откат ${currentCooldown} ${formatTurnWord(currentCooldown)}`
    : 'откат готов'
);

const formatManaStock = (battle: BattleView): string => (
  `мана ${battle.player.currentMana}/${battle.player.maxMana}`
);

const formatButtonSuffix = (
  battle: BattleView,
  ability: BattleRuneActionSnapshot,
  reason: BattleRuneActionReadinessReason,
): string => {
  const manaNeed = `${battle.player.currentMana}/${ability.manaCost}`;

  if (reason === 'wrong_moment') {
    const momentLabel = battle.turnOwner === 'PLAYER' ? 'не тот момент' : 'ход врага';
    if (ability.currentCooldown > 0) {
      return battle.player.currentMana < ability.manaCost
        ? ` · ${momentLabel} · КД ${ability.currentCooldown} · мана ${manaNeed}`
        : ` · ${momentLabel} · КД ${ability.currentCooldown}`;
    }

    return battle.player.currentMana < ability.manaCost
      ? ` · ${momentLabel} · мана ${manaNeed}`
      : ` · ${momentLabel} · ${ability.manaCost} маны`;
  }

  if (reason === 'cooldown') {
    return battle.player.currentMana < ability.manaCost
      ? ` · КД ${ability.currentCooldown} · мана ${manaNeed}`
      : ` · КД ${ability.currentCooldown} · ${ability.manaCost} маны`;
  }

  if (reason === 'not_enough_mana') {
    return ` · мана ${manaNeed}`;
  }

  return ` · ${ability.manaCost} маны`;
};

const formatScreenState = (
  battle: BattleView,
  ability: BattleRuneActionSnapshot,
  reason: BattleRuneActionReadinessReason,
): string => {
  const manaStock = formatManaStock(battle);
  const cooldown = formatCooldown(ability.currentCooldown);
  const momentBlocker = resolveMomentBlocker(battle);

  if (reason === 'wrong_moment') {
    return `не тот момент: ${momentBlocker}; ${manaStock}, стоимость ${ability.manaCost}; ${cooldown}`;
  }

  if (reason === 'cooldown') {
    return battle.player.currentMana < ability.manaCost
      ? `недоступно: ${cooldown}; не хватает маны ${battle.player.currentMana}/${ability.manaCost}`
      : `недоступно: ${cooldown}; ${manaStock}, стоимость ${ability.manaCost}`;
  }

  if (reason === 'not_enough_mana') {
    return `недоступно: не хватает маны ${battle.player.currentMana}/${ability.manaCost}; ${cooldown}`;
  }

  return `готово: стоит ${ability.manaCost} маны; ${manaStock}`;
};

export const buildBattleRuneActionReadinessView = (
  battle: BattleView,
  ability: BattleRuneActionSnapshot,
): BattleRuneActionReadinessView => {
  const reason = resolveReadinessReason(battle, ability);

  return {
    reason,
    isReady: reason === 'ready',
    buttonSuffix: formatButtonSuffix(battle, ability, reason),
    screenState: formatScreenState(battle, ability, reason),
  };
};
