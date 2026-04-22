import type {
  InventoryDelta,
  InventoryField,
  InventoryLoot,
  MaterialField,
  PlayerSkillCode,
  PlayerSkillPointGain,
} from '../../../shared/types/game';

export type TrophyActionCode =
  | 'claim_all'
  | 'skin_beast'
  | 'gather_slime'
  | 'extract_essence'
  | 'draw_ember_sign';

export interface TrophyActionDefinition {
  readonly code: TrophyActionCode;
  readonly label: string;
  readonly skillCodes: readonly PlayerSkillCode[];
  readonly visibleRewardFields: readonly InventoryField[];
}

export interface TrophyActionEnemyContext {
  readonly kind: string;
  readonly code?: string | null;
  readonly equippedSchoolCode?: string | null;
}

export interface TrophyActionRewardEnemyContext extends TrophyActionEnemyContext {
  readonly isElite: boolean;
  readonly isBoss: boolean;
  readonly lootTable: InventoryLoot;
}

export type TrophyActionSkillPoints = PlayerSkillPointGain;

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

const drawEmberSignAction: TrophyActionDefinition = {
  code: 'draw_ember_sign',
  label: '🔥 Вытянуть знак Пламени',
  skillCodes: ['gathering.essence_extraction'],
  visibleRewardFields: ['essence'],
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

const resolveHiddenTrophyActions = (
  enemy: TrophyActionEnemyContext,
): readonly TrophyActionDefinition[] => {
  if (enemy.code === 'ash-seer' && enemy.equippedSchoolCode === 'ember') {
    return [drawEmberSignAction];
  }

  return [];
};

export const resolveTrophyActions = (enemy: TrophyActionEnemyContext): readonly TrophyActionDefinition[] => {
  const hiddenActions = resolveHiddenTrophyActions(enemy);
  const contextualActions = trophyActionsByEnemyKind[enemy.kind] ?? [];
  return [...hiddenActions, ...contextualActions, claimAllAction];
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

const applySkinningRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (action.code !== 'skin_beast' || enemy.kind !== 'boar') {
    return inventoryDelta;
  }

  const bone = inventoryDelta.bone ?? 0;
  if (bone <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    bone: bone + 1,
  };
};

const applyReagentGatheringRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (action.code !== 'gather_slime' || enemy.kind !== 'slime') {
    return inventoryDelta;
  }

  const essence = inventoryDelta.essence ?? 0;
  if (essence <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    herb: (inventoryDelta.herb ?? 0) + 1,
  };
};

const applyEssenceExtractionRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (action.code !== 'extract_essence' || enemy.kind !== 'mage') {
    return inventoryDelta;
  }

  const crystal = enemy.lootTable.crystal ?? 0;
  if (crystal <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    crystal,
  };
};

const applyEmberHiddenRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (
    action.code !== 'draw_ember_sign'
    || enemy.code !== 'ash-seer'
    || enemy.equippedSchoolCode !== 'ember'
  ) {
    return inventoryDelta;
  }

  const essence = inventoryDelta.essence ?? 0;
  if (essence <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    essence: essence + 1,
  };
};

const applyTrophyRewardVariations = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => (
  applyEmberHiddenRewardVariation(
    enemy,
    action,
    applyEssenceExtractionRewardVariation(
      enemy,
      action,
      applyReagentGatheringRewardVariation(
        enemy,
        action,
        applySkinningRewardVariation(enemy, action, inventoryDelta),
      ),
    ),
  )
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
): TrophyActionReward => {
  const inventoryDelta = action.code === 'claim_all'
    ? collectAllPositiveLoot(enemy.lootTable)
    : collectPositiveLoot(enemy.lootTable, action.visibleRewardFields);

  return {
    actionCode: action.code,
    inventoryDelta: applyTrophyRewardVariations(enemy, action, inventoryDelta),
    skillPoints: resolveTrophySkillPoints(enemy, action),
  };
};
