import { describe, expect, it } from 'vitest';

import { createTestBattle } from '../../../shared/testing/game-factories';
import { resolveEnemyThreatSurvival } from './roaming-threats';

describe('roaming threats', () => {
  it('records an ordinary local enemy that survives a player defeat', () => {
    const battle = createTestBattle({
      id: 'battle-slime-1',
      status: 'COMPLETED',
      result: 'DEFEAT',
      locationLevel: 5,
      biomeCode: 'dark-forest',
      enemyCode: 'blue-slime',
      enemy: {
        ...createTestBattle().enemy,
        code: 'blue-slime',
        name: 'Blue Slime',
        currentHealth: 3,
      },
    });

    expect(resolveEnemyThreatSurvival(battle)).toEqual({
      battleId: 'battle-slime-1',
      enemyCode: 'blue-slime',
      enemyName: 'Blue Slime',
      originBiomeCode: 'dark-forest',
      originBiomeName: 'dark-forest',
      currentBiomeCode: 'dark-forest',
      lastSeenLocationLevel: 5,
      survivalResult: 'DEFEAT',
      experienceGain: 5,
      levelBonus: 1,
    });
  });

  it('records an ordinary new enemy when the player flees from it', () => {
    const battle = createTestBattle({
      id: 'battle-slime-fled-1',
      status: 'COMPLETED',
      result: 'FLED',
      locationLevel: 6,
      biomeCode: 'dark-forest',
      enemyCode: 'blue-slime',
      enemy: {
        ...createTestBattle().enemy,
        code: 'blue-slime',
        name: 'Blue Slime',
        currentHealth: 5,
      },
    });

    expect(resolveEnemyThreatSurvival(battle)).toEqual(expect.objectContaining({
      battleId: 'battle-slime-fled-1',
      enemyCode: 'blue-slime',
      originBiomeCode: 'dark-forest',
      currentBiomeCode: 'dark-forest',
      survivalResult: 'FLED',
      experienceGain: 6,
      levelBonus: 1,
    }));
  });

  it('keeps the base enemy name when a named active threat survives again', () => {
    const battle = createTestBattle({
      id: 'battle-named-slime-1',
      status: 'COMPLETED',
      result: 'DEFEAT',
      locationLevel: 7,
      biomeCode: 'dark-forest',
      enemyCode: 'blue-slime',
      enemy: {
        ...createTestBattle().enemy,
        code: 'blue-slime',
        name: 'Упрямый Синий слизень',
        currentHealth: 8,
        threat: {
          rank: 'NAMED',
          baseEnemyName: 'Синий слизень',
          survivalCount: 3,
          experience: 24,
          levelBonus: 3,
        },
      },
    });

    expect(resolveEnemyThreatSurvival(battle)).toEqual(expect.objectContaining({
      battleId: 'battle-named-slime-1',
      enemyCode: 'blue-slime',
      enemyName: 'Синий слизень',
      originBiomeCode: 'dark-forest',
      currentBiomeCode: 'dark-forest',
      survivalResult: 'DEFEAT',
      experienceGain: 7,
      levelBonus: 3,
    }));
  });

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
        name: 'Cave Stalker',
        currentHealth: 7,
        experienceReward: 20,
        roaming: {
          direction: 'HIGHER_BIOME',
          originBiomeCode: 'forgotten-caves',
          originBiomeName: 'Forgotten Caves',
          levelBonus: 2,
          experienceBonus: 4,
        },
      },
    });

    expect(resolveEnemyThreatSurvival(battle)).toEqual({
      battleId: 'battle-migrant-1',
      enemyCode: 'cave-stalker',
      enemyName: 'Cave Stalker',
      originBiomeCode: 'forgotten-caves',
      originBiomeName: 'Forgotten Caves',
      currentBiomeCode: 'dark-forest',
      lastSeenLocationLevel: 8,
      survivalResult: 'DEFEAT',
      experienceGain: 12,
      levelBonus: 2,
    });
  });

  it('records a lower-biome roaming enemy that survives the encounter', () => {
    const battle = createTestBattle({
      id: 'battle-old-wolf-1',
      status: 'COMPLETED',
      result: 'FLED',
      locationLevel: 18,
      biomeCode: 'forgotten-caves',
      enemyCode: 'forest-wolf',
      enemy: {
        ...createTestBattle().enemy,
        code: 'forest-wolf',
        name: 'Forest Wolf',
        currentHealth: 5,
        roaming: {
          direction: 'LOWER_BIOME',
          originBiomeCode: 'dark-forest',
          originBiomeName: 'Dark Forest',
          levelBonus: 0,
          experienceBonus: 0,
        },
      },
    });

    expect(resolveEnemyThreatSurvival(battle)).toEqual(expect.objectContaining({
      battleId: 'battle-old-wolf-1',
      enemyCode: 'forest-wolf',
      originBiomeCode: 'dark-forest',
      originBiomeName: 'Dark Forest',
      currentBiomeCode: 'forgotten-caves',
      survivalResult: 'FLED',
      experienceGain: 18,
      levelBonus: 1,
    }));
  });

  it('does not record defeated enemies as surviving server threats', () => {
    const battle = createTestBattle({
      status: 'COMPLETED',
      result: 'VICTORY',
      enemy: {
        ...createTestBattle().enemy,
        currentHealth: 0,
        roaming: {
          direction: 'HIGHER_BIOME',
          originBiomeCode: 'forgotten-caves',
          originBiomeName: 'Forgotten Caves',
          levelBonus: 2,
          experienceBonus: 4,
        },
      },
    });

    expect(resolveEnemyThreatSurvival(battle)).toBeNull();
  });
});
