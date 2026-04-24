import { describe, expect, it } from 'vitest';

import { createTestBattle } from '../../../shared/testing/game-factories';
import { resolveRoamingThreatSurvival } from './roaming-threats';

describe('roaming threats', () => {
  it('records a higher-biome migrant that survives a player defeat', () => {
    const battle = createTestBattle({
      id: 'battle-migrant-1',
      status: 'COMPLETED',
      result: 'DEFEAT',
      locationLevel: 8,
      biomeCode: 'dark-forest',
      enemyCode: 'cave-stalker',
      enemy: {
        ...createTestBattle().enemy,
        code: 'cave-stalker',
        name: 'Пещерный следопыт',
        currentHealth: 7,
        experienceReward: 20,
        roaming: {
          direction: 'HIGHER_BIOME',
          originBiomeCode: 'forgotten-caves',
          originBiomeName: 'Забытые пещеры',
          levelBonus: 2,
          experienceBonus: 4,
        },
      },
    });

    expect(resolveRoamingThreatSurvival(battle)).toEqual({
      battleId: 'battle-migrant-1',
      enemyCode: 'cave-stalker',
      enemyName: 'Пещерный следопыт',
      originBiomeCode: 'forgotten-caves',
      originBiomeName: 'Забытые пещеры',
      currentBiomeCode: 'dark-forest',
      lastSeenLocationLevel: 8,
      survivalResult: 'DEFEAT',
      experienceGain: 12,
      levelBonus: 2,
    });
  });

  it('does not record defeated or lower-biome roaming enemies as server threats', () => {
    const defeatedHigherMigrant = createTestBattle({
      status: 'COMPLETED',
      result: 'VICTORY',
      enemy: {
        ...createTestBattle().enemy,
        currentHealth: 0,
        roaming: {
          direction: 'HIGHER_BIOME',
          originBiomeCode: 'forgotten-caves',
          originBiomeName: 'Забытые пещеры',
          levelBonus: 2,
          experienceBonus: 4,
        },
      },
    });
    const lowerMigrant = createTestBattle({
      status: 'COMPLETED',
      result: 'DEFEAT',
      enemy: {
        ...createTestBattle().enemy,
        currentHealth: 5,
        roaming: {
          direction: 'LOWER_BIOME',
          originBiomeCode: 'dark-forest',
          originBiomeName: 'Тёмный лес',
          levelBonus: 0,
          experienceBonus: 0,
        },
      },
    });

    expect(resolveRoamingThreatSurvival(defeatedHigherMigrant)).toBeNull();
    expect(resolveRoamingThreatSurvival(lowerMigrant)).toBeNull();
  });
});
