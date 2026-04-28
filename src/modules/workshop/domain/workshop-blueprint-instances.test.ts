import { describe, expect, it } from 'vitest';

import {
  canCraftBlueprintInstance,
  createLegacyBlueprintInstances,
  formatWorkshopBlueprintQuality,
  isSecretSkinningKitConditionMet,
} from './workshop-blueprint-instances';

describe('workshop blueprint instances', () => {
  it('converts a legacy stack into stable available common instances', () => {
    const instances = createLegacyBlueprintInstances({
      playerId: 7,
      blueprintCode: 'skinning_kit',
      quantity: 2,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:10:00.000Z',
    });

    expect(instances).toEqual([
      expect.objectContaining({
        id: 'legacy:7:skinning_kit:1',
        playerId: 7,
        blueprintCode: 'skinning_kit',
        rarity: 'COMMON',
        discoveryKind: 'LEGACY',
        quality: 'STURDY',
        status: 'AVAILABLE',
      }),
      expect.objectContaining({
        id: 'legacy:7:skinning_kit:2',
        playerId: 7,
        blueprintCode: 'skinning_kit',
        rarity: 'COMMON',
        discoveryKind: 'LEGACY',
        quality: 'STURDY',
        status: 'AVAILABLE',
      }),
    ]);
  });

  it('does not allow consumed or expired blueprint instances to be crafted', () => {
    const [available] = createLegacyBlueprintInstances({
      playerId: 7,
      blueprintCode: 'skinning_kit',
      quantity: 1,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:10:00.000Z',
    });

    expect(canCraftBlueprintInstance(available)).toBe(true);
    expect(canCraftBlueprintInstance({ ...available, status: 'CONSUMED' })).toBe(false);
    expect(canCraftBlueprintInstance({ ...available, status: 'EXPIRED' })).toBe(false);
  });

  it('formats player-facing quality labels in Russian', () => {
    expect(formatWorkshopBlueprintQuality('ROUGH')).toBe('Грубое');
    expect(formatWorkshopBlueprintQuality('STURDY')).toBe('Крепкое');
    expect(formatWorkshopBlueprintQuality('FINE')).toBe('Тонкое');
    expect(formatWorkshopBlueprintQuality('MASTERWORK')).toBe('Мастерское');
  });

  it('discovers the secret skinning kit from beast trophy progress without spending radiance', () => {
    expect(isSecretSkinningKitConditionMet({
      enemyKind: 'beast',
      successfulTrophyActions: 3,
      bestiaryVictoryCount: 5,
    })).toBe(true);
    expect(isSecretSkinningKitConditionMet({
      enemyKind: 'wolf',
      successfulTrophyActions: 3,
      bestiaryVictoryCount: 5,
    })).toBe(true);

    expect(isSecretSkinningKitConditionMet({
      enemyKind: 'spirit',
      successfulTrophyActions: 3,
      bestiaryVictoryCount: 5,
    })).toBe(false);
  });
});
