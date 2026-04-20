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
  readonly minibossEnemyCode?: string;
  readonly minibossEnemyName?: string;
  readonly minibossEnemyNameAccusative?: string;
  readonly minibossRewardRarity?: RuneRarity;
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
    minibossEnemyCode: 'ash-matron',
    minibossEnemyName: 'Пепельная матрона',
    minibossEnemyNameAccusative: 'Пепельную матрону',
    minibossRewardRarity: 'RARE',
  },
  {
    schoolCode: 'stone',
    enemyCode: 'stonehorn-ram',
    enemyName: 'Камнерогий таран',
    enemyNameAccusative: 'Камнерогого тарана',
    biomeName: 'Тёмный лес',
    rewardRarity: 'UNUSUAL',
    forcedArchetypeCode: 'stone',
    minibossEnemyCode: 'granite-warden',
    minibossEnemyName: 'Гранитный страж',
    minibossEnemyNameAccusative: 'Гранитного стража',
    minibossRewardRarity: 'RARE',
  },
  {
    schoolCode: 'echo',
    enemyCode: 'blind-augur',
    enemyName: 'Слепой авгур',
    enemyNameAccusative: 'Слепого авгура',
    biomeName: 'Тёмный лес',
    rewardRarity: 'UNUSUAL',
    forcedArchetypeCode: 'echo',
  },
];

const rarityOrder: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];

const resolveRarityIndex = (rarity: RuneRarity): number => rarityOrder.indexOf(rarity);

export const getSchoolNovicePathDefinition = (schoolCode: string | null | undefined): SchoolNovicePathDefinition | null => (
  novicePathDefinitions.find((entry) => entry.schoolCode === schoolCode) ?? null
);

export const getSchoolNovicePathDefinitionForEnemy = (enemyCode: string | null | undefined): SchoolNovicePathDefinition | null => (
  novicePathDefinitions.find((entry) => entry.enemyCode === enemyCode || entry.minibossEnemyCode === enemyCode) ?? null
);

export const isSchoolNoviceTrialEnemy = (enemyCode: string | null | undefined): boolean => (
  novicePathDefinitions.some((entry) => entry.enemyCode === enemyCode)
);

export const isSchoolMinibossEnemy = (enemyCode: string | null | undefined): boolean => (
  novicePathDefinitions.some((entry) => entry.minibossEnemyCode != null && entry.minibossEnemyCode === enemyCode)
);

export const hasRuneOfSchoolAtLeastRarity = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
  minimumRarity: RuneRarity,
): boolean => {
  const minimumIndex = resolveRarityIndex(minimumRarity);

  return player.runes.some((rune) => {
    const runeSchoolCode = getSchoolDefinitionForArchetype(rune.archetypeCode)?.code ?? null;
    const runeRarityIndex = resolveRarityIndex(rune.rarity);
    return runeSchoolCode === schoolCode && runeRarityIndex >= minimumIndex;
  });
};

export const findBestRuneOfSchoolAtLeastRarity = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
  minimumRarity: RuneRarity,
) => {
  const minimumIndex = resolveRarityIndex(minimumRarity);

  return player.runes
    .filter((rune) => {
      const runeSchoolCode = getSchoolDefinitionForArchetype(rune.archetypeCode)?.code ?? null;
      const runeRarityIndex = resolveRarityIndex(rune.rarity);
      return runeSchoolCode === schoolCode && runeRarityIndex >= minimumIndex;
    })
    .sort((left, right) => {
      const rarityDelta = resolveRarityIndex(right.rarity) - resolveRarityIndex(left.rarity);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }

      return Number(right.attack + right.health + right.defence + right.magicDefence + right.dexterity + right.intelligence)
        - Number(left.attack + left.health + left.defence + left.magicDefence + left.dexterity + left.intelligence);
    })[0] ?? null;
};

export const hasEquippedRuneOfSchoolAtLeastRarity = (
  player: Pick<PlayerState, 'runes'>,
  schoolCode: string,
  minimumRarity: RuneRarity,
): boolean => player.runes.some((rune) => {
  const runeSchoolCode = getSchoolDefinitionForArchetype(rune.archetypeCode)?.code ?? null;
  const runeRarityIndex = resolveRarityIndex(rune.rarity);
  return rune.isEquipped && runeSchoolCode === schoolCode && runeRarityIndex >= resolveRarityIndex(minimumRarity);
});
