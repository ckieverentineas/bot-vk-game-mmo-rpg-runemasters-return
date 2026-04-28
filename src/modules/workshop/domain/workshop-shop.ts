import type { InventoryDelta } from '../../../shared/types/game';

export type WorkshopShopOfferCode =
  | 'healing_pill'
  | 'leather_bundle';

export interface WorkshopShopOfferDefinition {
  readonly code: WorkshopShopOfferCode;
  readonly title: string;
  readonly buttonLabel: string;
  readonly description: string;
  readonly priceDust: number;
  readonly inventoryDelta: InventoryDelta;
}

export interface WorkshopShopDustBalance {
  readonly gold: number;
}

const workshopShopOffers: readonly WorkshopShopOfferDefinition[] = [
  {
    code: 'healing_pill',
    title: 'Пилюля восстановления',
    buttonLabel: 'Купить пилюлю',
    description: 'Базовый расходник для восстановления между встречами или в бою.',
    priceDust: 12,
    inventoryDelta: { healingPills: 1 },
  },
  {
    code: 'leather_bundle',
    title: 'Связка кожи',
    buttonLabel: 'Купить кожу',
    description: 'Малый запас раннего материала для пилюль и лёгкой мастерской работы.',
    priceDust: 10,
    inventoryDelta: { leather: 2 },
  },
];

const offerByCode = new Map<WorkshopShopOfferCode, WorkshopShopOfferDefinition>(
  workshopShopOffers.map((offer) => [offer.code, offer]),
);

export const listWorkshopShopOffers = (): readonly WorkshopShopOfferDefinition[] => workshopShopOffers;

export const getWorkshopShopOffer = (code: WorkshopShopOfferCode): WorkshopShopOfferDefinition => {
  const offer = offerByCode.get(code);
  if (!offer) {
    throw new Error(`Unknown workshop shop offer: ${code}`);
  }

  return offer;
};

export const isWorkshopShopOfferCode = (candidate: string): candidate is WorkshopShopOfferCode => (
  offerByCode.has(candidate as WorkshopShopOfferCode)
);

export const resolveWorkshopShopOfferMissingDust = (
  player: WorkshopShopDustBalance,
  offer: WorkshopShopOfferDefinition,
): number => Math.max(0, offer.priceDust - player.gold);

export const canBuyWorkshopShopOffer = (
  player: WorkshopShopDustBalance,
  offer: WorkshopShopOfferDefinition,
): boolean => resolveWorkshopShopOfferMissingDust(player, offer) === 0;
