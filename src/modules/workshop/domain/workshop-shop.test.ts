import { describe, expect, it } from 'vitest';

import {
  canBuyWorkshopShopOffer,
  getWorkshopShopOffer,
  listWorkshopShopOffers,
  resolveWorkshopShopOfferMissingDust,
} from './workshop-shop';

describe('workshop shop', () => {
  it('offers safe routine purchases for dust without using radiance', () => {
    expect(listWorkshopShopOffers()).toEqual([
      expect.objectContaining({
        code: 'healing_pill',
        priceDust: 12,
        inventoryDelta: { healingPills: 1 },
      }),
      expect.objectContaining({
        code: 'leather_bundle',
        priceDust: 10,
        inventoryDelta: { leather: 2 },
      }),
    ]);
  });

  it('checks affordability from player dust only', () => {
    const offer = getWorkshopShopOffer('healing_pill');

    expect(canBuyWorkshopShopOffer({ gold: 12 }, offer)).toBe(true);
    expect(canBuyWorkshopShopOffer({ gold: 11 }, offer)).toBe(false);
    expect(resolveWorkshopShopOfferMissingDust({ gold: 7 }, offer)).toBe(5);
  });
});
