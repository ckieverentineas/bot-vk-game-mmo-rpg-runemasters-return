import type { BattlePlayerSnapshot, BattleWorkshopItemSnapshot, PlayerState, StatBlock } from '../../../shared/types/game';
import { buildLoadoutSnapshot, projectBattleRuneLoadout } from '../../shared/domain/contracts/loadout-snapshot';
import { getSchoolNovicePathDefinition, hasRuneOfSchoolAtLeastRarity } from '../../player/domain/school-novice-path';
import { getPlayerSchoolMasteryForArchetype } from '../../player/domain/school-mastery';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import { addStats, derivePlayerVitals, getEquippedRune } from '../../player/domain/player-stats';
import { resolvePlayerDisplayName } from '../../player/domain/player-name';
import {
  canEquipWorkshopItem,
  resolveWorkshopEquipmentStatBonus,
  type WorkshopEquippedItemView,
} from '../../workshop/domain/workshop-catalog';

const resolveSchoolProgressStage = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string | null | undefined,
  equippedRuneRarity: PlayerState['runes'][number]['rarity'] | undefined,
): 'FIRST_SIGN' | 'SEAL' | null => {
  const novicePath = getSchoolNovicePathDefinition(schoolCode ?? null);
  if (!novicePath || !equippedRuneRarity) {
    return null;
  }

  if (novicePath.minibossRewardRarity && equippedRuneRarity === novicePath.minibossRewardRarity) {
    return 'SEAL';
  }

  if (
    equippedRuneRarity === novicePath.rewardRarity
    && (!novicePath.minibossRewardRarity || !hasRuneOfSchoolAtLeastRarity(player as PlayerState, novicePath.schoolCode, novicePath.minibossRewardRarity))
  ) {
    return 'FIRST_SIGN';
  }

  return null;
};

const buildWorkshopLoadoutSnapshot = (
  items: readonly WorkshopEquippedItemView[],
): BattleWorkshopItemSnapshot[] => (
  items
    .filter((item) => item.equipped && canEquipWorkshopItem(item))
    .map((item) => ({
      id: item.id,
      itemCode: item.code,
      itemClass: item.itemClass,
      slot: item.slot,
      durability: item.durability,
      maxDurability: item.maxDurability,
    }))
);

export interface BuildBattlePlayerSnapshotOptions {
  readonly applyWorkshopStatBonus?: boolean;
}

export const buildBattlePlayerSnapshot = (
  playerId: number,
  vkId: number,
  stats: StatBlock,
  player: Pick<PlayerState, 'name' | 'runes' | 'schoolMasteries' | 'currentHealth' | 'currentMana'>,
  workshopItems: readonly WorkshopEquippedItemView[] = [],
  options: BuildBattlePlayerSnapshotOptions = {},
): BattlePlayerSnapshot => {
  const equippedRune = getEquippedRune(player as PlayerState, 0);
  const secondaryRune = getEquippedRune(player as PlayerState, 1);
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  const mastery = player ? getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode) : null;
  const loadoutSnapshot = buildLoadoutSnapshot(equippedRune, {
    schoolCode: school?.code ?? null,
    schoolMasteryRank: mastery?.rank ?? 0,
    schoolProgressStage: resolveSchoolProgressStage(player, school?.code, equippedRune?.rarity),
  });
  const secondarySchool = getSchoolDefinitionForArchetype(secondaryRune?.archetypeCode);
  const secondaryMastery = secondaryRune ? getPlayerSchoolMasteryForArchetype(player, secondaryRune.archetypeCode) : null;
  const secondaryLoadoutSnapshot = buildLoadoutSnapshot(secondaryRune, {
    schoolCode: secondarySchool?.code ?? null,
    schoolMasteryRank: secondaryMastery?.rank ?? 0,
    schoolProgressStage: resolveSchoolProgressStage(player, secondarySchool?.code, secondaryRune?.rarity),
  });
  const projectedLoadout = projectBattleRuneLoadout(loadoutSnapshot);
  const projectedSecondaryLoadout = projectBattleRuneLoadout(secondaryLoadoutSnapshot);
  const applyWorkshopStatBonus = options.applyWorkshopStatBonus ?? true;
  const battleStats = applyWorkshopStatBonus
    ? addStats(stats, resolveWorkshopEquipmentStatBonus(workshopItems))
    : stats;
  const vitals = derivePlayerVitals(player, battleStats);

  return {
    playerId,
    name: resolvePlayerDisplayName(player.name, vkId),
    attack: battleStats.attack,
    defence: battleStats.defence,
    magicDefence: battleStats.magicDefence,
    dexterity: battleStats.dexterity,
    intelligence: battleStats.intelligence,
    maxHealth: vitals.maxHealth,
    currentHealth: vitals.currentHealth,
    maxMana: vitals.maxMana,
    currentMana: vitals.currentMana,
    runeLoadout: projectedLoadout,
    supportRuneLoadout: projectedSecondaryLoadout,
    workshopLoadout: buildWorkshopLoadoutSnapshot(workshopItems),
    guardPoints: 0,
  };
};
