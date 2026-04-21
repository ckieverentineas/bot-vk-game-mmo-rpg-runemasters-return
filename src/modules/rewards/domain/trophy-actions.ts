import type { InventoryDelta, InventoryField, InventoryLoot, MaterialField } from '../../../shared/types/game';

export type TrophyActionCode =
  | 'claim_all'
  | 'skin_beast'
  | 'gather_slime'
  | 'extract_essence';

export type TrophySkillCode =
  | 'gathering.skinning'
  | 'gathering.reagent_gathering'
  | 'gathering.essence_extraction';

export interface TrophyActionDefinition {
  readonly code: TrophyActionCode;
  readonly label: string;
  readonly skillCodes: readonly TrophySkillCode[];
  readonly visibleRewardFields: readonly InventoryField[];
}

export interface TrophyActionEnemyContext {
  readonly kind: string;
}

export interface TrophyActionRewardEnemyContext extends TrophyActionEnemyContext {
  readonly isElite: boolean;
  readonly isBoss: boolean;
  readonly lootTable: InventoryLoot;
}

export interface TrophyActionSkillPoints {
  readonly skillCode: TrophySkillCode;
  readonly points: number;
}

export interface TrophyActionReward {
  readonly actionCode: TrophyActionCode;
  readonly inventoryDelta: InventoryDelta;
  readonly skillPoints: readonly TrophyActionSkillPoints[];
}

const materialFields: readonly MaterialField[] = ['leather', 'bone', 'herb', 'essence', 'metal', 'crystal'];

const claimAllAction: TrophyActionDefinition = {
  code: 'claim_all',
  label: '🎒 Забрать добычу',
  skillCodes: [],
  visibleRewardFields: [],
};

const trophyActionsByEnemyKind: Readonly<Record<string, readonly TrophyActionDefinition[]>> = {
  wolf: [
    {
      code: 'skin_beast',
      label: '🔪 Свежевать',
      skillCodes: ['gathering.skinning'],
      visibleRewardFields: ['leather', 'bone'],
    },
  ],
  boar: [
    {
      code: 'skin_beast',
      label: '🔪 Снять шкуру и рог',
      skillCodes: ['gathering.skinning'],
      visibleRewardFields: ['leather', 'bone'],
    },
  ],
  slime: [
    {
      code: 'gather_slime',
      label: '🧪 Собрать слизь',
      skillCodes: ['gathering.reagent_gathering'],
      visibleRewardFields: ['herb', 'essence'],
    },
  ],
  spirit: [
    {
      code: 'extract_essence',
      label: '✨ Извлечь эссенцию',
      skillCodes: ['gathering.essence_extraction'],
      visibleRewardFields: ['essence'],
    },
  ],
  mage: [
    {
      code: 'extract_essence',
      label: '🔮 Разобрать фокус',
      skillCodes: ['gathering.essence_extraction'],
      visibleRewardFields: ['essence'],
    },
  ],
};

export const resolveTrophyActions = (enemy: TrophyActionEnemyContext): readonly TrophyActionDefinition[] => {
  const contextualActions = trophyActionsByEnemyKind[enemy.kind] ?? [];
  return [...contextualActions, claimAllAction];
};

const isMaterialField = (field: InventoryField): field is MaterialField => (
  materialFields.includes(field as MaterialField)
);

const collectPositiveLoot = (
  lootTable: InventoryLoot,
  fields: readonly InventoryField[],
): InventoryDelta => fields.reduce<InventoryDelta>((delta, field) => {
  if (!isMaterialField(field)) {
    return delta;
  }

  const amount = lootTable[field];
  if (amount === undefined || amount <= 0) {
    return delta;
  }

  return {
    ...delta,
    [field]: amount,
  };
}, {});

const collectAllPositiveLoot = (lootTable: InventoryLoot): InventoryDelta => (
  Object.entries(lootTable).reduce<InventoryDelta>((delta, [field, amount]) => {
    if (amount === undefined || amount <= 0 || !isMaterialField(field as InventoryField)) {
      return delta;
    }

    return {
      ...delta,
      [field]: amount,
    };
  }, {})
);

const resolveTrophySkillPoints = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
): readonly TrophyActionSkillPoints[] => {
  if (action.skillCodes.length === 0) {
    return [];
  }

  const eliteBonus = enemy.isElite ? 1 : 0;
  const bossBonus = enemy.isBoss ? 2 : 0;
  const points = 1 + eliteBonus + bossBonus;

  return action.skillCodes.map((skillCode) => ({
    skillCode,
    points,
  }));
};

export const resolveTrophyActionReward = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
): TrophyActionReward => ({
  actionCode: action.code,
  inventoryDelta: action.code === 'claim_all'
    ? collectAllPositiveLoot(enemy.lootTable)
    : collectPositiveLoot(enemy.lootTable, action.visibleRewardFields),
  skillPoints: resolveTrophySkillPoints(enemy, action),
});
