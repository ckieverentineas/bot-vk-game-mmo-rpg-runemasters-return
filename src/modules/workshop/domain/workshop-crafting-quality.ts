import type { PlayerSkillPointGain, PlayerState, StatBlock } from '../../../shared/types/game';
import type {
  WorkshopBlueprintDefinition,
  WorkshopBlueprintRarity,
  WorkshopItemDefinition,
} from './workshop-catalog';
import type { WorkshopBlueprintInstanceView, WorkshopBlueprintQuality } from './workshop-blueprint-instances';

export interface WorkshopCraftedItemOutcome {
  readonly quality: WorkshopBlueprintQuality;
  readonly durability: number;
  readonly maxDurability: number;
  readonly statBonus: StatBlock;
  readonly skillGains: readonly PlayerSkillPointGain[];
}

const workshopCraftSkillCode = 'crafting.workshop' as const;
const workshopCraftSkillGain = 20;

const qualityOrder = [
  'ROUGH',
  'STURDY',
  'FINE',
  'MASTERWORK',
] as const satisfies readonly WorkshopBlueprintQuality[];

const statFields = [
  'health',
  'attack',
  'defence',
  'magicDefence',
  'dexterity',
  'intelligence',
] as const satisfies readonly (keyof StatBlock)[];

const qualityDurabilityBonus: Readonly<Record<WorkshopBlueprintQuality, number>> = {
  ROUGH: -2,
  STURDY: 0,
  FINE: 2,
  MASTERWORK: 4,
};

const qualityStatBonus: Readonly<Record<WorkshopBlueprintQuality, number>> = {
  ROUGH: -1,
  STURDY: 0,
  FINE: 1,
  MASTERWORK: 2,
};

const rarityDurabilityBonus: Readonly<Record<WorkshopBlueprintRarity, number>> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
};

const resolveWorkshopSkillRank = (player: PlayerState): number => (
  player.skills?.find((skill) => skill.skillCode === workshopCraftSkillCode)?.rank ?? 0
);

const resolveResultQuality = (
  blueprintQuality: WorkshopBlueprintQuality,
  workshopSkillRank: number,
): WorkshopBlueprintQuality => {
  const baseIndex = qualityOrder.indexOf(blueprintQuality);
  const nextIndex = Math.min(qualityOrder.length - 1, baseIndex + Math.max(0, workshopSkillRank));

  return qualityOrder[nextIndex];
};

const resolveStatBonus = (
  baseBonus: StatBlock,
  quality: WorkshopBlueprintQuality,
): StatBlock => {
  const qualityBonus = qualityStatBonus[quality];

  return statFields.reduce<StatBlock>((bonus, field) => {
    const baseValue = baseBonus[field];
    const nextValue = baseValue > 0 ? Math.max(0, baseValue + qualityBonus) : 0;

    return {
      ...bonus,
      [field]: nextValue,
    };
  }, {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  });
};

export const resolveWorkshopCraftedItemOutcome = (
  player: PlayerState,
  blueprint: WorkshopBlueprintDefinition,
  item: WorkshopItemDefinition,
  instance: Pick<WorkshopBlueprintInstanceView, 'quality' | 'rarity'>,
): WorkshopCraftedItemOutcome => {
  if (blueprint.kind !== 'craft_item') {
    throw new Error(`Workshop blueprint does not craft an item: ${blueprint.code}`);
  }

  const quality = resolveResultQuality(instance.quality, resolveWorkshopSkillRank(player));
  const maxDurability = Math.max(
    1,
    item.maxDurability + qualityDurabilityBonus[quality] + rarityDurabilityBonus[instance.rarity],
  );

  return {
    quality,
    durability: maxDurability,
    maxDurability,
    statBonus: resolveStatBonus(item.statBonus, quality),
    skillGains: [
      {
        skillCode: workshopCraftSkillCode,
        points: workshopCraftSkillGain,
      },
    ],
  };
};
