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
  | 'draw_ember_sign'
  | 'break_stone_seal'
  | 'catch_gale_trace'
  | 'read_omen_mark'
  | 'careful_skinning'
  | 'refine_slime_core'
  | 'stabilize_essence'
  | 'salvage_armor'
  | 'strip_goblin_gear'
  | 'crack_troll_growths'
  | 'unmake_phylactery'
  | 'bind_abyss_ichor'
  | 'harvest_dragon_scale';

export type TrophyActionSkillExperienceMap = Readonly<Partial<Record<PlayerSkillCode, number>>>;

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
  readonly equippedSchoolCodes?: readonly string[];
  readonly skillExperiences?: TrophyActionSkillExperienceMap;
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
const trophyActionUnlockExperienceThreshold = 10;
const trophyActionQualityExperienceThreshold = 20;

interface TrophyActionQualityPayoff {
  readonly actionCode: TrophyActionCode;
  readonly skillCode: PlayerSkillCode;
  readonly rewardField: MaterialField;
}

interface HiddenTrophyActionRule {
  readonly enemyCode: string;
  readonly schoolCode: string;
  readonly action: TrophyActionDefinition;
  readonly bonusField: MaterialField;
  readonly fallbackBonusField?: MaterialField;
}

const trophyActionQualityPayoffs: readonly TrophyActionQualityPayoff[] = [
  {
    actionCode: 'skin_beast',
    skillCode: 'gathering.skinning',
    rewardField: 'leather',
  },
  {
    actionCode: 'gather_slime',
    skillCode: 'gathering.reagent_gathering',
    rewardField: 'herb',
  },
];

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

const breakStoneSealAction: TrophyActionDefinition = {
  code: 'break_stone_seal',
  label: '🧱 Выбить печать Тверди',
  skillCodes: ['gathering.reagent_gathering'],
  visibleRewardFields: ['bone', 'metal'],
};

const catchGaleTraceAction: TrophyActionDefinition = {
  code: 'catch_gale_trace',
  label: '🌪️ Перехватить шквальный след',
  skillCodes: ['gathering.essence_extraction'],
  visibleRewardFields: ['herb', 'essence'],
};

const readOmenMarkAction: TrophyActionDefinition = {
  code: 'read_omen_mark',
  label: '🔮 Считать предзнаменование',
  skillCodes: ['gathering.essence_extraction'],
  visibleRewardFields: ['herb', 'essence'],
};

const carefulSkinningAction: TrophyActionDefinition = {
  code: 'careful_skinning',
  label: '🔪 Аккуратно снять шкуру',
  skillCodes: ['gathering.skinning'],
  visibleRewardFields: ['leather', 'bone'],
};

const refinedSlimeCoreAction: TrophyActionDefinition = {
  code: 'refine_slime_core',
  label: '🧪 Отделить чистый реагент',
  skillCodes: ['gathering.reagent_gathering'],
  visibleRewardFields: ['herb', 'essence'],
};

const stabilizedEssenceAction: TrophyActionDefinition = {
  code: 'stabilize_essence',
  label: '✨ Стабилизировать эссенцию',
  skillCodes: ['gathering.essence_extraction'],
  visibleRewardFields: ['essence', 'crystal'],
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
  knight: [
    {
      code: 'salvage_armor',
      label: '⚒️ Разобрать доспех',
      skillCodes: ['gathering.reagent_gathering'],
      visibleRewardFields: ['metal', 'crystal', 'leather'],
    },
  ],
  goblin: [
    {
      code: 'strip_goblin_gear',
      label: '🧰 Разобрать трофейное снаряжение',
      skillCodes: ['gathering.reagent_gathering'],
      visibleRewardFields: ['bone', 'metal', 'crystal'],
    },
  ],
  troll: [
    {
      code: 'crack_troll_growths',
      label: '⛏️ Сколоть пещерные наросты',
      skillCodes: ['gathering.reagent_gathering'],
      visibleRewardFields: ['bone', 'metal', 'crystal'],
    },
  ],
  lich: [
    {
      code: 'unmake_phylactery',
      label: '☠️ Рассеять филактерию',
      skillCodes: ['gathering.essence_extraction'],
      visibleRewardFields: ['essence', 'crystal'],
    },
  ],
  demon: [
    {
      code: 'bind_abyss_ichor',
      label: '🜏 Сковать бездновую искру',
      skillCodes: ['gathering.essence_extraction'],
      visibleRewardFields: ['essence', 'crystal'],
    },
  ],
  dragon: [
    {
      code: 'harvest_dragon_scale',
      label: '🐉 Снять драконью чешую',
      skillCodes: ['gathering.skinning'],
      visibleRewardFields: ['crystal', 'metal'],
    },
  ],
};

const hiddenTrophyActionRules: readonly HiddenTrophyActionRule[] = [
  {
    enemyCode: 'ash-seer',
    schoolCode: 'ember',
    action: drawEmberSignAction,
    bonusField: 'essence',
  },
  {
    enemyCode: 'stonehorn-ram',
    schoolCode: 'stone',
    action: breakStoneSealAction,
    bonusField: 'metal',
    fallbackBonusField: 'bone',
  },
  {
    enemyCode: 'storm-lynx',
    schoolCode: 'gale',
    action: catchGaleTraceAction,
    bonusField: 'essence',
    fallbackBonusField: 'herb',
  },
  {
    enemyCode: 'blind-augur',
    schoolCode: 'echo',
    action: readOmenMarkAction,
    bonusField: 'essence',
    fallbackBonusField: 'herb',
  },
];

const hasSkillExperience = (
  enemy: TrophyActionEnemyContext,
  skillCode: PlayerSkillCode,
  minimumExperience: number,
): boolean => (
  (enemy.skillExperiences?.[skillCode] ?? 0) >= minimumExperience
);

const isEssenceThresholdEnemy = (enemy: TrophyActionEnemyContext): boolean => (
  enemy.kind === 'spirit' || enemy.kind === 'mage'
);

const hasEquippedSchool = (
  enemy: TrophyActionEnemyContext,
  schoolCode: string,
): boolean => (
  enemy.equippedSchoolCode === schoolCode
  || (enemy.equippedSchoolCodes ?? []).includes(schoolCode)
);

const resolveSkillThresholdTrophyActions = (
  enemy: TrophyActionEnemyContext,
): readonly TrophyActionDefinition[] => {
  if (
    enemy.kind === 'wolf'
    && hasSkillExperience(enemy, 'gathering.skinning', trophyActionUnlockExperienceThreshold)
  ) {
    return [carefulSkinningAction];
  }

  if (enemy.kind === 'slime' && hasSkillExperience(
    enemy,
    'gathering.reagent_gathering',
    trophyActionUnlockExperienceThreshold,
  )) {
    return [refinedSlimeCoreAction];
  }

  if (
    isEssenceThresholdEnemy(enemy)
    && hasSkillExperience(
      enemy,
      'gathering.essence_extraction',
      trophyActionUnlockExperienceThreshold,
    )
  ) {
    return [stabilizedEssenceAction];
  }

  return [];
};

const resolveHiddenTrophyActions = (
  enemy: TrophyActionEnemyContext,
): readonly TrophyActionDefinition[] => {
  return hiddenTrophyActionRules
    .filter((rule) => rule.enemyCode === enemy.code && hasEquippedSchool(enemy, rule.schoolCode))
    .map((rule) => rule.action);
};

const resolveTrophyActionQualityPayoff = (
  enemy: TrophyActionEnemyContext,
  action: TrophyActionDefinition,
): TrophyActionQualityPayoff | undefined => (
  trophyActionQualityPayoffs.find((payoff) => (
    payoff.actionCode === action.code
    && hasSkillExperience(enemy, payoff.skillCode, trophyActionQualityExperienceThreshold)
  ))
);

const resolveQualityActionLabel = (
  enemy: TrophyActionEnemyContext,
  action: TrophyActionDefinition,
): string => {
  if (!resolveTrophyActionQualityPayoff(enemy, action)) {
    return action.label;
  }

  if (action.code === 'skin_beast') {
    return enemy.kind === 'boar'
      ? '🔪 Мастерски снять шкуру и рог'
      : '🔪 Мастерски свежевать';
  }

  if (action.code === 'gather_slime') {
    return '🧪 Мастерски собрать слизь';
  }

  return action.label;
};

const applyQualityActionLabels = (
  enemy: TrophyActionEnemyContext,
  actions: readonly TrophyActionDefinition[],
): readonly TrophyActionDefinition[] => (
  actions.map((action) => ({
    ...action,
    label: resolveQualityActionLabel(enemy, action),
  }))
);

export const resolveTrophyActions = (enemy: TrophyActionEnemyContext): readonly TrophyActionDefinition[] => {
  const hiddenActions = resolveHiddenTrophyActions(enemy);
  const contextualActions = trophyActionsByEnemyKind[enemy.kind] ?? [];
  const skillThresholdActions = resolveSkillThresholdTrophyActions(enemy);
  return applyQualityActionLabels(enemy, [
    ...hiddenActions,
    ...contextualActions,
    ...skillThresholdActions,
    claimAllAction,
  ]);
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

const applyCarefulSkinningRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (action.code !== 'careful_skinning' || enemy.kind !== 'wolf') {
    return inventoryDelta;
  }

  const leather = inventoryDelta.leather ?? 0;
  if (leather <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    leather: leather + 1,
  };
};

const applyRefinedSlimeCoreRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (action.code !== 'refine_slime_core' || enemy.kind !== 'slime') {
    return inventoryDelta;
  }

  const essence = inventoryDelta.essence ?? 0;
  if (essence > 0) {
    return {
      ...inventoryDelta,
      essence: essence + 1,
    };
  }

  const herb = inventoryDelta.herb ?? 0;
  if (herb <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    herb: herb + 1,
  };
};

const applyStabilizedEssenceRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  if (
    action.code !== 'stabilize_essence'
    || !isEssenceThresholdEnemy(enemy)
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

const findHiddenTrophyActionRule = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
): HiddenTrophyActionRule | undefined => (
  hiddenTrophyActionRules.find((rule) => (
    rule.action.code === action.code
    && rule.enemyCode === enemy.code
    && hasEquippedSchool(enemy, rule.schoolCode)
  ))
);

const addHiddenTrophyBonus = (
  inventoryDelta: InventoryDelta,
  rule: HiddenTrophyActionRule,
): InventoryDelta => {
  const bonusAmount = inventoryDelta[rule.bonusField] ?? 0;

  if (bonusAmount > 0) {
    return {
      ...inventoryDelta,
      [rule.bonusField]: bonusAmount + 1,
    };
  }

  if (!rule.fallbackBonusField) {
    return inventoryDelta;
  }

  const fallbackAmount = inventoryDelta[rule.fallbackBonusField] ?? 0;
  if (fallbackAmount <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    [rule.fallbackBonusField]: fallbackAmount + 1,
  };
};

const applyHiddenSchoolRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  const hiddenRule = findHiddenTrophyActionRule(enemy, action);

  if (!hiddenRule) {
    return inventoryDelta;
  }

  return addHiddenTrophyBonus(inventoryDelta, hiddenRule);
};

const applySkillQualityRewardVariation = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => {
  const payoff = resolveTrophyActionQualityPayoff(enemy, action);
  if (!payoff) {
    return inventoryDelta;
  }

  const amount = inventoryDelta[payoff.rewardField] ?? 0;
  if (amount <= 0) {
    return inventoryDelta;
  }

  return {
    ...inventoryDelta,
    [payoff.rewardField]: amount + 1,
  };
};

type TrophyRewardVariationResolver = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
) => InventoryDelta;

const trophyRewardVariationResolvers: readonly TrophyRewardVariationResolver[] = [
  applySkinningRewardVariation,
  applyCarefulSkinningRewardVariation,
  applyRefinedSlimeCoreRewardVariation,
  applyStabilizedEssenceRewardVariation,
  applyReagentGatheringRewardVariation,
  applyEssenceExtractionRewardVariation,
  applyHiddenSchoolRewardVariation,
  applySkillQualityRewardVariation,
];

const applyTrophyRewardVariations = (
  enemy: TrophyActionRewardEnemyContext,
  action: TrophyActionDefinition,
  inventoryDelta: InventoryDelta,
): InventoryDelta => (
  trophyRewardVariationResolvers.reduce(
    (delta, resolver) => resolver(enemy, action, delta),
    inventoryDelta,
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
