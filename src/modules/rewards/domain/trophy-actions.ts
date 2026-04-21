import type { InventoryField } from '../../../shared/types/game';

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
