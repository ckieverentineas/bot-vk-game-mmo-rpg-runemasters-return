import type {
  BattleActionType,
  ConsumableField,
  InventoryDelta,
  InventoryView,
  PlayerState,
} from '../../../shared/types/game';

export type AlchemyConsumableCode =
  | 'healing_pill'
  | 'focus_pill'
  | 'guard_pill'
  | 'clarity_pill';

export interface AlchemyConsumableEffect {
  readonly health: number;
  readonly mana: number;
  readonly guard: number;
}

export interface AlchemyConsumableDefinition {
  readonly code: AlchemyConsumableCode;
  readonly inventoryField: ConsumableField;
  readonly title: string;
  readonly buttonLabel: string;
  readonly battleButtonLabel: string;
  readonly description: string;
  readonly effect: AlchemyConsumableEffect;
  readonly battleAction: BattleActionType;
}

export const alchemySkillCode = 'crafting.alchemy' as const;

const emptyEffect: AlchemyConsumableEffect = {
  health: 0,
  mana: 0,
  guard: 0,
};

export const alchemyConsumables: readonly AlchemyConsumableDefinition[] = [
  {
    code: 'healing_pill',
    inventoryField: 'healingPills',
    title: 'Пилюля восстановления',
    buttonLabel: '❤️ Выпить',
    battleButtonLabel: '❤️ Пилюля',
    description: 'Закрывает раны и возвращает силы между опасными встречами.',
    effect: {
      ...emptyEffect,
      health: 6,
    },
    battleAction: 'USE_HEALING_PILL',
  },
  {
    code: 'focus_pill',
    inventoryField: 'focusPills',
    title: 'Пилюля фокуса',
    buttonLabel: '💠 Фокус',
    battleButtonLabel: '💠 Фокус',
    description: 'Собирает рунный канал и возвращает ману для активных знаков.',
    effect: {
      ...emptyEffect,
      mana: 6,
    },
    battleAction: 'USE_FOCUS_PILL',
  },
  {
    code: 'guard_pill',
    inventoryField: 'guardPills',
    title: 'Пилюля стойкости',
    buttonLabel: '🛡️ Стойкость',
    battleButtonLabel: '🛡️ Стойкость',
    description: 'Поднимает тело после удара, а в бою даёт короткую защитную опору.',
    effect: {
      health: 4,
      mana: 0,
      guard: 3,
    },
    battleAction: 'USE_GUARD_PILL',
  },
  {
    code: 'clarity_pill',
    inventoryField: 'clarityPills',
    title: 'Пилюля ясности',
    buttonLabel: '🧠 Ясность',
    battleButtonLabel: '🧠 Ясность',
    description: 'Мягко восстанавливает тело и рунный фокус без постоянного роста статов.',
    effect: {
      health: 2,
      mana: 3,
      guard: 0,
    },
    battleAction: 'USE_CLARITY_PILL',
  },
];

const consumableByCode = new Map<AlchemyConsumableCode, AlchemyConsumableDefinition>(
  alchemyConsumables.map((consumable) => [consumable.code, consumable]),
);

const consumableByBattleAction = new Map<BattleActionType, AlchemyConsumableDefinition>(
  alchemyConsumables.map((consumable) => [consumable.battleAction, consumable]),
);

export const listAlchemyConsumables = (): readonly AlchemyConsumableDefinition[] => alchemyConsumables;

export const getAlchemyConsumable = (code: AlchemyConsumableCode): AlchemyConsumableDefinition => {
  const consumable = consumableByCode.get(code);
  if (!consumable) {
    throw new Error(`Unknown alchemy consumable: ${code}`);
  }

  return consumable;
};

export const getAlchemyConsumableByBattleAction = (
  action: BattleActionType,
): AlchemyConsumableDefinition | null => consumableByBattleAction.get(action) ?? null;

export const isAlchemyConsumableBattleAction = (action: BattleActionType): boolean => (
  getAlchemyConsumableByBattleAction(action) !== null
);

export const getAlchemyConsumableCount = (
  inventory: InventoryView,
  consumable: Pick<AlchemyConsumableDefinition, 'inventoryField'>,
): number => inventory[consumable.inventoryField] ?? 0;

export const hasAlchemyConsumable = (
  inventory: InventoryView,
  consumable: Pick<AlchemyConsumableDefinition, 'inventoryField'>,
): boolean => getAlchemyConsumableCount(inventory, consumable) > 0;

export const resolveAlchemyConsumableSpend = (
  consumable: Pick<AlchemyConsumableDefinition, 'inventoryField'>,
): InventoryDelta => ({
  [consumable.inventoryField]: -1,
});

export const resolveAlchemyConsumableGain = (
  consumable: Pick<AlchemyConsumableDefinition, 'inventoryField'>,
  quantity: number,
): InventoryDelta => ({
  [consumable.inventoryField]: Math.max(0, Math.floor(quantity)),
});

export const getAlchemyRank = (player: Pick<PlayerState, 'skills'>): number => (
  player.skills?.find((skill) => skill.skillCode === alchemySkillCode)?.rank ?? 0
);

export const resolveAlchemyCraftQuantity = (player: Pick<PlayerState, 'skills'>): number => (
  1 + getAlchemyRank(player)
);

export const formatAlchemyConsumableEffect = (effect: AlchemyConsumableEffect): string => {
  const parts = [
    effect.health > 0 ? `+${effect.health} HP` : null,
    effect.mana > 0 ? `+${effect.mana} маны` : null,
    effect.guard > 0 ? `+${effect.guard} щита в бою` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(' · ') : 'без эффекта';
};
