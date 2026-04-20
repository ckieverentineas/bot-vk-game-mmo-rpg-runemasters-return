import type { PlayerState, RuneRarity } from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';

export interface SchoolNovicePathDefinition {
  readonly schoolCode: string;
  readonly enemyCode: string;
  readonly enemyName: string;
  readonly enemyNameAccusative: string;
  readonly biomeName: string;
  readonly rewardRarity: RuneRarity;
  readonly forcedArchetypeCode: string;
}

const novicePathDefinitions: readonly SchoolNovicePathDefinition[] = [
  {
    schoolCode: 'ember',
    enemyCode: 'ash-seer',
    enemyName: 'Пепельная ведунья',
    enemyNameAccusative: 'Пепельную ведунью',
    biomeName: 'Тёмный лес',
    rewardRarity: 'UNUSUAL',
    forcedArchetypeCode: 'ember',
  },
  {
    schoolCode: 'stone',
    enemyCode: 'stonehorn-ram',
    enemyName: 'Камнерогий таран',
    enemyNameAccusative: 'Камнерогого тарана',
    biomeName: 'Тёмный лес',
    rewardRarity: 'UNUSUAL',
    forcedArchetypeCode: 'stone',
  },
];

const rarityOrder: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];

export const getSchoolNovicePathDefinition = (schoolCode: string | null | undefined): SchoolNovicePathDefinition | null => (
  novicePathDefinitions.find((entry) => entry.schoolCode === schoolCode) ?? null
);

export const getSchoolNovicePathDefinitionForEnemy = (enemyCode: string | null | undefined): SchoolNovicePathDefinition | null => (
  novicePathDefinitions.find((entry) => entry.enemyCode === enemyCode) ?? null
);

export const hasRuneOfSchoolAtLeastRarity = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
  minimumRarity: RuneRarity,
): boolean => {
  const minimumIndex = rarityOrder.indexOf(minimumRarity);

  return player.runes.some((rune) => {
    const runeSchoolCode = getSchoolDefinitionForArchetype(rune.archetypeCode)?.code ?? null;
    const runeRarityIndex = rarityOrder.indexOf(rune.rarity);
    return runeSchoolCode === schoolCode && runeRarityIndex >= minimumIndex;
  });
};
